import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import type {
  AdminAppealCreateRequest,
  AdminAppealDecisionRequest,
  AdminAppealResponse,
  AdminModerationActionResponse,
  AdminPageDisableRequest,
  AdminPageModerationResponse,
  AdminPageRestoreRequest,
  AdminReportActionRequest,
  AdminUserDisableRequest,
  AdminUserModerationResponse,
  AdminUserRestoreRequest,
} from '@letterly/contracts';
import {
  adminAppealResponseSchema,
  adminModerationActionResponseSchema,
  adminPageModerationResponseSchema,
  adminUserModerationResponseSchema,
} from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

export const ADMIN_MODERATION_REPOSITORY = Symbol(
  'ADMIN_MODERATION_REPOSITORY',
);

type AdminTransaction = Parameters<PrismaClient['$transaction']>[0] extends (
  transaction: infer Transaction,
) => unknown
  ? Transaction
  : never;

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

export class AdminModerationNotFoundError extends Error {
  constructor() {
    super('Moderation target not found');
  }
}

export class AdminProtectedTargetError extends Error {
  constructor() {
    super('Target cannot be disabled');
  }
}

export class AdminAppealTransitionError extends Error {
  constructor() {
    super('Appeal transition is not valid');
  }
}

export class AdminModerationTransitionError extends Error {
  constructor() {
    super('Moderation transition is not valid');
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
  mutatePage(input: {
    actorId: string;
    pageId: string;
    operation: 'PAGE_DISABLE' | 'PAGE_RESTORE';
    request: AdminPageDisableRequest | AdminPageRestoreRequest;
    requestId: string;
  }): Promise<AdminPageModerationResponse>;
  mutateUser(input: {
    actorId: string;
    userId: string;
    operation: 'USER_DISABLE' | 'USER_RESTORE';
    request: AdminUserDisableRequest | AdminUserRestoreRequest;
    requestId: string;
  }): Promise<AdminUserModerationResponse>;
  createAppeal(input: {
    actorId: string;
    request: AdminAppealCreateRequest;
    requestId: string;
  }): Promise<AdminAppealResponse>;
  mutateAppeal(input: {
    actorId: string;
    appealId: string;
    operation: 'APPEAL_ACCEPT' | 'APPEAL_REJECT';
    request: AdminAppealDecisionRequest;
    requestId: string;
  }): Promise<AdminAppealResponse>;
}

function payloadHash(input: { operation: string; request: unknown }): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        operation: input.operation,
        confirm: (input.request as { confirm?: unknown }).confirm,
        expectedModerationVersion: (
          input.request as { expectedModerationVersion?: unknown }
        ).expectedModerationVersion,
        note: (input.request as { note?: unknown }).note ?? null,
        reason: (input.request as { reason?: unknown }).reason,
      }),
    )
    .digest('hex');
}

function idempotencyKey(input: {
  actorId: string;
  operation: string;
  targetType: 'PAGE' | 'USER' | 'REPORT' | 'APPEAL';
  targetId: string;
  key: string;
}) {
  return {
    actorId_operation_targetType_targetId_key: {
      actorId: input.actorId,
      operation: input.operation,
      targetType: input.targetType,
      targetId: input.targetId,
      key: input.key,
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

type AdminTargetType = 'PAGE' | 'USER' | 'APPEAL';

function targetTypeForOperation(operation: string): AdminTargetType {
  if (operation.startsWith('PAGE')) return 'PAGE';
  if (operation.startsWith('USER')) return 'USER';
  return 'APPEAL';
}

function replayTargetSnapshot(
  targetType: AdminTargetType,
  resultSnapshot: unknown,
): object {
  const parsed =
    targetType === 'PAGE'
      ? adminPageModerationResponseSchema.parse(resultSnapshot)
      : targetType === 'USER'
        ? adminUserModerationResponseSchema.parse(resultSnapshot)
        : adminAppealResponseSchema.parse(resultSnapshot);
  return { ...parsed, replayed: true };
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
            ...idempotencyKey({
              actorId: input.actorId,
              operation: input.operation,
              targetType: 'REPORT',
              targetId: input.reportId,
              key: input.request.idempotencyKey,
            }),
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
        if (!report) {
          throw new AdminModerationNotFoundError();
        }
        if (
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
        const repeated = report.status === nextStatus;
        const validTransition =
          (report.status === 'OPEN' &&
            (input.operation === 'REPORT_REVIEW' ||
              input.operation === 'REPORT_DISMISS')) ||
          ((report.status === 'REVIEWED' || report.status === 'DISMISSED') &&
            input.operation === 'REPORT_REOPEN');
        if (!repeated && !validTransition) {
          throw new AdminModerationTransitionError();
        }
        if (repeated) {
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
              resultingState: report.status,
              requestId: input.requestId,
            },
            select: { id: true },
          });
          const result: AdminModerationActionResponse = {
            actionId: action.id,
            targetType: 'REPORT',
            targetId: report.id,
            moderationVersion: report.moderationVersion,
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
        }
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
          ...idempotencyKey({
            actorId: input.actorId,
            operation: input.operation,
            targetType: 'REPORT',
            targetId: input.reportId,
            key: input.request.idempotencyKey,
          }),
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

  async mutatePage(input: {
    actorId: string;
    pageId: string;
    operation: 'PAGE_DISABLE' | 'PAGE_RESTORE';
    request: AdminPageDisableRequest | AdminPageRestoreRequest;
    requestId: string;
  }): Promise<AdminPageModerationResponse> {
    const hash = payloadHash(input);
    return this.mutateTargetWithTransaction(
      { ...input, targetId: input.pageId },
      hash,
      async (transaction) => {
        const page = await transaction.page.findUnique({
          where: { id: input.pageId },
          select: { id: true, moderationStatus: true, moderationVersion: true },
        });
        if (!page) throw new AdminModerationNotFoundError();
        if (
          page.moderationVersion !== input.request.expectedModerationVersion
        ) {
          throw new AdminModerationStaleVersionError();
        }
        const nextStatus =
          input.operation === 'PAGE_DISABLE' ? 'DISABLED' : 'ACTIVE';
        const repeated = page.moderationStatus === nextStatus;
        if (
          !repeated &&
          ((page.moderationStatus === 'ACTIVE' &&
            input.operation !== 'PAGE_DISABLE') ||
            (page.moderationStatus === 'DISABLED' &&
              input.operation !== 'PAGE_RESTORE'))
        ) {
          throw new AdminModerationTransitionError();
        }
        if (repeated) {
          const action = await transaction.moderationAction.create({
            data: {
              targetType: 'PAGE',
              targetId: page.id,
              pageId: page.id,
              actorId: input.actorId,
              actionType: input.operation,
              reasonCode:
                (input.request as { reason?: string }).reason ?? 'OTHER',
              note: input.request.note ?? null,
              previousState: page.moderationStatus,
              resultingState: page.moderationStatus,
              requestId: input.requestId,
            },
            select: { id: true },
          });
          const result: AdminPageModerationResponse = {
            actionId: action.id,
            targetType: 'PAGE',
            targetId: page.id,
            moderationStatus: page.moderationStatus,
            moderationVersion: page.moderationVersion,
            replayed: false,
          };
          await this.recordIdempotencyAndAudit(
            transaction,
            { ...input, targetId: input.pageId },
            'PAGE',
            page.id,
            hash,
            result,
            input.operation === 'PAGE_DISABLE'
              ? 'PAGE_DISABLED'
              : 'PAGE_RESTORED',
          );
          return result;
        }
        const update = await transaction.page.updateMany({
          where: {
            id: page.id,
            moderationVersion: input.request.expectedModerationVersion,
          },
          data: {
            moderationStatus: nextStatus,
            moderationVersion: { increment: 1 },
            disabledAt: nextStatus === 'DISABLED' ? new Date() : null,
            disabledReason:
              nextStatus === 'DISABLED'
                ? (input.request as AdminPageDisableRequest).reason
                : null,
          },
        });
        if (update.count !== 1) throw new AdminModerationStaleVersionError();
        const action = await transaction.moderationAction.create({
          data: {
            targetType: 'PAGE',
            targetId: page.id,
            pageId: page.id,
            actorId: input.actorId,
            actionType: input.operation,
            reasonCode:
              (input.request as { reason?: string }).reason ?? 'OTHER',
            note: input.request.note ?? null,
            previousState: page.moderationStatus,
            resultingState: nextStatus,
            requestId: input.requestId,
          },
          select: { id: true },
        });
        const result: AdminPageModerationResponse = {
          actionId: action.id,
          targetType: 'PAGE',
          targetId: page.id,
          moderationStatus: nextStatus,
          moderationVersion: input.request.expectedModerationVersion + 1,
          replayed: false,
        };
        await this.recordIdempotencyAndAudit(
          transaction,
          { ...input, targetId: input.pageId },
          'PAGE',
          page.id,
          hash,
          result,
          input.operation === 'PAGE_DISABLE'
            ? 'PAGE_DISABLED'
            : 'PAGE_RESTORED',
        );
        return result;
      },
    );
  }

  async mutateUser(input: {
    actorId: string;
    userId: string;
    operation: 'USER_DISABLE' | 'USER_RESTORE';
    request: AdminUserDisableRequest | AdminUserRestoreRequest;
    requestId: string;
  }): Promise<AdminUserModerationResponse> {
    const hash = payloadHash(input);
    return this.mutateTargetWithTransaction(
      { ...input, targetId: input.userId },
      hash,
      async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { id: input.userId },
          select: {
            id: true,
            role: true,
            moderationStatus: true,
            moderationVersion: true,
          },
        });
        if (!user) throw new AdminModerationNotFoundError();
        if (
          user.moderationVersion !== input.request.expectedModerationVersion
        ) {
          throw new AdminModerationStaleVersionError();
        }
        if (
          input.operation === 'USER_DISABLE' &&
          input.userId === input.actorId
        ) {
          throw new AdminProtectedTargetError();
        }
        if (input.operation === 'USER_DISABLE' && user.role === 'ADMIN') {
          const activeAdmins = await transaction.user.count({
            where: { role: 'ADMIN', moderationStatus: 'ACTIVE' },
          });
          if (activeAdmins <= 1) throw new AdminProtectedTargetError();
        }
        const nextStatus =
          input.operation === 'USER_DISABLE' ? 'DISABLED' : 'ACTIVE';
        const repeated = user.moderationStatus === nextStatus;
        if (
          !repeated &&
          ((user.moderationStatus === 'ACTIVE' &&
            input.operation !== 'USER_DISABLE') ||
            (user.moderationStatus === 'DISABLED' &&
              input.operation !== 'USER_RESTORE'))
        ) {
          throw new AdminModerationTransitionError();
        }
        if (repeated) {
          const action = await transaction.moderationAction.create({
            data: {
              targetType: 'USER',
              targetId: user.id,
              userId: user.id,
              actorId: input.actorId,
              actionType: input.operation,
              reasonCode:
                (input.request as { reason?: string }).reason ?? 'OTHER',
              note: input.request.note ?? null,
              previousState: user.moderationStatus,
              resultingState: user.moderationStatus,
              requestId: input.requestId,
            },
            select: { id: true },
          });
          const result: AdminUserModerationResponse = {
            actionId: action.id,
            targetType: 'USER',
            targetId: user.id,
            moderationStatus: user.moderationStatus,
            moderationVersion: user.moderationVersion,
            revokedSessionCount: 0,
            replayed: false,
          };
          await this.recordIdempotencyAndAudit(
            transaction,
            { ...input, targetId: input.userId },
            'USER',
            user.id,
            hash,
            result,
            input.operation === 'USER_DISABLE'
              ? 'USER_DISABLED'
              : 'USER_RESTORED',
          );
          return result;
        }
        const revokedSessionCount =
          input.operation === 'USER_DISABLE'
            ? (
                await transaction.session.deleteMany({
                  where: { userId: user.id },
                })
              ).count
            : 0;
        const update = await transaction.user.updateMany({
          where: {
            id: user.id,
            moderationVersion: input.request.expectedModerationVersion,
          },
          data: {
            moderationStatus: nextStatus,
            moderationVersion: { increment: 1 },
            disabledAt: nextStatus === 'DISABLED' ? new Date() : null,
            disabledReason:
              nextStatus === 'DISABLED'
                ? (input.request as AdminUserDisableRequest).reason
                : null,
          },
        });
        if (update.count !== 1) throw new AdminModerationStaleVersionError();
        const action = await transaction.moderationAction.create({
          data: {
            targetType: 'USER',
            targetId: user.id,
            userId: user.id,
            actorId: input.actorId,
            actionType: input.operation,
            reasonCode:
              (input.request as { reason?: string }).reason ?? 'OTHER',
            note: input.request.note ?? null,
            previousState: user.moderationStatus,
            resultingState: nextStatus,
            requestId: input.requestId,
          },
          select: { id: true },
        });
        const result: AdminUserModerationResponse = {
          actionId: action.id,
          targetType: 'USER',
          targetId: user.id,
          moderationStatus: nextStatus,
          moderationVersion: input.request.expectedModerationVersion + 1,
          revokedSessionCount,
          replayed: false,
        };
        await this.recordIdempotencyAndAudit(
          transaction,
          { ...input, targetId: input.userId },
          'USER',
          user.id,
          hash,
          result,
          input.operation === 'USER_DISABLE'
            ? 'USER_DISABLED'
            : 'USER_RESTORED',
        );
        return result;
      },
    );
  }

  async createAppeal(input: {
    actorId: string;
    request: AdminAppealCreateRequest;
    requestId: string;
  }): Promise<AdminAppealResponse> {
    const targetId = input.request.targetActionId;
    const hash = payloadHash({
      operation: 'APPEAL_CREATE',
      request: input.request,
    });
    return this.mutateTargetWithTransaction(
      { ...input, operation: 'APPEAL_CREATE', targetId },
      hash,
      async (transaction) => {
        const original = await transaction.moderationAction.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        if (!original) throw new AdminModerationNotFoundError();
        const existingAppeal = await transaction.appeal.findUnique({
          where: { originalActionId: targetId },
          select: { id: true },
        });
        if (existingAppeal) throw new AdminAppealTransitionError();
        const appeal = await transaction.appeal.create({
          data: {
            originalActionId: targetId,
            externalReference: input.request.externalReference,
            reasonCode: input.request.reasonCode,
          },
          select: { id: true, moderationVersion: true, status: true },
        });
        const action = await transaction.moderationAction.create({
          data: {
            targetType: 'APPEAL',
            targetId: appeal.id,
            appealId: appeal.id,
            actorId: input.actorId,
            actionType: 'APPEAL_CREATE',
            reasonCode: input.request.reasonCode,
            note: null,
            previousState: 'NONE',
            resultingState: 'REQUESTED',
            requestId: input.requestId,
          },
          select: { id: true },
        });
        const result: AdminAppealResponse = {
          appealId: appeal.id,
          targetType: 'APPEAL',
          targetId: appeal.id,
          status: appeal.status,
          moderationVersion: appeal.moderationVersion,
          actionId: action.id,
          replayed: false,
        };
        await this.recordIdempotencyAndAudit(
          transaction,
          { ...input, operation: 'APPEAL_CREATE', targetId },
          'APPEAL',
          targetId,
          hash,
          result,
          'APPEAL_CREATED',
        );
        return result;
      },
    );
  }

  async mutateAppeal(input: {
    actorId: string;
    appealId: string;
    operation: 'APPEAL_ACCEPT' | 'APPEAL_REJECT';
    request: AdminAppealDecisionRequest;
    requestId: string;
  }): Promise<AdminAppealResponse> {
    const hash = payloadHash(input);
    return this.mutateTargetWithTransaction(
      { ...input, targetId: input.appealId },
      hash,
      async (transaction) => {
        const appeal = await transaction.appeal.findUnique({
          where: { id: input.appealId },
          select: { id: true, status: true, moderationVersion: true },
        });
        if (!appeal) throw new AdminModerationNotFoundError();
        if (
          appeal.moderationVersion !== input.request.expectedModerationVersion
        )
          throw new AdminModerationStaleVersionError();
        if (appeal.status !== 'REQUESTED')
          throw new AdminAppealTransitionError();
        const nextStatus =
          input.operation === 'APPEAL_ACCEPT' ? 'ACCEPTED' : 'REJECTED';
        const update = await transaction.appeal.updateMany({
          where: {
            id: appeal.id,
            moderationVersion: input.request.expectedModerationVersion,
          },
          data: {
            status: nextStatus,
            moderationVersion: { increment: 1 },
            resolvedAt: new Date(),
            resolvedById: input.actorId,
          },
        });
        if (update.count !== 1) throw new AdminModerationStaleVersionError();
        const action = await transaction.moderationAction.create({
          data: {
            targetType: 'APPEAL',
            targetId: appeal.id,
            appealId: appeal.id,
            actorId: input.actorId,
            actionType: input.operation,
            reasonCode: 'OTHER',
            note: input.request.note ?? null,
            previousState: appeal.status,
            resultingState: nextStatus,
            requestId: input.requestId,
          },
          select: { id: true },
        });
        const result: AdminAppealResponse = {
          appealId: appeal.id,
          targetType: 'APPEAL',
          targetId: appeal.id,
          status: nextStatus,
          moderationVersion: input.request.expectedModerationVersion + 1,
          actionId: action.id,
          replayed: false,
        };
        await this.recordIdempotencyAndAudit(
          transaction,
          { ...input, targetId: input.appealId },
          'APPEAL',
          appeal.id,
          hash,
          result,
          input.operation === 'APPEAL_ACCEPT'
            ? 'APPEAL_ACCEPTED'
            : 'APPEAL_REJECTED',
        );
        return result;
      },
    );
  }

  private async mutateTargetWithTransaction<T>(
    input: {
      actorId: string;
      operation: string;
      targetId: string;
      request: { idempotencyKey: string };
    },
    hash: string,
    callback: (transaction: AdminTransaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const targetType = targetTypeForOperation(input.operation);
        const existing = await transaction.adminIdempotencyRecord.findUnique({
          where: idempotencyKey({
            actorId: input.actorId,
            operation: input.operation,
            targetType,
            targetId: input.targetId,
            key: input.request.idempotencyKey,
          }),
          select: { payloadHash: true, resultSnapshot: true },
        });
        if (existing) {
          if (existing.payloadHash !== hash)
            throw new AdminModerationIdempotencyConflictError();
          const snapshot = existing.resultSnapshot as T;
          return { ...snapshot, replayed: true };
        }
        return callback(transaction);
      });
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error;
      const targetType = targetTypeForOperation(input.operation);
      const existing = await this.prisma.adminIdempotencyRecord.findUnique({
        where: idempotencyKey({
          actorId: input.actorId,
          operation: input.operation,
          targetType,
          targetId: input.targetId,
          key: input.request.idempotencyKey,
        }),
        select: { payloadHash: true, resultSnapshot: true },
      });
      if (!existing) throw error;
      if (existing.payloadHash !== hash) {
        throw new AdminModerationIdempotencyConflictError();
      }
      return replayTargetSnapshot(targetType, existing.resultSnapshot) as T;
    }
  }

  private async recordIdempotencyAndAudit(
    transaction: AdminTransaction,
    input: {
      actorId: string;
      operation: string;
      targetId: string;
      request: { idempotencyKey: string };
      requestId: string;
    },
    targetType: 'PAGE' | 'USER' | 'APPEAL',
    idempotencyTargetId: string,
    hash: string,
    result: object,
    eventType:
      | 'PAGE_DISABLED'
      | 'PAGE_RESTORED'
      | 'USER_DISABLED'
      | 'USER_RESTORED'
      | 'APPEAL_CREATED'
      | 'APPEAL_ACCEPTED'
      | 'APPEAL_REJECTED',
  ): Promise<void> {
    await transaction.adminIdempotencyRecord.create({
      data: {
        actorId: input.actorId,
        operation: input.operation,
        targetType,
        targetId: idempotencyTargetId,
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
        eventType,
        targetType,
        targetId: input.targetId,
        requestId: input.requestId,
        outcome: 'SUCCESS',
        metadata: {},
      },
    });
  }
}
