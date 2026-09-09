jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageAudioRepository } from './prisma-page-audio.repository';

type PrismaMock = {
  page: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  pageAudio: {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
  };
  mediaCleanup: {
    create: jest.Mock;
    upsert: jest.Mock;
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
      update: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    mediaCleanup: {
      create: jest.fn(),
      upsert: jest.fn(),
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
});
