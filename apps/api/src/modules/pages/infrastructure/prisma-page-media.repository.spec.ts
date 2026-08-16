jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageMediaRepository } from './prisma-page-media.repository';

type PrismaMock = {
  page: { findFirst: jest.Mock };
  pageImage: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  mediaCleanup: {
    findMany: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    page: { findFirst: jest.fn() },
    pageImage: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    mediaCleanup: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
}

function createMediaRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    pageId: 'page-1',
    state: 'READY' as const,
    attachedAt: null,
    storageKey: 'pages/page-1/images/image-1.webp',
    sourceStorageKey: null,
    sourceMimeType: 'image/png',
    sourceByteSize: 1024,
    sourceSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    outputByteSize: 512,
    outputSha256: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    width: 640,
    height: 480,
    sortOrder: null,
    caption: null,
    failureCode: null,
    processingLeaseExpiresAt: null,
    uploadExpiresAt: new Date('2026-08-11T01:00:00.000Z'),
    expiresAt: new Date('2026-08-12T00:00:00.000Z'),
    ...overrides,
  };
}

describe('PrismaPageMediaRepository', () => {
  let prisma: PrismaMock;
  let repository: PrismaPageMediaRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: PrismaMock) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: 'page-1' }]);
    repository = new PrismaPageMediaRepository(
      prisma as unknown as PrismaClient,
    );
  });

  it('AC-12 records cleanup before deleting expired unready images', async () => {
    const now = new Date('2026-08-11T01:00:00.000Z');
    prisma.pageImage.findMany.mockResolvedValue([
      {
        id: '11111111-1111-4111-8111-111111111111',
        storageKey: 'pages/page-1/images/image-1.webp',
        sourceStorageKey: 'pages/page-1/sources/image-1',
      },
    ]);

    await repository.expireImages({ now });

    expect(prisma.mediaCleanup.createMany.mock.calls).toEqual([
      [
        {
          data: [
            {
              objectKey: 'pages/page-1/images/image-1.webp',
              nextRetryAt: now,
            },
            {
              objectKey: 'pages/page-1/sources/image-1',
              nextRetryAt: now,
            },
          ],
          skipDuplicates: true,
        },
      ],
    ]);
    expect(prisma.pageImage.deleteMany.mock.calls).toEqual([
      [
        {
          where: {
            id: { in: ['11111111-1111-4111-8111-111111111111'] },
            attachedAt: null,
            expiresAt: { lte: now },
          },
        },
      ],
    ]);
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

  it('AC-11 does not let a stale completion mark a retried source failed', async () => {
    prisma.pageImage.findFirst.mockResolvedValue({
      state: 'UPLOADING',
      storageKey: null,
      sourceStorageKey: 'pages/page-1/sources/new-source',
    });

    await repository.markImageFailed({
      creatorId: 'creator-1',
      pageId: 'page-1',
      imageId: '11111111-1111-4111-8111-111111111111',
      failureCode: 'INVALID_IMAGE',
      expectedSourceStorageKey: 'pages/page-1/sources/old-source',
      cleanupKeys: ['pages/page-1/images/old-output.webp'],
    });

    expect(prisma.mediaCleanup.createMany.mock.calls).toHaveLength(0);
    expect(prisma.pageImage.updateMany.mock.calls).toHaveLength(0);
  });

  it('AC-12 does not retry an image that changed after the initial read', async () => {
    prisma.pageImage.findFirst.mockResolvedValue(createMediaRecord());
    prisma.pageImage.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.retryImage({
        creatorId: 'creator-1',
        pageId: 'page-1',
        imageId: '11111111-1111-4111-8111-111111111111',
        sourceStorageKey: 'pages/page-1/sources/new-source',
        uploadExpiresAt: new Date('2026-08-11T02:00:00.000Z'),
        expiresAt: new Date('2026-08-12T01:00:00.000Z'),
      }),
    ).resolves.toEqual({ type: 'unavailable' });

    expect(prisma.mediaCleanup.createMany).not.toHaveBeenCalled();
  });

  it('AC-11 does not claim an expired unready image before cleanup runs', async () => {
    const now = new Date('2026-08-11T01:00:00.000Z');
    const expired = createMediaRecord({
      state: 'UPLOADING',
      expiresAt: new Date('2026-08-11T00:59:59.000Z'),
    });
    prisma.pageImage.findFirst.mockResolvedValue(expired);
    prisma.pageImage.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageImage.findUnique.mockResolvedValue(expired);

    await expect(
      repository.claimImage({
        creatorId: 'creator-1',
        pageId: 'page-1',
        imageId: expired.id,
        now,
        leaseExpiresAt: new Date('2026-08-11T01:03:00.000Z'),
      }),
    ).resolves.toEqual({ type: 'not_found' });

    expect(prisma.pageImage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        }),
      }),
    );
    expect(prisma.pageImage.updateMany).not.toHaveBeenCalled();
  });

  it('AC-5 preserves an image that becomes attached before removal', async () => {
    prisma.pageImage.findFirst
      .mockResolvedValueOnce(createMediaRecord())
      .mockResolvedValueOnce(createMediaRecord({ attachedAt: new Date() }));
    prisma.pageImage.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.removeImage({
        creatorId: 'creator-1',
        pageId: 'page-1',
        imageId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toEqual({ type: 'attached' });

    expect(prisma.mediaCleanup.createMany).not.toHaveBeenCalled();
  });

  it('AC-7 does not stream an expired unattached ready image', async () => {
    prisma.pageImage.findFirst.mockResolvedValue(null);

    await expect(
      repository.getOwnerImage({
        creatorId: 'creator-1',
        pageId: 'page-1',
        imageId: '11111111-1111-4111-8111-111111111111',
      }),
    ).resolves.toBeNull();

    expect(prisma.pageImage.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { attachedAt: { not: null } },
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ],
        }),
      }),
    );
  });
});
