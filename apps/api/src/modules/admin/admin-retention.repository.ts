import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

export const ADMIN_RETENTION_REPOSITORY = Symbol('ADMIN_RETENTION_REPOSITORY');

export type RetentionFailureCode =
  | 'DB_TIMEOUT'
  | 'SERIALIZATION_RETRY_EXHAUSTED'
  | 'CONSTRAINT_CONFLICT'
  | 'UNKNOWN';

export interface RetentionRunResult {
  acquired: boolean;
  claimed: number;
  deleted: number;
}

export interface AdminRetentionRepository {
  run(input: {
    now: Date;
    retentionDays: number;
    batchSize: number;
  }): Promise<RetentionRunResult>;
  recordSuccess(input: {
    now: Date;
    claimed: number;
    deleted: number;
  }): Promise<void>;
  recordFailure(input: {
    now: Date;
    failureCode: RetentionFailureCode;
  }): Promise<void>;
}

type AdminTransaction = Parameters<PrismaClient['$transaction']>[0] extends (
  transaction: infer Transaction,
) => unknown
  ? Transaction
  : never;

type ClaimedRecord = {
  recordType:
    | 'PAGE_REPORT'
    | 'MODERATION_ACTION'
    | 'APPEAL'
    | 'AUDIT_EVENT'
    | 'ADMIN_IDEMPOTENCY';
  recordId: string;
};

const CLAIM_MINUTES = 15;
const LEASE_MINUTES = 5;
const JOB_NAME = 'moderation-retention';

function isTransientDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  const code = candidate.code;
  return (
    (typeof code === 'string' &&
      new Set([
        'ECONNRESET',
        'ETIMEDOUT',
        'EAI_AGAIN',
        'P1001',
        'P1002',
        'P2024',
        'P2034',
        '40001',
        '40P01',
        '08000',
        '08001',
        '08006',
      ]).has(code)) ||
    (candidate.cause !== undefined && isTransientDatabaseError(candidate.cause))
  );
}

function failureCodeFor(error: unknown): RetentionFailureCode {
  if (isTransientDatabaseError(error)) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined;
    return code === '40001' || code === '40P01'
      ? 'SERIALIZATION_RETRY_EXHAUSTED'
      : 'DB_TIMEOUT';
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (code === 'P2002' || code === 'P2003') return 'CONSTRAINT_CONFLICT';
  }
  return 'UNKNOWN';
}

@Injectable()
export class PrismaAdminRetentionRepository implements AdminRetentionRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async run(input: {
    now: Date;
    retentionDays: number;
    batchSize: number;
  }): Promise<RetentionRunResult> {
    const leaseToken = randomUUID();
    const leaseExpiresAt = new Date(
      input.now.getTime() + LEASE_MINUTES * 60 * 1000,
    );

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const acquired = await this.acquireLease(
          transaction,
          leaseToken,
          input.now,
          leaseExpiresAt,
        );
        if (!acquired) return { acquired: false, claimed: 0, deleted: 0 };

        await transaction.retentionClaim.deleteMany({
          where: { claimExpiresAt: { lte: input.now } },
        });

        const cutoff = new Date(
          input.now.getTime() - input.retentionDays * 24 * 60 * 60 * 1000,
        );
        const claims: ClaimedRecord[] = [];
        const perTypeLimit = Math.max(1, Math.ceil(input.batchSize / 5));
        claims.push(
          ...(await this.claimPageReports(
            transaction,
            cutoff,
            input.now,
            perTypeLimit,
          )),
          ...(await this.claimModerationActions(
            transaction,
            cutoff,
            input.now,
            perTypeLimit,
          )),
          ...(await this.claimAppeals(
            transaction,
            cutoff,
            input.now,
            perTypeLimit,
          )),
          ...(await this.claimAuditEvents(
            transaction,
            cutoff,
            input.now,
            perTypeLimit,
          )),
          ...(await this.claimExpiredIdempotency(
            transaction,
            input.now,
            perTypeLimit,
          )),
        );

        const limitedClaims = claims.slice(0, input.batchSize);
        if (limitedClaims.length > 0) {
          await transaction.retentionClaim.createMany({
            data: limitedClaims.map((claim) => ({
              id: randomUUID(),
              recordType: claim.recordType,
              recordId: claim.recordId,
              claimToken: leaseToken,
              claimedAt: input.now,
              claimExpiresAt: new Date(
                input.now.getTime() + CLAIM_MINUTES * 60 * 1000,
              ),
              attempts: 1,
            })),
            skipDuplicates: true,
          });
        }
        const idsByType = new Map<string, string[]>();
        for (const claim of limitedClaims) {
          const ids = idsByType.get(claim.recordType) ?? [];
          ids.push(claim.recordId);
          idsByType.set(claim.recordType, ids);
        }

        let deleted = 0;
        deleted += await transaction.appeal
          .deleteMany({
            where: { id: { in: idsByType.get('APPEAL') ?? [] } },
          })
          .then((result) => result.count);
        deleted += await transaction.moderationAction
          .deleteMany({
            where: { id: { in: idsByType.get('MODERATION_ACTION') ?? [] } },
          })
          .then((result) => result.count);
        deleted += await transaction.pageReport
          .deleteMany({
            where: { id: { in: idsByType.get('PAGE_REPORT') ?? [] } },
          })
          .then((result) => result.count);
        deleted += await transaction.auditEvent
          .deleteMany({
            where: { id: { in: idsByType.get('AUDIT_EVENT') ?? [] } },
          })
          .then((result) => result.count);
        deleted += await transaction.adminIdempotencyRecord
          .deleteMany({
            where: { id: { in: idsByType.get('ADMIN_IDEMPOTENCY') ?? [] } },
          })
          .then((result) => result.count);

        if (limitedClaims.length > 0) {
          await transaction.retentionClaim.deleteMany({
            where: {
              claimToken: leaseToken,
              OR: limitedClaims.map((claim) => ({
                recordType: claim.recordType,
                recordId: claim.recordId,
              })),
            },
          });
        }

        return { acquired: true, claimed: limitedClaims.length, deleted };
      });
    } catch (error: unknown) {
      // The database may be unavailable for the failure audit as well. Keep
      // the original transaction error observable and make the audit write
      // best effort so monitoring cannot mask the root cause.
      await this.recordFailure({
        now: input.now,
        failureCode: failureCodeFor(error),
      }).catch(() => undefined);
      throw error;
    }
  }

  async recordSuccess(input: {
    now: Date;
    claimed: number;
    deleted: number;
  }): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        eventType: 'RETENTION_SUCCEEDED',
        targetType: 'SYSTEM',
        targetId: JOB_NAME,
        outcome: 'SUCCESS',
        metadata: { claimed: input.claimed, deleted: input.deleted },
        createdAt: input.now,
      },
    });
  }

  async recordFailure(input: {
    now: Date;
    failureCode: RetentionFailureCode;
  }): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        eventType: 'RETENTION_FAILED',
        targetType: 'SYSTEM',
        targetId: JOB_NAME,
        outcome: 'FAILURE',
        metadata: { failureCode: input.failureCode },
        createdAt: input.now,
      },
    });
  }

  private async acquireLease(
    transaction: AdminTransaction,
    leaseToken: string,
    now: Date,
    leaseExpiresAt: Date,
  ): Promise<boolean> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "JobLease" ("id", "jobName", "leaseToken", "leasedAt", "leaseExpiresAt")
      VALUES (${randomUUID()}, ${JOB_NAME}, ${leaseToken}, ${now}, ${leaseExpiresAt})
      ON CONFLICT ("jobName") DO UPDATE
      SET "leaseToken" = EXCLUDED."leaseToken",
          "leasedAt" = EXCLUDED."leasedAt",
          "leaseExpiresAt" = EXCLUDED."leaseExpiresAt"
      WHERE "JobLease"."leaseExpiresAt" <= ${now}
      RETURNING "id"
    `;
    return rows.length > 0;
  }

  private async claimPageReports(
    transaction: AdminTransaction,
    cutoff: Date,
    now: Date,
    limit: number,
  ): Promise<ClaimedRecord[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT report."id"::text AS id
      FROM "PageReport" report
      WHERE report."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "RetentionClaim" claim
          WHERE claim."recordType" = 'PAGE_REPORT'
            AND claim."recordId" = report."id"::text
            AND claim."claimExpiresAt" > ${now}
        )
      ORDER BY report."createdAt", report."id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    return rows.map(({ id }) => ({ recordType: 'PAGE_REPORT', recordId: id }));
  }

  private async claimModerationActions(
    transaction: AdminTransaction,
    cutoff: Date,
    now: Date,
    limit: number,
  ): Promise<ClaimedRecord[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT action."id"::text AS id
      FROM "ModerationAction" action
      WHERE action."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "RetentionClaim" claim
          WHERE claim."recordType" = 'MODERATION_ACTION'
            AND claim."recordId" = action."id"::text
            AND claim."claimExpiresAt" > ${now}
        )
      ORDER BY action."createdAt", action."id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    return rows.map(({ id }) => ({
      recordType: 'MODERATION_ACTION',
      recordId: id,
    }));
  }

  private async claimAppeals(
    transaction: AdminTransaction,
    cutoff: Date,
    now: Date,
    limit: number,
  ): Promise<ClaimedRecord[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT appeal."id"::text AS id
      FROM "Appeal" appeal
      WHERE appeal."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "RetentionClaim" claim
          WHERE claim."recordType" = 'APPEAL'
            AND claim."recordId" = appeal."id"::text
            AND claim."claimExpiresAt" > ${now}
        )
      ORDER BY appeal."createdAt", appeal."id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    return rows.map(({ id }) => ({ recordType: 'APPEAL', recordId: id }));
  }

  private async claimAuditEvents(
    transaction: AdminTransaction,
    cutoff: Date,
    now: Date,
    limit: number,
  ): Promise<ClaimedRecord[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT event."id"::text AS id
      FROM "AuditEvent" event
      WHERE event."createdAt" < ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "RetentionClaim" claim
          WHERE claim."recordType" = 'AUDIT_EVENT'
            AND claim."recordId" = event."id"::text
            AND claim."claimExpiresAt" > ${now}
        )
      ORDER BY event."createdAt", event."id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    return rows.map(({ id }) => ({ recordType: 'AUDIT_EVENT', recordId: id }));
  }

  private async claimExpiredIdempotency(
    transaction: AdminTransaction,
    now: Date,
    limit: number,
  ): Promise<ClaimedRecord[]> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT record."id"::text AS id
      FROM "AdminIdempotencyRecord" record
      WHERE record."expiresAt" <= ${now}
        AND NOT EXISTS (
          SELECT 1 FROM "RetentionClaim" claim
          WHERE claim."recordType" = 'ADMIN_IDEMPOTENCY'
            AND claim."recordId" = record."id"::text
            AND claim."claimExpiresAt" > ${now}
        )
      ORDER BY record."expiresAt", record."id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    `;
    return rows.map(({ id }) => ({
      recordType: 'ADMIN_IDEMPOTENCY',
      recordId: id,
    }));
  }
}
