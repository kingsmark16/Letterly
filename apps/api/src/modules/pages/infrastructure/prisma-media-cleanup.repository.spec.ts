import type { PrismaClient } from '@letterly/database';
import { PrismaMediaCleanupRepository } from './prisma-media-cleanup.repository';

describe('PrismaMediaCleanupRepository', () => {
  const prisma = {
    mediaCleanup: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const repository = new PrismaMediaCleanupRepository(
    prisma as unknown as PrismaClient,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
  });

  it('AC-12 claims a cleanup task with a lease and does not claim a losing row', async () => {
    const now = new Date('2026-08-11T01:00:00.000Z');
    const leaseExpiresAt = new Date('2026-08-11T01:05:00.000Z');
    prisma.mediaCleanup.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        objectKey: 'pages/page-1/images/image-1.webp',
        status: 'PENDING',
        attempts: 0,
        nextRetryAt: null,
        lastFailureCode: null,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    ]);
    prisma.mediaCleanup.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.claimCleanupTasks({
      now,
      workerId: 'worker-1',
      leaseExpiresAt,
      limit: 50,
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
        leaseOwner: 'worker-1',
        leaseExpiresAt,
      }),
    ]);
  });
  it('does not claim a task whose lease was won by another worker', async () => {
    prisma.mediaCleanup.findMany.mockResolvedValue([{ id: 'task-1' }]);
    prisma.mediaCleanup.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await repository.claimCleanupTasks({
        now: new Date(),
        workerId: 'worker-1',
        leaseExpiresAt: new Date(),
        limit: 1,
      }),
    ).toEqual([]);
  });

  it('restricts successful deletion to the claiming worker', async () => {
    await repository.markCleanupSucceeded({
      taskId: 'task-1',
      workerId: 'worker-1',
    });
    expect(prisma.mediaCleanup.deleteMany).toHaveBeenCalledWith({
      where: { id: 'task-1', status: 'PENDING', leaseOwner: 'worker-1' },
    });
  });

  it('does not update a failure after lease ownership is lost', async () => {
    prisma.mediaCleanup.findFirst.mockResolvedValue(null);
    await repository.markCleanupFailed({
      taskId: 'task-1',
      workerId: 'worker-1',
      now: new Date(),
      failureCode: 'DELETE_FAILED',
    });
    expect(prisma.mediaCleanup.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    {
      attempts: 0,
      status: 'PENDING',
      nextRetryAt: new Date('2026-10-05T00:01:00Z'),
    },
    { attempts: 4, status: 'REVIEW', nextRetryAt: null },
  ])(
    'retains retry policy after $attempts earlier attempts',
    async ({ attempts, status, nextRetryAt }) => {
      prisma.mediaCleanup.findFirst.mockResolvedValue({ attempts });
      await repository.markCleanupFailed({
        taskId: 'task-1',
        workerId: 'worker-1',
        now: new Date('2026-10-05T00:00:00Z'),
        failureCode: 'DELETE_FAILED',
      });
      expect(prisma.mediaCleanup.updateMany).toHaveBeenCalledWith({
        where: { id: 'task-1', status: 'PENDING', leaseOwner: 'worker-1' },
        data: {
          status,
          attempts: attempts + 1,
          nextRetryAt,
          lastFailureCode: 'DELETE_FAILED',
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 30000,
        timeout: 30000,
      });
    },
  );
});
