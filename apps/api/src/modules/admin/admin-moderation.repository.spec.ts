import type { PrismaClient } from '@letterly/database';
import {
  AdminModerationIdempotencyConflictError,
  AdminModerationStaleVersionError,
  PrismaAdminModerationRepository,
} from './admin-moderation.repository';

function request(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    confirm: true as const,
    expectedModerationVersion: 2,
    reason: 'SPAM' as const,
    note: 'reviewed by admin',
    idempotencyKey: 'idem-1',
    ...overrides,
  };
}

describe('PrismaAdminModerationRepository', () => {
  function setup() {
    const tx = {
      adminIdempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      pageReport: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'report-1',
          status: 'OPEN',
          moderationVersion: 2,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      moderationAction: {
        create: jest
          .fn()
          .mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' }),
      },
      auditEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
        callback(tx),
      ),
      adminIdempotencyRecord: { findUnique: jest.fn() },
    };
    return {
      tx,
      prisma,
      repository: new PrismaAdminModerationRepository(
        prisma as unknown as PrismaClient,
      ),
    };
  }

  it('conditionally updates, records an action, idempotency, and audit event', async () => {
    const { tx, repository } = setup();

    await expect(
      repository.mutateReport({
        actorId: 'admin-1',
        reportId: 'report-1',
        operation: 'REPORT_DISMISS',
        request: request(),
        requestId: 'request-1',
      }),
    ).resolves.toEqual({
      actionId: '11111111-1111-4111-8111-111111111111',
      targetType: 'REPORT',
      targetId: 'report-1',
      moderationVersion: 3,
      replayed: false,
    });
    expect(tx.pageReport.updateMany).toHaveBeenCalledWith({
      where: { id: 'report-1', moderationVersion: 2 },
      data: { status: 'DISMISSED', moderationVersion: { increment: 1 } },
    });
    expect(tx.moderationAction.create).toHaveBeenCalled();
    expect(tx.adminIdempotencyRecord.create).toHaveBeenCalled();
    expect(tx.auditEvent.create).toHaveBeenCalled();
  });

  it('rejects stale moderation versions before writing an action', async () => {
    const { tx, repository } = setup();
    tx.pageReport.findUnique.mockResolvedValue({
      id: 'report-1',
      status: 'OPEN',
      moderationVersion: 3,
    });

    await expect(
      repository.mutateReport({
        actorId: 'admin-1',
        reportId: 'report-1',
        operation: 'REPORT_REVIEW',
        request: request(),
        requestId: 'request-1',
      }),
    ).rejects.toBeInstanceOf(AdminModerationStaleVersionError);
    expect(tx.moderationAction.create).not.toHaveBeenCalled();
  });

  it('replays an identical idempotency key and rejects a payload mismatch', async () => {
    const { tx, prisma, repository } = setup();
    const first = await repository.mutateReport({
      actorId: 'admin-1',
      reportId: 'report-1',
      operation: 'REPORT_DISMISS',
      request: request(),
      requestId: 'request-1',
    });
    const createCalls = tx.adminIdempotencyRecord.create.mock
      .calls as unknown as Array<
      [{ data: { payloadHash: string; resultSnapshot: object } }]
    >;
    const idempotencyData = createCalls[0][0].data;
    tx.adminIdempotencyRecord.findUnique.mockResolvedValue({
      payloadHash: idempotencyData.payloadHash,
      resultSnapshot: idempotencyData.resultSnapshot,
    });

    const replay = await repository.mutateReport({
      actorId: 'admin-1',
      reportId: 'report-1',
      operation: 'REPORT_DISMISS',
      request: request(),
      requestId: 'request-1',
    });
    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);

    tx.adminIdempotencyRecord.findUnique.mockResolvedValue({
      payloadHash: 'different',
      resultSnapshot: idempotencyData.resultSnapshot,
    });
    await expect(
      repository.mutateReport({
        actorId: 'admin-1',
        reportId: 'report-1',
        operation: 'REPORT_DISMISS',
        request: request(),
        requestId: 'request-1',
      }),
    ).rejects.toBeInstanceOf(AdminModerationIdempotencyConflictError);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
