import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@letterly/database';
import {
  deletionJobSummarySchema,
  type DeletionAcceptRequest,
  type DeletionImpactCounts,
  type DeletionJobSummary,
  type DeletionListQuery,
  type DeletionRetryRequest,
} from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import {
  lockPageBarrier,
  lockUsers,
} from '../../../infrastructure/database/page-barrier';
import {
  AdminDeletionError,
  type AdminDeletionsRepository,
} from '../application/admin-deletions.repository';
import type { AdminCursorPosition } from '../application/admin-cursor';
import { ADMIN_CURSOR_SIGNING_SECRET } from './admin-cursor.service';
import { DeletionToken } from './deletion-token';
import { canonicalHash } from './deletion-canonical';

export const deletionSummarySelect = {
  id: true,
  targetType: true,
  targetId: true,
  parentJobId: true,
  state: true,
  requestedAt: true,
  completedAt: true,
  version: true,
  pagesTotal: true,
  pagesCompleted: true,
  mediaTotal: true,
  mediaCompleted: true,
} as const satisfies Prisma.DeletionJobSelect;
type SummaryRow = Prisma.DeletionJobGetPayload<{
  select: typeof deletionSummarySelect;
}>;
export function deletionSummary(row: SummaryRow): DeletionJobSummary {
  return {
    id: row.id,
    targetType: row.targetType,
    targetId: row.targetId,
    parentJobId: row.parentJobId,
    state: row.state,
    requestedAt: row.requestedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    version: row.version,
    pagesTotal: row.pagesTotal,
    pagesCompleted: row.pagesCompleted,
    mediaTotal: row.mediaTotal,
    mediaCompleted: row.mediaCompleted,
  };
}
export async function deletionDatabaseNow(tx: Prisma.TransactionClient) {
  return (
    await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
  )[0]!.now;
}
const txOptions = { maxWait: 10_000, timeout: 10_000 };

export function pageActionScope(
  pageId: string,
): Prisma.ModerationActionWhereInput {
  const direct = {
    OR: [
      { pageId },
      { report: { pageId } },
      { targetType: 'PAGE' as const, targetId: pageId },
    ],
  };
  return { OR: [...direct.OR, { appeal: { originalAction: direct } }] };
}
export async function deletionImpact(
  tx: Prisma.TransactionClient,
  pageId: string,
  now: Date,
): Promise<DeletionImpactCounts> {
  const [
    submissions,
    images,
    audioTracks,
    pendingUploads,
    reports,
    moderationActions,
    appeals,
  ] = await Promise.all([
    tx.visitorSubmission.count({ where: { pageId } }),
    tx.pageImage.count({ where: { pageId } }),
    tx.pageAudio.count({ where: { pageId } }),
    tx.pageUploadGrant.count({ where: { pageId, expiresAt: { gt: now } } }),
    tx.pageReport.count({ where: { pageId } }),
    tx.moderationAction.count({ where: pageActionScope(pageId) }),
    tx.appeal.count({
      where: {
        originalAction: {
          OR: [
            { pageId },
            { report: { pageId } },
            { targetType: 'PAGE', targetId: pageId },
          ],
        },
      },
    }),
  ]);
  return {
    pages: 1,
    submissions,
    images,
    audioTracks,
    pendingUploads,
    reports,
    moderationActions,
    appeals,
  };
}
export async function deletionAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorId?: string;
    eventType:
      | 'DELETION_REQUESTED'
      | 'DELETION_COMPLETED'
      | 'DELETION_RETRY_REQUESTED'
      | 'DELETION_ATTENTION_REQUIRED';
    targetId: string;
    jobId: string;
    requestId?: string;
    failureCode?: string;
  },
) {
  await tx.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      targetType: 'PAGE',
      targetId: input.targetId,
      requestId: input.requestId ?? null,
      outcome:
        input.eventType === 'DELETION_ATTENTION_REQUIRED'
          ? 'FAILURE'
          : 'SUCCESS',
      metadata: {
        jobId: input.jobId,
        ...(input.failureCode ? { failureCode: input.failureCode } : {}),
      },
    },
  });
}
async function activeActor(tx: Prisma.TransactionClient, actorId: string) {
  const actor = (await lockUsers(tx, [actorId])).get(actorId);
  if (
    !actor ||
    actor.role !== 'ADMIN' ||
    actor.moderationStatus !== 'ACTIVE' ||
    actor.deletionRequestedAt
  )
    throw new AdminDeletionError('FORBIDDEN');
}
@Injectable()
export class PrismaAdminDeletionsRepository implements AdminDeletionsRepository {
  private readonly tokens: DeletionToken;
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ADMIN_CURSOR_SIGNING_SECRET) secret: string,
  ) {
    this.tokens = new DeletionToken(secret);
  }
  async preview(actorId: string, pageId: string, version: number) {
    return this.prisma.$transaction(async (tx) => {
      const page = await lockPageBarrier(tx, pageId, {
        actorIds: [actorId],
        allowDeletion: true,
      });
      await activeActor(tx, actorId);
      this.checkPage(page, version);
      const now = await deletionDatabaseNow(tx);
      const counts = await deletionImpact(tx, pageId, now);
      return {
        targetType: 'PAGE' as const,
        targetId: pageId,
        expectedModerationVersion: version,
        counts,
        ...this.tokens.issue({
          actorId,
          targetId: pageId,
          expectedModerationVersion: version,
          counts,
          now,
        }),
      };
    }, txOptions);
  }
  async accept(
    actorId: string,
    pageId: string,
    request: DeletionAcceptRequest,
    requestId: string,
  ) {
    const operation = 'PAGE_DELETE';
    const hash = canonicalHash({
      targetId: pageId,
      reasonCode: request.reasonCode,
      note: request.note ?? null,
      expectedModerationVersion: request.expectedModerationVersion,
      typedTargetId: request.typedTargetId,
      confirm: request.confirm,
      confirmationTokenDigest: canonicalHash(request.confirmationToken),
    });
    return this.prisma.$transaction(async (tx) => {
      // Replay precedes target lookup and token expiry, while current authorization still applies.
      const existing = await tx.deletionAcceptanceReceipt.findUnique({
        where: {
          actorId_operation_idempotencyKey: {
            actorId,
            operation,
            idempotencyKey: request.idempotencyKey,
          },
        },
        select: {
          canonicalPayloadHash: true,
          job: { select: deletionSummarySelect },
        },
      });
      if (existing) {
        await activeActor(tx, actorId);
        if (existing.canonicalPayloadHash !== hash)
          throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
        return deletionSummary(existing.job);
      }
      const page = await lockPageBarrier(tx, pageId, {
        actorIds: [actorId],
        allowDeletion: true,
      });
      await activeActor(tx, actorId);
      const replay = await tx.deletionAcceptanceReceipt.findUnique({
        where: {
          actorId_operation_idempotencyKey: {
            actorId,
            operation,
            idempotencyKey: request.idempotencyKey,
          },
        },
        select: {
          canonicalPayloadHash: true,
          job: { select: deletionSummarySelect },
        },
      });
      if (replay) {
        if (replay.canonicalPayloadHash !== hash)
          throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
        return deletionSummary(replay.job);
      }
      this.checkPage(page, request.expectedModerationVersion);
      if (request.typedTargetId !== pageId)
        throw new AdminDeletionError('STALE_DELETION_IMPACT');
      const now = await deletionDatabaseNow(tx);
      const counts = await deletionImpact(tx, pageId, now);
      this.tokens.verify(request.confirmationToken, {
        actorId,
        targetId: pageId,
        expectedModerationVersion: request.expectedModerationVersion,
        counts,
        now,
      });
      await tx.page.update({
        where: { id: pageId },
        data: {
          deletionRequestedAt: now,
          moderationStatus: 'DISABLED',
          disabledAt: now,
          disabledReason: request.reasonCode,
          moderationVersion: { increment: 1 },
        },
      });
      const job = await tx.deletionJob.create({
        data: {
          targetType: 'PAGE',
          targetId: pageId,
          requestedById: actorId,
          reasonCode: request.reasonCode,
          note: request.note ?? null,
          requestedAt: now,
          pagesTotal: 1,
        },
        select: deletionSummarySelect,
      });
      await tx.deletionAcceptanceReceipt.create({
        data: {
          actorId,
          operation,
          idempotencyKey: request.idempotencyKey,
          canonicalPayloadHash: hash,
          jobId: job.id,
          acceptedAt: now,
        },
      });
      const result = deletionSummary(job);
      await tx.adminIdempotencyRecord.create({
        data: {
          actorId,
          operation,
          targetType: 'PAGE',
          targetId: pageId,
          key: request.idempotencyKey,
          payloadHash: hash,
          resultSnapshot: result,
          outcome: 'SUCCESS',
          createdAt: now,
          expiresAt: new Date(now.getTime() + 86_400_000),
        },
      });
      await deletionAudit(tx, {
        actorId,
        eventType: 'DELETION_REQUESTED',
        targetId: pageId,
        jobId: job.id,
        requestId,
      });
      return result;
    }, txOptions);
  }
  async retry(
    actorId: string,
    jobId: string,
    request: DeletionRetryRequest,
    requestId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const discovered = await tx.deletionJob.findUnique({
        where: { id: jobId },
        select: { targetId: true, targetType: true },
      });
      if (!discovered || discovered.targetType !== 'PAGE')
        throw new AdminDeletionError('NOT_FOUND');
      await lockPageBarrier(tx, discovered.targetId, {
        actorIds: [actorId],
        allowDeletion: true,
      });
      await activeActor(tx, actorId);
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${jobId}::uuid FOR UPDATE`;
      const job = await tx.deletionJob.findUniqueOrThrow({
        where: { id: jobId },
      });
      const now = await deletionDatabaseNow(tx);
      const operation = 'PAGE_DELETE_RETRY';
      const hash = canonicalHash({ jobId, ...request });
      const prior = await tx.adminIdempotencyRecord.findUnique({
        where: {
          actorId_operation_targetType_targetId_key: {
            actorId,
            operation,
            targetType: 'PAGE',
            targetId: jobId,
            key: request.idempotencyKey,
          },
        },
      });
      if (prior && prior.expiresAt > now) {
        if (prior.payloadHash !== hash)
          throw new AdminDeletionError('IDEMPOTENCY_CONFLICT');
        return deletionJobSummarySchema.parse(prior.resultSnapshot);
      }
      if (
        job.version !== request.expectedJobVersion ||
        !['NEEDS_ATTENTION', 'RETRY_WAIT'].includes(job.state) ||
        (job.leaseExpiresAt && job.leaseExpiresAt > now)
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const [images, audio] = await Promise.all([
        tx.pageImage.count({
          where: {
            pageId: job.targetId,
            processingState: { in: ['RUNNING', 'UNCERTAIN'] },
          },
        }),
        tx.pageAudio.count({
          where: {
            pageId: job.targetId,
            processingState: { in: ['RUNNING', 'UNCERTAIN'] },
          },
        }),
      ]);
      if (
        images ||
        audio ||
        (job.lastFailureCode === 'UPLOAD_SETTLEMENT_UNKNOWN' &&
          !job.uploadsSettledAt)
      )
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const tasks = await tx.mediaCleanup.findMany({
        where: {
          status: 'REVIEW',
          deletionLinks: { some: { jobId } },
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
        },
        select: { id: true },
        take: 100,
      });
      await tx.mediaCleanup.updateMany({
        where: {
          id: { in: tasks.map((t) => t.id) },
          status: 'REVIEW',
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
        },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextRetryAt: now,
          lastFailureCode: null,
        },
      });
      const updated = await tx.deletionJob.update({
        where: { id: jobId },
        data: {
          state: job.resumeState ?? 'DATABASE_CLEANUP',
          attempts: 0,
          version: { increment: 1 },
          nextRetryAt: null,
          lastFailureCode: null,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
        select: deletionSummarySelect,
      });
      const result = deletionSummary(updated);
      await tx.adminIdempotencyRecord.upsert({
        where: {
          actorId_operation_targetType_targetId_key: {
            actorId,
            operation,
            targetType: 'PAGE',
            targetId: jobId,
            key: request.idempotencyKey,
          },
        },
        create: {
          actorId,
          operation,
          targetType: 'PAGE',
          targetId: jobId,
          key: request.idempotencyKey,
          payloadHash: hash,
          resultSnapshot: result,
          outcome: 'SUCCESS',
          expiresAt: new Date(now.getTime() + 86_400_000),
        },
        update: {
          payloadHash: hash,
          resultSnapshot: result,
          expiresAt: new Date(now.getTime() + 86_400_000),
        },
      });
      await deletionAudit(tx, {
        actorId,
        eventType: 'DELETION_RETRY_REQUESTED',
        targetId: job.targetId,
        jobId,
        requestId,
      });
      return result;
    }, txOptions);
  }
  async get(jobId: string) {
    const row = await this.prisma.deletionJob.findUnique({
      where: { id: jobId },
      select: {
        ...deletionSummarySelect,
        requestedById: true,
        reasonCode: true,
        note: true,
        startedAt: true,
        attempts: true,
        nextRetryAt: true,
        lastFailureCode: true,
        databaseBatchesCompleted: true,
        _count: { select: { children: true } },
      },
    });
    if (!row) return null;
    const [childrenCompleted, childrenNeedingAttention] = await Promise.all([
      this.prisma.deletionJob.count({
        where: { parentJobId: jobId, state: 'COMPLETED' },
      }),
      this.prisma.deletionJob.count({
        where: { parentJobId: jobId, state: 'NEEDS_ATTENTION' },
      }),
    ]);
    return {
      ...deletionSummary(row),
      requestedById: row.requestedById,
      reasonCode: row.reasonCode,
      note: row.note,
      startedAt: row.startedAt?.toISOString() ?? null,
      attempts: row.attempts,
      nextRetryAt: row.nextRetryAt?.toISOString() ?? null,
      lastFailureCode:
        row.lastFailureCode as import('@letterly/contracts').DeletionJobDetail['lastFailureCode'],
      databaseBatchesCompleted: row.databaseBatchesCompleted,
      childrenTotal: row._count.children,
      childrenCompleted,
      childrenNeedingAttention,
    };
  }
  async list(
    query: DeletionListQuery,
    position: AdminCursorPosition | null,
    parentId?: string,
  ) {
    const rows = await this.prisma.deletionJob.findMany({
      where: {
        ...(query.state ? { state: query.state } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
        ...(parentId ? { parentJobId: parentId } : {}),
        ...(position
          ? {
              OR: [
                { requestedAt: { lt: position.createdAt } },
                { requestedAt: position.createdAt, id: { lt: position.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
      take: query.size + 1,
      select: deletionSummarySelect,
    });
    const items = rows.slice(0, query.size);
    const last = items.at(-1);
    return {
      items: items.map(deletionSummary),
      nextPosition:
        rows.length > query.size && last
          ? { createdAt: last.requestedAt, id: last.id }
          : null,
    };
  }
  private checkPage(
    page: Awaited<ReturnType<typeof lockPageBarrier>>,
    version: number,
  ): asserts page is NonNullable<typeof page> {
    if (!page) throw new AdminDeletionError('NOT_FOUND');
    if (page.creator.role !== 'CREATOR')
      throw new AdminDeletionError('PROTECTED_TARGET');
    if (page.deletionRequestedAt || page.creator.deletionRequestedAt)
      throw new AdminDeletionError('DELETION_IN_PROGRESS');
    if (page.moderationVersion !== version)
      throw new AdminDeletionError('STALE_MODERATION_VERSION');
  }
}
