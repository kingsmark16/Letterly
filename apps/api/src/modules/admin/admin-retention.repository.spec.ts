import type { PrismaClient } from '@letterly/database';
import { PrismaAdminRetentionRepository } from './admin-retention.repository';

describe('PrismaAdminRetentionRepository', () => {
  type MockTransaction = {
    queryRaw: jest.Mock;
    retentionClaim: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    appeal: { deleteMany: jest.Mock };
    moderationAction: { deleteMany: jest.Mock };
    pageReport: { deleteMany: jest.Mock };
    auditEvent: { deleteMany: jest.Mock };
    adminIdempotencyRecord: { deleteMany: jest.Mock };
  };

  function createRepository(): {
    repository: PrismaAdminRetentionRepository;
    prisma: {
      $transaction: jest.Mock;
      auditEvent: { create: jest.Mock };
    };
    transaction: MockTransaction;
  } {
    const transaction: MockTransaction = {
      queryRaw: jest.fn(),
      retentionClaim: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      appeal: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      moderationAction: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      pageReport: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      auditEvent: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      adminIdempotencyRecord: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({
          $queryRaw: transaction.queryRaw,
          ...transaction,
        }),
      ),
      auditEvent: { create: jest.fn().mockResolvedValue(undefined) },
    };
    return {
      repository: new PrismaAdminRetentionRepository(
        prisma as unknown as PrismaClient,
      ),
      prisma,
      transaction,
    };
  }

  it('uses one lease and does not delete when another worker owns it', async () => {
    const { repository, transaction } = createRepository();
    transaction.queryRaw.mockResolvedValueOnce([]);

    const result = await repository.run({
      now: new Date('2026-08-26T00:00:00.000Z'),
      retentionDays: 730,
      batchSize: 100,
    });

    expect(result).toEqual({ acquired: false, claimed: 0, deleted: 0 });
    expect(transaction.retentionClaim).toBeDefined();
    expect(transaction.queryRaw).toHaveBeenCalledTimes(1);
  });

  it('claims selected records before deleting them in dependency order', async () => {
    const { repository, transaction, prisma } = createRepository();
    transaction.queryRaw
      .mockResolvedValueOnce([{ id: 'lease' }])
      .mockResolvedValue([]);
    transaction.queryRaw.mockResolvedValueOnce([{ id: 'report-1' }]);
    transaction.queryRaw.mockResolvedValue([]);

    const result = await repository.run({
      now: new Date('2026-08-26T00:00:00.000Z'),
      retentionDays: 730,
      batchSize: 100,
    });

    expect(result.acquired).toBe(true);
    expect(result.claimed).toBeGreaterThan(0);
    expect(transaction.retentionClaim.createMany).toHaveBeenCalled();
    expect(transaction.appeal.deleteMany).toHaveBeenCalled();
    expect(transaction.moderationAction.deleteMany).toHaveBeenCalled();
    expect(transaction.pageReport.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['report-1'] } },
    });
    expect(prisma.auditEvent.create).not.toHaveBeenCalled();
  });

  it('records a bounded failure when the transaction fails', async () => {
    const { repository, transaction, prisma } = createRepository();
    transaction.queryRaw.mockRejectedValueOnce({ code: 'ETIMEDOUT' });
    const now = new Date('2026-08-26T00:00:00.000Z');

    await expect(
      repository.run({ now, retentionDays: 730, batchSize: 100 }),
    ).rejects.toMatchObject({ code: 'ETIMEDOUT' });
    const calls = prisma.auditEvent.create.mock.calls as unknown[][];
    const failureCall = calls[0]?.[0] as { data?: unknown } | undefined;
    expect(failureCall?.data).toMatchObject({
      eventType: 'RETENTION_FAILED',
      outcome: 'FAILURE',
      metadata: { failureCode: 'DB_TIMEOUT' },
    });
  });

  it('preserves the transaction error when the failure audit is unavailable', async () => {
    const { repository, transaction, prisma } = createRepository();
    const failure = { code: 'ETIMEDOUT', message: 'database unavailable' };
    transaction.queryRaw.mockRejectedValueOnce(failure);
    prisma.auditEvent.create.mockRejectedValueOnce({
      code: 'P1001',
      message: 'database unavailable',
    });

    await expect(
      repository.run({
        now: new Date('2026-08-26T00:00:00.000Z'),
        retentionDays: 730,
        batchSize: 100,
      }),
    ).rejects.toBe(failure);
  });
});
