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
      page: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'page-1',
          moderationStatus: 'ACTIVE',
          moderationVersion: 2,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: 'CREATOR',
          moderationStatus: 'ACTIVE',
          moderationVersion: 2,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(2),
      },
      session: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      appeal: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          moderationVersion: 0,
          status: 'REQUESTED',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      moderationAction: {
        create: jest
          .fn()
          .mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'action-1' }),
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

  it('disables a page and records its moderation version', async () => {
    const { tx, repository } = setup();
    await expect(
      repository.mutatePage({
        actorId: 'admin-1',
        pageId: 'page-1',
        operation: 'PAGE_DISABLE',
        request: {
          confirm: true,
          expectedModerationVersion: 2,
          reason: 'SPAM',
          idempotencyKey: 'page-idem',
        },
        requestId: 'request-2',
      }),
    ).resolves.toMatchObject({
      targetType: 'PAGE',
      moderationStatus: 'DISABLED',
      moderationVersion: 3,
    });
    expect(tx.page.updateMany).toHaveBeenCalled();
  });

  it('protects the last active administrator from disable', async () => {
    const { tx, repository } = setup();
    tx.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      role: 'ADMIN',
      moderationStatus: 'ACTIVE',
      moderationVersion: 2,
    });
    tx.user.count.mockResolvedValue(1);
    await expect(
      repository.mutateUser({
        actorId: 'admin-2',
        userId: 'admin-1',
        operation: 'USER_DISABLE',
        request: {
          confirm: true,
          expectedModerationVersion: 2,
          reason: 'OTHER',
          idempotencyKey: 'user-idem',
        },
        requestId: 'request-3',
      }),
    ).rejects.toThrow('Target cannot be disabled');
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
});
