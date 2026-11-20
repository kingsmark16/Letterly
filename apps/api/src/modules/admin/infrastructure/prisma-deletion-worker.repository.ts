import { Inject, Injectable, Optional } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@letterly/database';
import { createHash, randomUUID } from 'node:crypto';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import { lockUsers } from '../../../infrastructure/database/page-barrier';
import type {
  DeletionClaim,
  DeletionWorkerRepository,
} from '../application/deletion-worker';
import { canonicalJson } from './deletion-canonical';
import {
  deletionAudit,
  deletionDatabaseNow,
  creatorPageIds,
} from './prisma-admin-deletions.repository';
import { lockDeletionJob, lockDeletionPageScope } from './deletion-job-locks';
import {
  SAFE_MONITORING,
  type SafeMonitoringPort,
} from '../../../infrastructure/monitoring/safe-monitoring';

const options = { maxWait: 10_000, timeout: 10_000 };
type Job = Prisma.DeletionJobGetPayload<Record<string, never>>;
type Tx = Prisma.TransactionClient;
type Failure =
  | 'PROCESSOR_QUIESCENCE_UNKNOWN'
  | 'UPLOAD_SETTLEMENT_UNKNOWN'
  | 'CLEANUP_RECEIPT_MISSING'
  | 'DELETE_FAILED'
  | 'CHILD_JOB_FAILED'
  | 'CONSTRAINT_CONFLICT';
async function boundedDelete(
  tx: Tx,
  table: string,
  scope: Prisma.Sql,
  limit = 100,
) {
  const identifier = Prisma.raw(`"${table}"`);
  const rows = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`DELETE FROM ${identifier} WHERE "id" IN (SELECT "id" FROM ${identifier} WHERE ${scope} ORDER BY "id" LIMIT ${limit}) RETURNING "id"`,
  );
  return rows.length;
}
@Injectable()
export class PrismaDeletionWorkerRepository implements DeletionWorkerRepository {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Optional()
    @Inject(SAFE_MONITORING)
    private readonly monitoring?: SafeMonitoringPort,
  ) {}
  async claim(limit: number) {
    const leaseOwner = randomUUID();
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH candidates AS (
        SELECT "id" FROM "DeletionJob"
        WHERE ("state" IN ('QUEUED','DATABASE_CLEANUP','MEDIA_CLEANUP','RETRY_WAIT','WAITING_FOR_CHILDREN')
          OR ("targetType"='CREATOR' AND "state"='NEEDS_ATTENTION'
            AND ("lastFailureCode"='CHILD_JOB_FAILED' OR "retryChildrenRequested")))
          AND ("nextRetryAt" IS NULL OR "nextRetryAt"<=clock_timestamp())
          AND ("leaseExpiresAt" IS NULL OR "leaseExpiresAt"<=clock_timestamp())
        ORDER BY "requestedAt","id" FOR UPDATE SKIP LOCKED LIMIT ${limit}
      )
      UPDATE "DeletionJob" AS job SET "leaseOwner"=${leaseOwner}::uuid,
        "leaseExpiresAt"=clock_timestamp()+interval '5 minutes',
        "startedAt"=COALESCE(job."startedAt",clock_timestamp()),
        "state"=CASE WHEN job."state"='QUEUED' THEN 'DATABASE_CLEANUP'::"DeletionJobState" WHEN job."state"='RETRY_WAIT' THEN job."resumeState" ELSE job."state" END,
        "version"=job."version"+1
      FROM candidates WHERE job."id"=candidates."id" RETURNING job."id"`;
    return rows.map((row) => ({ ...row, leaseOwner }));
  }
  async step(claim: DeletionClaim) {
    const current = await this.prisma.deletionJob.findUnique({
      where: { id: claim.id },
    });
    if (!current || current.leaseOwner !== claim.leaseOwner) return;
    if (current.targetType === 'CREATOR')
      await this.stepCreator(claim, current);
    else await this.stepPage(claim, current);
    await this.recordTransition(current);
  }
  private async recordTransition(before: Job) {
    if (!this.monitoring) return;
    try {
      const job = await this.prisma.deletionJob.findUnique({
        where: { id: before.id },
        select: { state: true },
      });
      if (
        job?.state === 'NEEDS_ATTENTION' &&
        before.state !== 'NEEDS_ATTENTION'
      )
        this.monitoring.captureException(
          new Error('Deletion job requires attention'),
          {
            operation: 'deletion_worker',
            errorCode: 'DELETION_NEEDS_ATTENTION',
          },
        );
      if (job?.state === 'COMPLETED' && before.state !== 'COMPLETED')
        this.monitoring.recordMetric('deletion_completions', 1, {
          outcome: before.targetType,
        });
    } catch {
      // A monitoring failure must not retry an already committed job transition.
    }
  }
  private async stepPage(claim: DeletionClaim, current: Job) {
    if (!current.uploadManifestSha256)
      await this.prepareGrantSnapshot(claim, current);
    await this.prisma.$transaction(async (tx) => {
      const { job, page, parent, valid } = await lockDeletionPageScope(
        tx,
        current,
      );
      const now = await deletionDatabaseNow(tx);
      if (
        !job ||
        job.leaseOwner !== claim.leaseOwner ||
        !job.leaseExpiresAt ||
        job.leaseExpiresAt <= now
      )
        return;
      if (!valid || !job.uploadManifestSha256) {
        await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
        return;
      }
      if (parent && !job.parentJobId) await this.attachChild(tx, parent, job);
      const processes = await tx.$queryRaw<
        {
          id: string;
          kind: string;
          processingState: string;
          processingLeaseExpiresAt: Date | null;
        }[]
      >`
        SELECT "id",'IMAGE' AS kind,"processingState","processingLeaseExpiresAt" FROM "PageImage" WHERE "pageId"=${job.targetId}::uuid AND "processingState" IN ('RUNNING','UNCERTAIN')
        UNION ALL SELECT "id",'AUDIO' AS kind,"processingState","processingLeaseExpiresAt" FROM "PageAudio" WHERE "pageId"=${job.targetId}::uuid AND "processingState" IN ('RUNNING','UNCERTAIN') LIMIT 100`;
      if (processes.length) {
        let uncertain = false;
        for (const process of processes) {
          if (
            process.processingState === 'UNCERTAIN' ||
            !process.processingLeaseExpiresAt ||
            process.processingLeaseExpiresAt <= now
          ) {
            uncertain = true;
            if (process.kind === 'IMAGE')
              await tx.pageImage.updateMany({
                where: { id: process.id, processingState: 'RUNNING' },
                data: { processingState: 'UNCERTAIN' },
              });
            else
              await tx.pageAudio.updateMany({
                where: { id: process.id, processingState: 'RUNNING' },
                data: { processingState: 'UNCERTAIN' },
              });
          }
        }
        if (uncertain)
          await this.attention(tx, job, 'PROCESSOR_QUIESCENCE_UNKNOWN');
        else await this.release(tx, claim);
        return;
      }
      if (job.state === 'DATABASE_CLEANUP') {
        if (await this.queueMediaBatch(tx, job)) {
          await this.progress(tx, claim);
          return;
        }
        if (await this.deleteRelatedBatch(tx, job.targetId)) {
          await this.progress(tx, claim);
          return;
        }
        await tx.deletionJob.update({
          where: { id: job.id },
          data: {
            state: 'MEDIA_CLEANUP',
            resumeState: 'MEDIA_CLEANUP',
            attempts: 0,
            leaseOwner: null,
            leaseExpiresAt: null,
            version: { increment: 1 },
          },
        });
        return;
      }
      if (!job.uploadManifestSha256) throw new Error('Snapshot unavailable');
      if (!job.uploadsSettledAt) {
        if (!job.uploadsSafeAfter || job.uploadsSafeAfter <= now)
          await this.attention(tx, job, 'UPLOAD_SETTLEMENT_UNKNOWN');
        else await this.release(tx, claim);
        return;
      }
      const missing = await tx.deletionJobMedia.count({
        where: { jobId: job.id, completedAt: null, cleanupTaskId: null },
      });
      if (missing) {
        await this.attention(tx, job, 'CLEANUP_RECEIPT_MISSING');
        return;
      }
      const review = await tx.deletionJobMedia.count({
        where: {
          jobId: job.id,
          completedAt: null,
          cleanupTask: { status: 'REVIEW' },
        },
      });
      if (review) {
        await this.attention(tx, job, 'DELETE_FAILED');
        return;
      }
      const pending = await tx.deletionJobMedia.count({
        where: { jobId: job.id, completedAt: null },
      });
      if (pending || job.mediaCompleted !== job.mediaTotal) {
        await this.release(tx, claim);
        return;
      }
      const grants = await tx.pageUploadGrant.findMany({
        where: { pageId: job.targetId },
        select: { id: true },
        take: 100,
      });
      if (grants.length) {
        await tx.pageUploadGrant.deleteMany({
          where: { id: { in: grants.map((g) => g.id) } },
        });
        await this.progress(tx, claim);
        return;
      }
      // All variable size children were removed in bounded earlier transactions.
      if (page)
        await tx.pageSlugReservation.updateMany({
          where: { pageId: job.targetId },
          data: { pageId: null, isCurrent: false },
        });
      if (page) await tx.page.delete({ where: { id: job.targetId } });
      await tx.deletionJob.update({
        where: { id: job.id },
        data: {
          state: 'COMPLETED',
          completedAt: now,
          pagesCompleted: 1,
          version: { increment: 1 },
          leaseOwner: null,
          leaseExpiresAt: null,
          lastFailureCode: null,
          nextRetryAt: null,
        },
      });
      await deletionAudit(tx, {
        eventType: 'DELETION_COMPLETED',
        targetId: job.targetId,
        jobId: job.id,
      });
      await this.wakeParent(tx, parent?.id);
    }, options);
  }
  private async prepareGrantSnapshot(claim: DeletionClaim, source: Job) {
    const pageId = source.targetId;
    const hash = createHash('sha256').update('[');
    let cursor: string | undefined;
    let total = 0;
    let latest: Date | null = null;
    for (;;) {
      const rows = await this.prisma.pageUploadGrant.findMany({
        where: { pageId, ...(cursor ? { id: { gt: cursor } } : {}) },
        orderBy: { id: 'asc' },
        take: 100,
        select: {
          id: true,
          mediaType: true,
          mediaId: true,
          objectKey: true,
          issuedAt: true,
          expiresAt: true,
        },
      });
      for (const row of rows) {
        if (total) hash.update(',');
        hash.update(
          canonicalJson({
            ...row,
            issuedAt: row.issuedAt.toISOString(),
            expiresAt: row.expiresAt.toISOString(),
          }),
        );
        total++;
        if (!latest || row.expiresAt > latest) latest = row.expiresAt;
      }
      if (rows.length < 100) break;
      cursor = rows.at(-1)!.id;
    }
    const digest = hash.update(']').digest('hex');
    await this.prisma.$transaction(async (tx) => {
      const { job, parent, valid } = await lockDeletionPageScope(tx, source);
      const now = await deletionDatabaseNow(tx);
      if (
        !job ||
        !valid ||
        job.leaseOwner !== claim.leaseOwner ||
        !job.leaseExpiresAt ||
        job.leaseExpiresAt <= now
      )
        return;
      if (parent && !job.parentJobId) await this.attachChild(tx, parent, job);
      await tx.deletionJob.updateMany({
        where: {
          id: claim.id,
          leaseOwner: claim.leaseOwner,
          leaseExpiresAt: { gt: now },
          uploadManifestSha256: null,
        },
        data: {
          uploadGrantsTotal: total,
          uploadManifestSha256: digest,
          uploadsSafeAfter: latest,
          uploadsSettledAt: total ? null : now,
        },
      });
    }, options);
  }
  private async wakeParent(tx: Tx, parentJobId?: string | null) {
    if (parentJobId)
      await tx.deletionJob.updateMany({
        where: { id: parentJobId, state: { not: 'COMPLETED' } },
        data: { nextRetryAt: null, version: { increment: 1 } },
      });
  }

  private async attachChild(tx: Tx, parent: Job, child: Job) {
    await tx.deletionJob.update({
      where: { id: child.id },
      data: { parentJobId: parent.id, version: { increment: 1 } },
    });
    await deletionAudit(tx, {
      eventType: 'DELETION_CHILD_ATTACHED',
      targetId: child.targetId,
      jobId: child.id,
      parentJobId: parent.id,
    });
  }

  private async stepCreator(claim: DeletionClaim, source: Job) {
    await this.prisma.$transaction(async (tx) => {
      const creator = (await lockUsers(tx, [source.targetId])).get(
        source.targetId,
      );
      const discovering =
        source.state === 'DATABASE_CLEANUP' &&
        !source.creatorDiscoveryCompleted;
      const ids = discovering
        ? await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM (${creatorPageIds(source.targetId)}) AS candidates
        WHERE (${source.discoverPagesAfterId}::uuid IS NULL OR "id">${source.discoverPagesAfterId}::uuid)
        ORDER BY "id" LIMIT 50`
        : [];
      if (ids.length)
        await tx.$queryRaw`
        SELECT "id" FROM "Page" WHERE "id" IN (${Prisma.join(ids.map(({ id }) => Prisma.sql`${id}::uuid`))})
        ORDER BY "id" FOR UPDATE`;
      const job = await lockDeletionJob(tx, source.id);
      const now = await deletionDatabaseNow(tx);
      if (
        !job ||
        job.leaseOwner !== claim.leaseOwner ||
        !job.leaseExpiresAt ||
        job.leaseExpiresAt <= now
      )
        return;
      if (!creator?.deletionRequestedAt || creator.role !== 'CREATOR') {
        await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
        return;
      }
      if (discovering && ids.length) {
        if (
          !(await this.discoverChildren(
            tx,
            job,
            ids.map(({ id }) => id),
          ))
        ) {
          await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
          return;
        }
        await tx.deletionJob.update({
          where: { id: job.id },
          data: { discoverPagesAfterId: ids.at(-1)!.id },
        });
        await this.progress(tx, claim);
        return;
      }
      if (
        job.retryChildrenRequested &&
        (await this.retryChildBatch(tx, job, now))
      ) {
        await this.release(tx, claim);
        return;
      }
      const aggregate = await tx.deletionJob.aggregate({
        where: { parentJobId: job.id },
        _count: { _all: true },
        _sum: { pagesCompleted: true, mediaTotal: true, mediaCompleted: true },
      });
      const failed = await tx.deletionJob.count({
        where: { parentJobId: job.id, state: 'NEEDS_ATTENTION' },
      });
      const unfinished = await tx.deletionJob.count({
        where: { parentJobId: job.id, state: { not: 'COMPLETED' } },
      });
      if (aggregate._count._all !== job.pagesTotal) {
        await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
        return;
      }
      await tx.deletionJob.update({
        where: { id: job.id },
        data: {
          creatorDiscoveryCompleted: true,
          pagesCompleted: aggregate._sum.pagesCompleted ?? 0,
          mediaTotal: aggregate._sum.mediaTotal ?? 0,
          mediaCompleted: aggregate._sum.mediaCompleted ?? 0,
        },
      });
      if (failed) {
        if (
          job.state === 'NEEDS_ATTENTION' &&
          job.lastFailureCode === 'CHILD_JOB_FAILED'
        )
          await this.release(tx, claim);
        else
          await this.attention(
            tx,
            { ...job, state: 'WAITING_FOR_CHILDREN' },
            'CHILD_JOB_FAILED',
          );
        return;
      }
      if (unfinished) {
        await tx.deletionJob.update({
          where: { id: job.id },
          data: {
            state: 'WAITING_FOR_CHILDREN',
            resumeState: 'WAITING_FOR_CHILDREN',
            attempts: 0,
            lastFailureCode: null,
          },
        });
        await this.release(tx, claim);
        return;
      }
      if (job.state !== 'MEDIA_CLEANUP') {
        if (await this.deleteCreatorBatch(tx, job.targetId)) {
          await tx.deletionJob.update({
            where: { id: job.id },
            data: {
              state: 'DATABASE_CLEANUP',
              resumeState: 'DATABASE_CLEANUP',
              lastFailureCode: null,
            },
          });
          await this.progress(tx, claim);
          return;
        }
        await tx.deletionJob.update({
          where: { id: job.id },
          data: {
            state: 'MEDIA_CLEANUP',
            resumeState: 'MEDIA_CLEANUP',
            leaseOwner: null,
            leaseExpiresAt: null,
            lastFailureCode: null,
          },
        });
        return;
      }
      if (
        (await tx.page.count({ where: { creatorId: job.targetId } })) ||
        (await tx.pageUploadGrant.count({ where: { creatorId: job.targetId } }))
      ) {
        await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
        return;
      }
      // Authentication writes that reached PostgreSQL before the creator lock can be drained here.
      if (await this.deleteCreatorBatch(tx, job.targetId)) {
        await this.progress(tx, claim);
        return;
      }
      await tx.user.delete({ where: { id: job.targetId } });
      await tx.deletionJob.update({
        where: { id: job.id },
        data: {
          state: 'COMPLETED',
          completedAt: now,
          version: { increment: 1 },
          leaseOwner: null,
          leaseExpiresAt: null,
          nextRetryAt: null,
          lastFailureCode: null,
        },
      });
      await deletionAudit(tx, {
        eventType: 'DELETION_COMPLETED',
        targetType: 'USER',
        targetId: job.targetId,
        jobId: job.id,
      });
    }, options);
  }

  private async discoverChildren(tx: Tx, parent: Job, ids: string[]) {
    const pages = await tx.page.findMany({
      where: { id: { in: ids } },
      select: { id: true, creatorId: true },
    });
    const pageById = new Map(pages.map((page) => [page.id, page]));
    const existing = await tx.deletionJob.findMany({
      where: { targetType: 'PAGE', targetId: { in: ids } },
      select: { id: true },
    });
    const children = new Map<string, Job>();
    for (const { id } of existing.sort((a, b) => a.id.localeCompare(b.id))) {
      const locked = await lockDeletionJob(tx, id);
      if (locked) children.set(locked.targetId, locked);
    }
    for (const id of ids) {
      const page = pageById.get(id),
        child = children.get(id);
      if (
        (page && page.creatorId !== parent.targetId) ||
        (child?.parentJobId && child.parentJobId !== parent.id) ||
        (child && child.detachedPage === !!page) ||
        (await tx.pageUploadGrant.findFirst({
          where: {
            pageId: id,
            OR: [{ creatorId: null }, { creatorId: { not: parent.targetId } }],
          },
          select: { id: true },
        }))
      )
        return false;
    }
    for (const id of ids) {
      const child = children.get(id);
      if (child) {
        if (!child.parentJobId) await this.attachChild(tx, parent, child);
        continue;
      }
      const created = await tx.deletionJob.create({
        data: {
          targetType: 'PAGE',
          targetId: id,
          pagesTotal: 1,
          detachedPage: !pageById.has(id),
          requestedById: parent.requestedById,
          reasonCode: parent.reasonCode,
          requestedAt: parent.requestedAt,
          parentJobId: parent.id,
        },
      });
      await deletionAudit(tx, {
        eventType: 'DELETION_CHILD_ATTACHED',
        targetId: id,
        jobId: created.id,
        parentJobId: parent.id,
      });
    }
    return true;
  }

  private async retryChildBatch(tx: Tx, parent: Job, now: Date) {
    const children = await tx.deletionJob.findMany({
      where: {
        parentJobId: parent.id,
        ...(parent.retryChildrenAfterId
          ? { id: { gt: parent.retryChildrenAfterId } }
          : {}),
      },
      orderBy: { id: 'asc' },
      take: 50,
      select: { id: true },
    });
    const locked: Job[] = [];
    for (const { id } of children) {
      const child = await lockDeletionJob(tx, id);
      if (child) locked.push(child);
    }
    const retry: Job[] = [];
    for (const child of locked) {
      if (
        !['NEEDS_ATTENTION', 'RETRY_WAIT'].includes(child.state) ||
        (child.leaseExpiresAt && child.leaseExpiresAt > now) ||
        child.lastFailureCode === 'CONSTRAINT_CONFLICT' ||
        (child.lastFailureCode === 'UPLOAD_SETTLEMENT_UNKNOWN' &&
          !child.uploadsSettledAt) ||
        (child.lastFailureCode === 'PROCESSOR_QUIESCENCE_UNKNOWN' &&
          (await this.hasUnresolvedProcessor(tx, child.targetId)))
      )
        continue;
      retry.push(child);
    }
    await this.releaseReviewTasks(
      tx,
      retry.map((child) => child.id),
      now,
    );
    for (const child of retry) {
      await tx.deletionJob.update({
        where: { id: child.id },
        data: {
          state: child.resumeState ?? 'DATABASE_CLEANUP',
          attempts: 0,
          nextRetryAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastFailureCode: null,
          version: { increment: 1 },
        },
      });
      await deletionAudit(tx, {
        eventType: 'DELETION_RETRY_REQUESTED',
        actorId: parent.retryChildrenById ?? undefined,
        targetId: child.targetId,
        jobId: child.id,
        parentJobId: parent.id,
      });
    }
    await tx.deletionJob.update({
      where: { id: parent.id },
      data: {
        retryChildrenRequested: children.length === 50,
        retryChildrenAfterId:
          children.length === 50 ? children.at(-1)!.id : null,
        retryChildrenById:
          children.length === 50 ? parent.retryChildrenById : null,
      },
    });
    return children.length === 50;
  }

  private async hasUnresolvedProcessor(tx: Tx, pageId: string) {
    const where = {
      pageId,
      processingState: {
        in: ['RUNNING', 'UNCERTAIN'] as ('RUNNING' | 'UNCERTAIN')[],
      },
    };
    return !!(
      (await tx.pageImage.count({ where })) ||
      (await tx.pageAudio.count({ where }))
    );
  }

  private async releaseReviewTasks(tx: Tx, jobIds: string[], now: Date) {
    const where = {
      status: 'REVIEW' as const,
      deletionLinks: { some: { jobId: { in: jobIds } } },
      OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
    };
    const tasks = await tx.mediaCleanup.findMany({
      where,
      orderBy: { id: 'asc' },
      take: 100,
      select: { id: true },
    });
    for (const { id } of tasks)
      await tx.mediaCleanup.updateMany({
        where: { ...where, id },
        data: {
          status: 'PENDING',
          attempts: 0,
          nextRetryAt: null,
          lastFailureCode: null,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
  }

  private async deleteCreatorBatch(tx: Tx, creatorId: string) {
    const direct = Prisma.sql`"userId"=${creatorId} OR ("targetType"='USER' AND "targetId"=${creatorId})`;
    const steps: [string, Prisma.Sql][] = [
      [
        'ModerationAction',
        Prisma.sql`"appealId" IN (SELECT "id" FROM "Appeal" WHERE "originalActionId" IN (SELECT "id" FROM "ModerationAction" WHERE ${direct}))`,
      ],
      [
        'Appeal',
        Prisma.sql`"originalActionId" IN (SELECT "id" FROM "ModerationAction" WHERE ${direct})`,
      ],
      ['ModerationAction', direct],
      ['session', Prisma.sql`"userId"=${creatorId}`],
      ['account', Prisma.sql`"userId"=${creatorId}`],
      [
        'verification',
        Prisma.sql`letterly_linked_verification_user("identifier", "value")=${creatorId}`,
      ],
      ['AdminIdempotencyRecord', Prisma.sql`"actorId"=${creatorId}`],
    ];
    for (const [table, where] of steps)
      if (await boundedDelete(tx, table, where)) return true;
    return false;
  }
  private async queueKeys(tx: Tx, jobId: string, keys: string[]) {
    for (const objectKey of [...new Set(keys)].sort()) {
      const task = await tx.mediaCleanup.upsert({
        where: { objectKey },
        create: { objectKey },
        update: {},
        select: { id: true },
      });
      const link = await tx.deletionJobMedia.createMany({
        data: [{ jobId, cleanupTaskId: task.id }],
        skipDuplicates: true,
      });
      if (link.count) {
        await tx.mediaCleanup.update({
          where: { id: task.id },
          data: { leaseOwner: null, leaseExpiresAt: null },
        });
        await tx.deletionJob.update({
          where: { id: jobId },
          data: { mediaTotal: { increment: 1 } },
        });
      }
    }
  }
  private async queueMediaBatch(tx: Tx, job: Job) {
    const grants = await tx.$queryRaw<{ objectKey: string }[]>`
      SELECT DISTINCT grant_row."objectKey" FROM "PageUploadGrant" grant_row WHERE grant_row."pageId"=${job.targetId}::uuid
      AND NOT EXISTS (SELECT 1 FROM "MediaCleanup" task JOIN "DeletionJobMedia" link ON link."cleanupTaskId"=task."id" WHERE task."objectKey"=grant_row."objectKey" AND link."jobId"=${job.id}::uuid)
      ORDER BY grant_row."objectKey" LIMIT 50`;
    if (grants.length) {
      await this.queueKeys(
        tx,
        job.id,
        grants.map((g) => g.objectKey),
      );
      return true;
    }
    const tasks = await tx.$queryRaw<{ objectKey: string }[]>`
        SELECT task."objectKey" FROM "MediaCleanup" task
        WHERE split_part(task."objectKey", '/', 1)='pages'
          AND strpos(substring(task."objectKey" from 7), '/')>0
          AND lower(split_part(task."objectKey", '/', 2))=${job.targetId}
          AND NOT EXISTS (
            SELECT 1 FROM "DeletionJobMedia" link
            WHERE link."cleanupTaskId"=task."id" AND link."jobId"=${job.id}::uuid
          ) ORDER BY task."id" LIMIT 100`;
    await this.queueKeys(
      tx,
      job.id,
      tasks.map((task) => task.objectKey),
    );
    if (tasks.length) return true;
    if (job.detachedPage) return false;
    const images = await tx.pageImage.findMany({
      where: { pageId: job.targetId },
      orderBy: { id: 'asc' },
      take: 50,
      select: {
        id: true,
        sourceStorageKey: true,
        storageKey: true,
        outputManifest: true,
      },
    });
    if (images.length) {
      await this.queueKeys(
        tx,
        job.id,
        images.flatMap((image) =>
          [
            image.sourceStorageKey,
            image.storageKey,
            ...this.keys(image.outputManifest),
          ].filter((key): key is string => !!key),
        ),
      );
      await tx.pageImage.deleteMany({
        where: { id: { in: images.map((i) => i.id) } },
      });
      return true;
    }
    const audio = await tx.pageAudio.findMany({
      where: { pageId: job.targetId },
      orderBy: { id: 'asc' },
      take: 50,
      select: { id: true, sourceStorageKey: true, outputManifest: true },
    });
    if (audio.length) {
      await this.queueKeys(
        tx,
        job.id,
        audio.flatMap((row) =>
          [row.sourceStorageKey, ...this.keys(row.outputManifest)].filter(
            (key): key is string => !!key,
          ),
        ),
      );
      await tx.pageAudio.deleteMany({
        where: { id: { in: audio.map((i) => i.id) } },
      });
      return true;
    }
    return false;
  }
  private keys(value: Prisma.JsonValue): string[] {
    if (
      !Array.isArray(value) ||
      value.length > 100 ||
      value.some((key) => typeof key !== 'string')
    )
      throw new Error('Invalid manifest');
    return value as string[];
  }
  private async deleteRelatedBatch(tx: Tx, pageId: string) {
    const page = Prisma.sql`${pageId}::uuid`;
    const steps: [string, Prisma.Sql][] = [
      [
        'VisitorAnswer',
        Prisma.sql`"submissionId" IN (SELECT "id" FROM "VisitorSubmission" WHERE "pageId"=${page})`,
      ],
      [
        'VisitorMessage',
        Prisma.sql`"submissionId" IN (SELECT "id" FROM "VisitorSubmission" WHERE "pageId"=${page})`,
      ],
      ['VisitorSubmission', Prisma.sql`"pageId"=${page}`],
      [
        'ModerationAction',
        Prisma.sql`"appealId" IN (SELECT appeal."id" FROM "Appeal" appeal JOIN "ModerationAction" original ON original."id"=appeal."originalActionId" WHERE original."pageId"=${page} OR original."reportId" IN (SELECT "id" FROM "PageReport" WHERE "pageId"=${page}) OR (original."targetType"='PAGE' AND original."targetId"=${pageId}))`,
      ],
      [
        'Appeal',
        Prisma.sql`"originalActionId" IN (SELECT "id" FROM "ModerationAction" WHERE "pageId"=${page} OR "reportId" IN (SELECT "id" FROM "PageReport" WHERE "pageId"=${page}) OR ("targetType"='PAGE' AND "targetId"=${pageId}))`,
      ],
      [
        'ModerationAction',
        Prisma.sql`"pageId"=${page} OR "reportId" IN (SELECT "id" FROM "PageReport" WHERE "pageId"=${page}) OR ("targetType"='PAGE' AND "targetId"=${pageId})`,
      ],
      ['PageReport', Prisma.sql`"pageId"=${page}`],
      [
        'PageChoice',
        Prisma.sql`"questionId" IN (SELECT "id" FROM "PageQuestion" WHERE "pageId"=${page})`,
      ],
      ['PageQuestion', Prisma.sql`"pageId"=${page}`],
      [
        'PageJourneyChoice',
        Prisma.sql`"questionId" IN (SELECT question."id" FROM "PageJourneyQuestion" question JOIN "PageJourneyGraphRevision" revision ON revision."id"=question."revisionId" JOIN "PageJourney" journey ON journey."id"=revision."journeyId" WHERE journey."pageId"=${page})`,
      ],
      [
        'PageJourneyOutcome',
        Prisma.sql`"revisionId" IN (SELECT revision."id" FROM "PageJourneyGraphRevision" revision JOIN "PageJourney" journey ON journey."id"=revision."journeyId" WHERE journey."pageId"=${page})`,
      ],
      [
        'PageJourneyQuestion',
        Prisma.sql`"revisionId" IN (SELECT revision."id" FROM "PageJourneyGraphRevision" revision JOIN "PageJourney" journey ON journey."id"=revision."journeyId" WHERE journey."pageId"=${page}) AND "id" NOT IN (SELECT "rootQuestionId" FROM "PageJourneyGraphRevision")`,
      ],
      ['PageVisit', Prisma.sql`"pageId"=${page}`],
      ['PageViewSession', Prisma.sql`"pageId"=${page}`],
      ['PageAudioLink', Prisma.sql`"pageId"=${page}`],
    ];
    for (const [table, scope] of steps)
      if (await boundedDelete(tx, table, scope)) return true;
    await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
    const oldRevisions = await boundedDelete(
      tx,
      'PageJourneyGraphRevision',
      Prisma.sql`"journeyId" IN (SELECT "id" FROM "PageJourney" WHERE "pageId"=${page}) AND "id" NOT IN (SELECT "draftRevisionId" FROM "PageJourney") AND "id" NOT IN (SELECT "publishedRevisionId" FROM "PageJourney" WHERE "publishedRevisionId" IS NOT NULL)`,
      50,
    );
    if (oldRevisions) return true;
    if (await boundedDelete(tx, 'PageJourney', Prisma.sql`"pageId"=${page}`, 1))
      return true;
    const reservations = await tx.pageSlugReservation.findMany({
      where: { pageId },
      select: { id: true },
      take: 100,
    });
    if (reservations.length) {
      await tx.pageSlugReservation.updateMany({
        where: { id: { in: reservations.map((r) => r.id) } },
        data: { pageId: null, isCurrent: false },
      });
      return true;
    }
    return false;
  }
  private async release(tx: Tx, claim: DeletionClaim) {
    await tx.deletionJob.updateMany({
      where: { id: claim.id, leaseOwner: claim.leaseOwner },
      data: {
        leaseOwner: null,
        leaseExpiresAt: null,
        nextRetryAt: new Date(
          (await deletionDatabaseNow(tx)).getTime() + 30_000,
        ),
      },
    });
  }
  private async progress(tx: Tx, claim: DeletionClaim) {
    await tx.deletionJob.updateMany({
      where: { id: claim.id, leaseOwner: claim.leaseOwner },
      data: {
        databaseBatchesCompleted: { increment: 1 },
        attempts: 0,
        leaseOwner: null,
        leaseExpiresAt: null,
        nextRetryAt: null,
        version: { increment: 1 },
      },
    });
  }
  private async attention(tx: Tx, job: Job, code: Failure) {
    await tx.deletionJob.update({
      where: { id: job.id },
      data: {
        state: 'NEEDS_ATTENTION',
        resumeState:
          job.state === 'MEDIA_CLEANUP' || job.state === 'WAITING_FOR_CHILDREN'
            ? job.state
            : 'DATABASE_CLEANUP',
        lastFailureCode: code,
        leaseOwner: null,
        leaseExpiresAt: null,
        version: { increment: 1 },
      },
    });
    await deletionAudit(tx, {
      eventType: 'DELETION_ATTENTION_REQUIRED',
      targetType: job.targetType === 'CREATOR' ? 'USER' : 'PAGE',
      targetId: job.targetId,
      jobId: job.id,
      failureCode: code,
    });
    await this.wakeParent(tx, job.parentJobId);
  }
  async fail(claim: DeletionClaim, error: unknown) {
    const before = this.monitoring
      ? await this.prisma.deletionJob
          .findUnique({ where: { id: claim.id } })
          .catch(() => null)
      : null;
    await this.prisma.$transaction(async (tx) => {
      const source = await tx.deletionJob.findUnique({
        where: { id: claim.id },
      });
      if (!source) return;
      if (source.targetType === 'CREATOR')
        await lockUsers(tx, [source.targetId]);
      const job =
        source.targetType === 'PAGE'
          ? (await lockDeletionPageScope(tx, source)).job
          : await lockDeletionJob(tx, source.id);
      const now = await deletionDatabaseNow(tx);
      if (
        !job ||
        job.leaseOwner !== claim.leaseOwner ||
        !job.leaseExpiresAt ||
        job.leaseExpiresAt <= now
      )
        return;
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code === 'P2028'
            ? 'DB_TIMEOUT'
            : 'CONSTRAINT_CONFLICT'
          : 'UNKNOWN';
      const attempts = job.attempts + 1;
      const attention = attempts >= 5;
      await tx.deletionJob.update({
        where: { id: job.id },
        data: {
          state: attention ? 'NEEDS_ATTENTION' : 'RETRY_WAIT',
          resumeState:
            job.state === 'MEDIA_CLEANUP' ||
            job.state === 'WAITING_FOR_CHILDREN'
              ? job.state
              : 'DATABASE_CLEANUP',
          attempts,
          lastFailureCode: code,
          nextRetryAt: attention
            ? null
            : new Date(now.getTime() + 60_000 * 2 ** (attempts - 1)),
          leaseOwner: null,
          leaseExpiresAt: null,
          version: { increment: 1 },
        },
      });
      if (attention)
        await deletionAudit(tx, {
          eventType: 'DELETION_ATTENTION_REQUIRED',
          targetType: job.targetType === 'CREATOR' ? 'USER' : 'PAGE',
          targetId: job.targetId,
          jobId: job.id,
          failureCode: code,
        });
      await this.wakeParent(tx, job.parentJobId);
    }, options);
    if (before?.leaseOwner === claim.leaseOwner)
      await this.recordTransition(before);
  }
}
