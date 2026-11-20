import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@letterly/database';
import {
  databaseNow,
  lockUsers,
} from '../../../infrastructure/database/page-barrier';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import type {
  MediaCleanupRepository,
  MediaCleanupTask,
} from '../application/media-cleanup.repository';
import { MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS } from './media-cleanup-persistence';

const CLEANUP_MAX_ATTEMPTS = 5;
const CLEANUP_BACKOFF_MS = 60_000;
const CLEANUP_LEASE_MS = 5 * 60_000;

function eligibleTasks(now: Date): Prisma.MediaCleanupWhereInput {
  return {
    deletionLinks: {
      every: {
        job: {
          uploadManifestSha256: { not: null },
          uploadsSettledAt: { not: null },
          state: 'MEDIA_CLEANUP',
          OR: [{ uploadsSafeAfter: null }, { uploadsSafeAfter: { lte: now } }],
        },
      },
    },
    status: 'PENDING',
    OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    AND: [{ OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }] }],
  };
}

@Injectable()
export class PrismaMediaCleanupRepository implements MediaCleanupRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async claimCleanupTasks(input: {
    now: Date;
    workerId: string;
    leaseExpiresAt: Date;
    limit: number;
  }): Promise<MediaCleanupTask[]> {
    const candidates = await this.prisma.mediaCleanup.findMany({
      where: eligibleTasks(await databaseNow(this.prisma)),
      orderBy: { createdAt: 'asc' },
      take: input.limit,
      select: {
        id: true,
        objectKey: true,
        status: true,
        attempts: true,
        nextRetryAt: true,
        lastFailureCode: true,
        leaseOwner: true,
        leaseExpiresAt: true,
      },
    });
    const claimed: MediaCleanupTask[] = [];

    for (const candidate of candidates) {
      const claim = await this.prisma.$transaction(async (tx) => {
        const scope = await this.lockTaskAndJobs(tx, candidate.id);
        if (!scope.stable) return null;
        const now = await databaseNow(tx);
        const leaseOwner = randomUUID();
        const leaseExpiresAt = new Date(now.getTime() + CLEANUP_LEASE_MS);
        const updated = await tx.mediaCleanup.updateMany({
          where: { ...eligibleTasks(now), id: candidate.id },
          data: { leaseOwner, leaseExpiresAt },
        });
        return updated.count > 0
          ? { ...candidate, leaseOwner, leaseExpiresAt }
          : null;
      });
      if (claim) claimed.push(claim);
    }

    return claimed;
  }

  private async lockTaskAndJobs(tx: Prisma.TransactionClient, taskId: string) {
    const getLinks = () =>
      tx.deletionJobMedia.findMany({
        where: { cleanupTaskId: taskId },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          jobId: true,
          job: {
            select: {
              parentJobId: true,
              targetId: true,
              targetType: true,
              parentJob: { select: { targetId: true } },
            },
          },
        },
      });
    const discovered = await getLinks();
    const pageIds = [
      ...new Set(
        discovered.flatMap(({ job }) =>
          job?.targetType === 'PAGE' ? [job.targetId] : [],
        ),
      ),
    ].sort();
    const pages = pageIds.length
      ? await tx.page.findMany({
          where: { id: { in: pageIds } },
          select: { id: true, creatorId: true },
        })
      : [];
    await lockUsers(tx, [
      ...pages.map(({ creatorId }) => creatorId),
      ...discovered.flatMap(({ job }) =>
        job?.parentJob?.targetId ? [job.parentJob.targetId] : [],
      ),
    ]);
    for (const id of pages.map((page) => page.id).sort())
      await tx.$queryRaw`SELECT "id" FROM "Page" WHERE "id"=${id}::uuid FOR UPDATE`;
    const parents = [
      ...new Set(
        discovered.flatMap((link) =>
          link.job?.parentJobId ? [link.job.parentJobId] : [],
        ),
      ),
    ].sort();
    const jobIds = [...new Set(discovered.map((link) => link.jobId))].sort();
    for (const id of [
      ...parents,
      ...jobIds.filter((id) => !parents.includes(id)),
    ])
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "MediaCleanup" WHERE "id"=${taskId}::uuid FOR UPDATE`;
    const actual = await getLinks();
    const stable =
      discovered.length === actual.length &&
      discovered.every(
        (link, index) =>
          link.id === actual[index]?.id &&
          link.jobId === actual[index]?.jobId &&
          link.job?.parentJobId === actual[index]?.job?.parentJobId,
      );
    return { stable, jobIds, parents };
  }

  async markCleanupSucceeded(input: {
    taskId: string;
    workerId: string;
  }): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const { stable, jobIds, parents } = await this.lockTaskAndJobs(
          transaction,
          input.taskId,
        );
        if (!stable) return;
        const now = await databaseNow(transaction);
        const task = await transaction.mediaCleanup.findFirst({
          where: {
            id: input.taskId,
            status: 'PENDING',
            leaseOwner: input.workerId,
            leaseExpiresAt: { gt: now },
          },
          select: { id: true },
        });
        if (!task) return;
        const links = await transaction.deletionJobMedia.findMany({
          where: { cleanupTaskId: input.taskId },
          select: {
            id: true,
            jobId: true,
            completedAt: true,
            job: {
              select: {
                uploadManifestSha256: true,
                uploadsSettledAt: true,
                uploadsSafeAfter: true,
                state: true,
              },
            },
          },
        });
        if (
          links.some(
            (link) =>
              !jobIds.includes(link.jobId) ||
              !link.job.uploadManifestSha256 ||
              !link.job.uploadsSettledAt ||
              (link.job.uploadsSafeAfter && link.job.uploadsSafeAfter > now) ||
              link.job.state !== 'MEDIA_CLEANUP',
          )
        ) {
          await transaction.mediaCleanup.update({
            where: { id: task.id },
            data: {
              leaseOwner: null,
              leaseExpiresAt: null,
              nextRetryAt: new Date(now.getTime() + 30_000),
            },
          });
          return;
        }
        const pending = links.filter((link) => !link.completedAt);
        for (const jobId of jobIds) {
          const ids = pending
            .filter((link) => link.jobId === jobId)
            .map((link) => link.id);
          if (!ids.length) continue;
          const completed = await transaction.deletionJobMedia.updateMany({
            where: { id: { in: ids }, completedAt: null },
            data: { completedAt: now },
          });
          await transaction.deletionJob.update({
            where: { id: jobId },
            data: {
              mediaCompleted: { increment: completed.count },
              version: { increment: 1 },
              nextRetryAt: null,
            },
          });
        }
        for (const id of parents)
          await transaction.deletionJob.update({
            where: { id },
            data: { nextRetryAt: null, version: { increment: 1 } },
          });
        await transaction.mediaCleanup.delete({ where: { id: task.id } });
      },
      {
        maxWait: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
        timeout: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async markCleanupFailed(input: {
    taskId: string;
    workerId: string;
    now: Date;
    failureCode: string;
  }): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT "id" FROM "MediaCleanup" WHERE "id"=${input.taskId}::uuid FOR UPDATE`;
        const now = await databaseNow(transaction);
        const where = {
          id: input.taskId,
          status: 'PENDING' as const,
          leaseOwner: input.workerId,
          leaseExpiresAt: { gt: now },
        };
        const task = await transaction.mediaCleanup.findFirst({
          where,
          select: { attempts: true },
        });

        if (!task) return;

        const attempts = task.attempts + 1;
        const review = attempts >= CLEANUP_MAX_ATTEMPTS;

        await transaction.mediaCleanup.updateMany({
          where,
          data: {
            status: review ? 'REVIEW' : 'PENDING',
            attempts,
            nextRetryAt: review
              ? null
              : new Date(
                  now.getTime() + CLEANUP_BACKOFF_MS * 2 ** (attempts - 1),
                ),
            lastFailureCode: input.failureCode,
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        });
      },
      {
        maxWait: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
        timeout: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
      },
    );
  }
}
