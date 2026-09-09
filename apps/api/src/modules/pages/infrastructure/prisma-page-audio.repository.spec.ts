jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageAudioRepository } from './prisma-page-audio.repository';

type CleanupUpsertArgs = {
  where: { objectKey: string };
  create: { objectKey: string; nextRetryAt?: Date };
  update: Record<string, unknown>;
};

type PageAudioCreateArgs = {
  data: {
    id: string;
    pageId: string;
    state: string;
    sourceStorageKey: string;
    [key: string]: unknown;
  };
  select: Record<string, unknown>;
};

type PrismaMock = {
  page: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  pageAudio: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
  mediaCleanup: {
    create: jest.Mock;
    upsert: jest.Mock<Promise<object>, [CleanupUpsertArgs]>;
  };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  return {
    page: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pageAudio: {
      findFirst: jest.fn(),
      create: jest.fn<unknown, [PageAudioCreateArgs]>(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    mediaCleanup: {
      create: jest.fn(),
      upsert: jest.fn<Promise<object>, [CleanupUpsertArgs]>(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
}

describe('PrismaPageAudioRepository', () => {
  let prisma: PrismaMock;
  let repository: PrismaPageAudioRepository;

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(
      async (callback: (transaction: PrismaMock) => Promise<unknown>) =>
        callback(prisma),
    );
    prisma.$queryRaw.mockResolvedValue([{ id: 'page-1' }]);
    prisma.pageAudio.findFirst.mockResolvedValue({
      id: 'new-audio',
      pageId: 'page-1',
      state: 'VERIFYING',
      sourceStorageKey: 'pages/page-1/audio/new-audio',
      sourceMimeType: 'audio/mpeg',
      displayTitle: 'Our song',
      sourceByteSize: 1024,
      sourceSha256: 'checksum',
      durationMilliseconds: null,
      rightsConfirmedAt: new Date(),
      rightsStatementVersion: '2026-09-08',
      failureCode: null,
      processingLeaseExpiresAt: new Date(),
      uploadExpiresAt: new Date(),
      expiresAt: new Date(),
    });
    prisma.page.findFirst.mockResolvedValue({ currentAudioId: 'old-audio' });
    prisma.pageAudio.update.mockResolvedValue({});
    prisma.page.update.mockResolvedValue({});
    prisma.pageAudio.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageAudio.findUnique.mockResolvedValue({
      sourceStorageKey: 'pages/page-1/audio/old-audio',
    });
    prisma.mediaCleanup.create.mockResolvedValue({});
    prisma.mediaCleanup.upsert.mockResolvedValue({});
    repository = new PrismaPageAudioRepository(
      prisma as unknown as PrismaClient,
    );
  });

  it('AC-11 locks the page before replacing its current audio track', async () => {
    await repository.markAudioReady({
      creatorId: 'creator-1',
      pageId: 'page-1',
      audioId: 'new-audio',
      expectedSourceStorageKey: 'pages/page-1/audio/new-audio',
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.pageAudio.findFirst.mock.invocationCallOrder[0],
    );
    expect(prisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { currentAudioId: 'new-audio' },
    });
    expect(prisma.mediaCleanup.create).toHaveBeenCalledWith({
      data: { objectKey: 'pages/page-1/audio/old-audio' },
    });
  });

  it('AC-11 locks the page before removing its current audio track', async () => {
    prisma.page.findFirst.mockResolvedValueOnce({
      currentAudio: {
        id: 'old-audio',
        pageId: 'page-1',
        state: 'READY',
        sourceStorageKey: 'pages/page-1/audio/old-audio',
        sourceMimeType: 'audio/mpeg',
        displayTitle: 'Our song',
        sourceByteSize: 1024,
        sourceSha256: 'checksum',
        durationMilliseconds: null,
        rightsConfirmedAt: new Date(),
        rightsStatementVersion: '2026-09-08',
        failureCode: null,
        processingLeaseExpiresAt: null,
        uploadExpiresAt: new Date(),
        expiresAt: null,
      },
    });

    await repository.removeCurrentAudio({
      creatorId: 'creator-1',
      pageId: 'page-1',
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.page.findFirst.mock.invocationCallOrder[0],
    );
    expect(prisma.page.update).toHaveBeenCalledWith({
      where: { id: 'page-1' },
      data: { currentAudioId: null },
    });
    expect(prisma.mediaCleanup.upsert).toHaveBeenCalledWith({
      where: { objectKey: 'pages/page-1/audio/old-audio' },
      create: { objectKey: 'pages/page-1/audio/old-audio' },
      update: {},
    });
  });

  it('AC-6 creates a new retry record and queues the failed source for cleanup', async () => {
    const failedAudio = {
      id: 'old-audio',
      pageId: 'page-1',
      state: 'FAILED',
      sourceStorageKey: 'pages/page-1/audio/old-audio',
      sourceMimeType: 'audio/mpeg',
      displayTitle: 'Our song',
      sourceByteSize: 1024,
      sourceSha256: 'checksum',
      durationMilliseconds: null,
      rightsConfirmedAt: new Date(),
      rightsStatementVersion: '2026-09-08',
      failureCode: 'VERIFICATION_FAILED',
      processingLeaseExpiresAt: null,
      uploadExpiresAt: new Date(),
      expiresAt: new Date(),
    };
    const retriedAudio = {
      ...failedAudio,
      id: 'new-audio',
      state: 'UPLOADING',
      sourceStorageKey: 'pages/page-1/audio/new-audio',
      failureCode: null,
    };
    prisma.pageAudio.findFirst
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(failedAudio);
    let createInput: PageAudioCreateArgs | undefined;
    prisma.pageAudio.create.mockImplementation((input: PageAudioCreateArgs) => {
      createInput = input;
      return Promise.resolve(retriedAudio);
    });

    await expect(
      repository.retryAudio({
        creatorId: 'creator-1',
        pageId: 'page-1',
        audioId: 'old-audio',
        newAudioId: 'new-audio',
        sourceStorageKey: 'pages/page-1/audio/new-audio',
        sourceMimeType: 'audio/mpeg',
        displayTitle: 'Our song',
        sourceByteSize: 1024,
        sourceSha256: 'checksum',
        rightsStatementVersion: '2026-09-08',
        uploadExpiresAt: new Date('2026-09-09T02:00:00.000Z'),
        expiresAt: new Date('2026-09-10T02:00:00.000Z'),
      }),
    ).resolves.toEqual({ type: 'created', audio: retriedAudio });

    expect(prisma.mediaCleanup.upsert.mock.calls).toHaveLength(1);
    expect(
      prisma.mediaCleanup.upsert.mock.calls[0]?.[0]?.where?.objectKey,
    ).toBe(failedAudio.sourceStorageKey);
    expect(
      prisma.mediaCleanup.upsert.mock.calls[0]?.[0]?.create?.objectKey,
    ).toBe(failedAudio.sourceStorageKey);
    expect(
      prisma.mediaCleanup.upsert.mock.calls[0]?.[0]?.create?.nextRetryAt,
    ).toBeInstanceOf(Date);
    expect(prisma.pageAudio.create).toHaveBeenCalledTimes(1);
    expect(createInput?.data.id).toBe('new-audio');
    expect(createInput?.data.pageId).toBe('page-1');
    expect(createInput?.data.state).toBe('UPLOADING');
    expect(createInput?.data.sourceStorageKey).toBe(
      'pages/page-1/audio/new-audio',
    );
  });
});
