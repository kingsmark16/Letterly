import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import type {
  AdminModerationActionResponse,
  AdminReportActionRequest,
} from '@letterly/contracts';
import { adminModerationActionResponseSchema } from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

export const ADMIN_MODERATION_REPOSITORY = Symbol(
  'ADMIN_MODERATION_REPOSITORY',
);

export type ReportModerationOperation =
  'REPORT_REVIEW' | 'REPORT_DISMISS' | 'REPORT_REOPEN';

export class AdminModerationStaleVersionError extends Error {
  constructor() {
    super('Moderation state changed');
  }
}

export class AdminModerationIdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency key was already used for another request');
  }
}

export interface AdminModerationRepository {
  mutateReport(input: {
    actorId: string;
    reportId: string;
    operation: ReportModerationOperation;
    request: AdminReportActionRequest;
    requestId: string;
  }): Promise<AdminModerationActionResponse>;
}

function payloadHash(input: {
  operation: ReportModerationOperation;
  request: AdminReportActionRequest;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        operation: input.operation,
        confirm: input.request.confirm,
        expectedModerationVersion: input.request.expectedModerationVersion,
        note: input.request.note ?? null,
        reason: input.request.reason,
      }),
    )
    .digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaAdminModerationRepository implements AdminModerationRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async mutateReport(input: {
    actorId: string;
    reportId: string;
    operation: ReportModerationOperation;
    request: AdminReportActionRequest;
    requestId: string;
  }): Promise<AdminModerationActionResponse> {
    const hash = payloadHash(input);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.adminIdempotencyRecord.findUnique({
          where: {
            actorId_operation_targetType_targetId_key: {
              actorId: input.actorId,
              operation: input.operation,
              targetType: 'REPORT',
              targetId: input.reportId,
              key: input.request.idempotencyKey,
            },
          },
          select: { payloadHash: true, resultSnapshot: true },
        });
        if (existing) {
          if (existing.payloadHash !== hash) {
            throw new AdminModerationIdempotencyConflictError();
          }
          return {
            ...adminModerationActionResponseSchema.parse(
              existing.resultSnapshot,
            ),
            replayed: true,
          };
        }

        const report = await transaction.pageReport.findUnique({
          where: { id: input.reportId },
          select: { id: true, status: true, moderationVersion: true },
        });
        if (
          !report ||
          report.moderationVersion !== input.request.expectedModerationVersion
        ) {
          throw new AdminModerationStaleVersionError();
        }

        const nextStatus =
          input.operation === 'REPORT_REVIEW'
            ? 'REVIEWED'
            : input.operation === 'REPORT_DISMISS'
              ? 'DISMISSED'
              : 'OPEN';
        const update = await transaction.pageReport.updateMany({
          where: {
            id: report.id,
            moderationVersion: input.request.expectedModerationVersion,
          },
          data: {
            status: nextStatus,
            moderationVersion: { increment: 1 },
          },
        });
        if (update.count !== 1) {
          throw new AdminModerationStaleVersionError();
        }

        const action = await transaction.moderationAction.create({
          data: {
            targetType: 'REPORT',
            targetId: report.id,
            reportId: report.id,
            actorId: input.actorId,
            actionType: input.operation,
            reasonCode: input.request.reason,
            note: input.request.note ?? null,
            previousState: report.status,
            resultingState: nextStatus,
            requestId: input.requestId,
          },
          select: { id: true },
        });
        const result: AdminModerationActionResponse = {
          actionId: action.id,
          targetType: 'REPORT',
          targetId: report.id,
          moderationVersion: input.request.expectedModerationVersion + 1,
          replayed: false,
        };
        await transaction.adminIdempotencyRecord.create({
          data: {
            actorId: input.actorId,
            operation: input.operation,
            targetType: 'REPORT',
            targetId: report.id,
            key: input.request.idempotencyKey,
            payloadHash: hash,
            resultSnapshot: result,
            outcome: 'SUCCESS',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        await transaction.auditEvent.create({
          data: {
            actorId: input.actorId,
            eventType:
              input.operation === 'REPORT_REVIEW'
                ? 'REPORT_REVIEWED'
                : input.operation === 'REPORT_DISMISS'
                  ? 'REPORT_DISMISSED'
                  : 'REPORT_REOPENED',
            targetType: 'REPORT',
            targetId: report.id,
            requestId: input.requestId,
            outcome: 'SUCCESS',
            metadata: { reasonCode: input.request.reason },
          },
        });
        return result;
      });
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.prisma.adminIdempotencyRecord.findUnique({
        where: {
          actorId_operation_targetType_targetId_key: {
            actorId: input.actorId,
            operation: input.operation,
            targetType: 'REPORT',
            targetId: input.reportId,
            key: input.request.idempotencyKey,
          },
        },
        select: { payloadHash: true, resultSnapshot: true },
      });
      if (!existing) throw error;
      if (existing.payloadHash !== hash) {
        throw new AdminModerationIdempotencyConflictError();
      }
      return {
        ...adminModerationActionResponseSchema.parse(existing.resultSnapshot),
        replayed: true,
      };
    }
  }
}
