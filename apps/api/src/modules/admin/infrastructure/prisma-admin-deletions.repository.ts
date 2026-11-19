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
import { lockDeletionJob, lockDeletionPageScope } from './deletion-job-locks';

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
      | 'DELETION_CHILD_ATTACHED'
      | 'DELETION_ATTENTION_REQUIRED';
    targetId: string;
    targetType?: 'PAGE' | 'USER';
    parentJobId?: string;
    jobId: string;
    requestId?: string;
    failureCode?: string;
  },
) {
  await tx.auditEvent.create({
    data: {
      actorId: input.actorId ?? null,
      eventType: input.eventType,
      targetType: input.targetType ?? 'PAGE',
      targetId: input.targetId,
      requestId: input.requestId ?? null,
      outcome:
        input.eventType === 'DELETION_ATTENTION_REQUIRED'
          ? 'FAILURE'
          : 'SUCCESS',
      metadata: {
        jobId: input.jobId,
        ...(input.parentJobId ? { parentJobId: input.parentJobId } : {}),
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

export function creatorPageIds(creatorId: string) {
  return Prisma.sql`SELECT "id" FROM "Page" WHERE "creatorId"=${creatorId}
    UNION SELECT "pageId" FROM "PageUploadGrant" WHERE "creatorId"=${creatorId}`;
}

async function creatorImpact(
  tx: Prisma.TransactionClient,
  creatorId: string,
  now: Date,
): Promise<DeletionImpactCounts> {
  const page = { creatorId };
  const [counts] = await tx.$queryRaw<
    { pages: number; appeals: number; moderationActions: number }[]
  >`
    WITH owned("id") AS MATERIALIZED (${creatorPageIds(creatorId)}),
    direct AS MATERIALIZED (
      SELECT action."id" FROM "ModerationAction" action
      WHERE action."userId"=${creatorId} OR (action."targetType"='USER' AND action."targetId"=${creatorId})
        OR action."pageId" IN (SELECT "id" FROM owned)
        OR (action."targetType"='PAGE' AND action."targetId" IN (SELECT "id"::text FROM owned))
        OR action."reportId" IN (SELECT "id" FROM "PageReport" WHERE "pageId" IN (SELECT "id" FROM owned))
    ),
    related_appeals AS MATERIALIZED (
      SELECT "id" FROM "Appeal" WHERE "originalActionId" IN (SELECT "id" FROM direct)
    )
    SELECT (SELECT count(*) FROM owned)::integer AS pages,
      (SELECT count(*) FROM related_appeals)::integer AS appeals,
      (SELECT count(*) FROM "ModerationAction"
        WHERE "id" IN (SELECT "id" FROM direct) OR "appealId" IN (SELECT "id" FROM related_appeals))::integer AS "moderationActions"`;
  const [submissions, images, audioTracks, pendingUploads, reports] =
    await Promise.all([
      tx.visitorSubmission.count({ where: { page } }),
      tx.pageImage.count({ where: { page } }),
      tx.pageAudio.count({ where: { page } }),
      tx.pageUploadGrant.count({
        where: { creatorId, expiresAt: { gt: now } },
      }),
      tx.pageReport.count({ where: { page } }),
    ]);
  return {
    ...counts!,
    submissions,
    images,
    audioTracks,
    pendingUploads,
    reports,
  };
}

async function requireCreatorDeletionReady(tx: Prisma.TransactionClient) {
  const [column] = await tx.$queryRaw<{ ready: boolean }[]>`
    SELECT a.attnotnull AS ready FROM pg_catalog.pg_attribute a
    WHERE a.attrelid=pg_catalog.to_regclass(pg_catalog.format('%I.%I', current_schema(), 'PageUploadGrant'))
      AND a.attname='creatorId' AND NOT a.attisdropped`;
  if (!column?.ready) throw new AdminDeletionError('INVALID_DELETION_STATE');
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
  async preview(
    actorId: string,
    pageId: string,
    version: number,
    targetType: 'PAGE' | 'CREATOR' = 'PAGE',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const page =
        targetType === 'PAGE'
          ? await lockPageBarrier(tx, pageId, {
              actorIds: [actorId],
              allowDeletion: true,
            })
          : null;
      if (targetType === 'CREATOR') await lockUsers(tx, [actorId, pageId]);
      await activeActor(tx, actorId);
      if (targetType === 'CREATOR') {
        await requireCreatorDeletionReady(tx);
        await this.checkCreator(tx, pageId, version);
      } else this.checkPage(page, version);
      const now = await deletionDatabaseNow(tx);
      const counts = await (
        targetType === 'CREATOR' ? creatorImpact : deletionImpact
      )(tx, pageId, now);
      return {
        targetType,
        targetId: pageId,
        expectedModerationVersion: version,
        counts,
        ...this.tokens.issue({
          actorId,
          targetId: pageId,
          targetType,
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
    targetType: 'PAGE' | 'CREATOR' = 'PAGE',
    enabled = true,
  ) {
    const operation =
      targetType === 'CREATOR' ? 'CREATOR_DELETE' : 'PAGE_DELETE';
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
      const page =
        targetType === 'PAGE'
          ? await lockPageBarrier(tx, pageId, {
              actorIds: [actorId],
              allowDeletion: true,
            })
          : null;
      if (targetType === 'CREATOR') await lockUsers(tx, [actorId, pageId]);
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
      if (!enabled) throw new AdminDeletionError('INVALID_DELETION_STATE');
      if (targetType === 'CREATOR') {
        await requireCreatorDeletionReady(tx);
        await this.checkCreator(tx, pageId, request.expectedModerationVersion);
      } else this.checkPage(page, request.expectedModerationVersion);
      if (request.typedTargetId !== pageId)
        throw new AdminDeletionError('STALE_DELETION_IMPACT');
      const now = await deletionDatabaseNow(tx);
      const counts = await (
        targetType === 'CREATOR' ? creatorImpact : deletionImpact
      )(tx, pageId, now);
      this.tokens.verify(request.confirmationToken, {
        actorId,
        targetId: pageId,
        targetType,
        expectedModerationVersion: request.expectedModerationVersion,
        counts,
        now,
      });
      const barrier = {
        deletionRequestedAt: now,
        moderationStatus: 'DISABLED' as const,
        disabledAt: now,
        disabledReason: request.reasonCode,
        moderationVersion: { increment: 1 },
      };
      if (targetType === 'CREATOR') {
        await tx.user.update({ where: { id: pageId }, data: barrier });
        await tx.session.deleteMany({ where: { userId: pageId } });
      } else await tx.page.update({ where: { id: pageId }, data: barrier });
      const job = await tx.deletionJob.create({
        data: {
          targetType,
          targetId: pageId,
          requestedById: actorId,
          reasonCode: request.reasonCode,
          note: request.note ?? null,
          requestedAt: now,
          pagesTotal: counts.pages,
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
          targetType: targetType === 'CREATOR' ? 'USER' : 'PAGE',
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
        targetType: targetType === 'CREATOR' ? 'USER' : 'PAGE',
        targetId: pageId,
        jobId: job.id,
        requestId,
      });
      return result;
    }, txOptions);
  }

  private async checkCreator(
    tx: Prisma.TransactionClient,
    id: string,
    version: number,
  ) {
    const target = await tx.user.findUnique({
      where: { id },
      select: {
        role: true,
        deletionRequestedAt: true,
        moderationVersion: true,
      },
    });
    if (!target) throw new AdminDeletionError('NOT_FOUND');
    if (target.role === 'ADMIN')
      throw new AdminDeletionError('PROTECTED_TARGET');
    if (target.deletionRequestedAt)
      throw new AdminDeletionError('DELETION_IN_PROGRESS');
    if (target.moderationVersion !== version)
      throw new AdminDeletionError('STALE_MODERATION_VERSION');
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
      });
      if (!discovered) throw new AdminDeletionError('NOT_FOUND');
      const creator = discovered.targetType === 'CREATOR';
      if (creator) await lockUsers(tx, [actorId, discovered.targetId]);
      const scope = creator
        ? null
        : await lockDeletionPageScope(tx, discovered, [actorId]);
      await activeActor(tx, actorId);
      const job = creator ? await lockDeletionJob(tx, jobId) : scope?.job;
      if (!job) throw new AdminDeletionError('NOT_FOUND');
      const now = await deletionDatabaseNow(tx);
      const operation = creator ? 'CREATOR_DELETE_RETRY' : 'PAGE_DELETE_RETRY';
      const auditTarget = creator ? 'USER' : 'PAGE';
      const hash = canonicalHash({ jobId, ...request });
      const prior = await tx.adminIdempotencyRecord.findUnique({
        where: {
          actorId_operation_targetType_targetId_key: {
            actorId,
            operation,
            targetType: auditTarget,
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
      if (!creator && !scope?.valid)
        throw new AdminDeletionError('INVALID_DELETION_STATE');
      const [images, audio] = creator
        ? [0, 0]
        : await Promise.all([
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
      for (const { id } of tasks.sort((a, b) => a.id.localeCompare(b.id)))
        await tx.mediaCleanup.updateMany({
          where: {
            id,
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
          state:
            creator && job.lastFailureCode === 'CHILD_JOB_FAILED'
              ? 'NEEDS_ATTENTION'
              : (job.resumeState ?? 'DATABASE_CLEANUP'),
          attempts: 0,
          version: { increment: 1 },
          nextRetryAt: null,
          lastFailureCode:
            creator && job.lastFailureCode === 'CHILD_JOB_FAILED'
              ? 'CHILD_JOB_FAILED'
              : null,
          ...(creator
            ? {
                retryChildrenRequested: job.creatorDiscoveryCompleted,
                retryChildrenAfterId: null,
                retryChildrenById: job.creatorDiscoveryCompleted
                  ? actorId
                  : null,
              }
            : {}),
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
            targetType: auditTarget,
            targetId: jobId,
            key: request.idempotencyKey,
          },
        },
        create: {
          actorId,
          operation,
          targetType: auditTarget,
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
        targetType: auditTarget,
        targetId: job.targetId,
        jobId,
        requestId,
      });
      if (scope?.parent)
        await tx.deletionJob.update({
          where: { id: scope.parent.id },
          data: { nextRetryAt: null, version: { increment: 1 } },
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
