import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@letterly/database';
import { createHash, randomUUID } from 'node:crypto';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import { lockPageBarrier } from '../../../infrastructure/database/page-barrier';
import type {
  DeletionClaim,
  DeletionWorkerRepository,
} from '../application/deletion-worker';
import { canonicalJson } from './deletion-canonical';
import {
  deletionAudit,
  deletionDatabaseNow,
} from './prisma-admin-deletions.repository';

const options = { maxWait: 10_000, timeout: 10_000 };
type Job = Prisma.DeletionJobGetPayload<Record<string, never>>;
type Tx = Prisma.TransactionClient;
type Failure =
  | 'PROCESSOR_QUIESCENCE_UNKNOWN'
  | 'UPLOAD_SETTLEMENT_UNKNOWN'
  | 'CLEANUP_RECEIPT_MISSING'
  | 'DELETE_FAILED'
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
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}
  async claim(limit: number) {
    const leaseOwner = randomUUID();
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH candidates AS (
        SELECT "id" FROM "DeletionJob"
        WHERE "targetType"='PAGE' AND "state" IN ('QUEUED','DATABASE_CLEANUP','MEDIA_CLEANUP','RETRY_WAIT')
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
    if (!current.uploadManifestSha256)
      await this.prepareGrantSnapshot(claim, current.targetId);
    await this.prisma.$transaction(async (tx) => {
      const page = await lockPageBarrier(tx, current.targetId, {
        allowDeletion: true,
      });
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${claim.id}::uuid FOR UPDATE`;
      const job = await tx.deletionJob.findUniqueOrThrow({
        where: { id: claim.id },
      });
      const now = await deletionDatabaseNow(tx);
      if (
        job.leaseOwner !== claim.leaseOwner ||
        !job.leaseExpiresAt ||
        job.leaseExpiresAt <= now
      )
        return;
      if (!page || !page.deletionRequestedAt) {
        await this.attention(tx, job, 'CONSTRAINT_CONFLICT');
        return;
      }
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
      await tx.pageSlugReservation.updateMany({
        where: { pageId: job.targetId },
        data: { pageId: null, isCurrent: false },
      });
      await tx.page.delete({ where: { id: job.targetId } });
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
    }, options);
  }
  private async prepareGrantSnapshot(claim: DeletionClaim, pageId: string) {
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
      await lockPageBarrier(tx, pageId, { allowDeletion: true });
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${claim.id}::uuid FOR UPDATE`;
      const now = await deletionDatabaseNow(tx);
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
      if (link.count)
        await tx.deletionJob.update({
          where: { id: jobId },
          data: { mediaTotal: { increment: 1 } },
        });
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
          job.state === 'MEDIA_CLEANUP' ? 'MEDIA_CLEANUP' : 'DATABASE_CLEANUP',
        lastFailureCode: code,
        leaseOwner: null,
        leaseExpiresAt: null,
        version: { increment: 1 },
      },
    });
    await deletionAudit(tx, {
      eventType: 'DELETION_ATTENTION_REQUIRED',
      targetId: job.targetId,
      jobId: job.id,
      failureCode: code,
    });
  }
  async fail(claim: DeletionClaim, error: unknown) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "DeletionJob" WHERE "id"=${claim.id}::uuid FOR UPDATE`;
      const job = await tx.deletionJob.findUnique({ where: { id: claim.id } });
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
            job.state === 'MEDIA_CLEANUP'
              ? 'MEDIA_CLEANUP'
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
          targetId: job.targetId,
          jobId: job.id,
          failureCode: code,
        });
    }, options);
  }
}
