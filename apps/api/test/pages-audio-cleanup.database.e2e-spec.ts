import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { PrismaPageAudioRepository } from '../src/modules/pages/infrastructure/prisma-page-audio.repository';

const describeDatabase =
  process.env.RUN_REAL_DB_TESTS === '1' ? describe : describe.skip;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describeDatabase('Audio expiry with concurrent verification', () => {
  jest.setTimeout(45_000);
  let prisma: PrismaClient;
  let creatorId: string;
  let pageId: string;
  let audioId: string;
  let sourceStorageKey: string;
  const now = new Date('2026-10-04T00:00:00Z');

  beforeAll(async () => {
    prisma = getPrismaClient();
    const template = await prisma.templateVersion.findFirstOrThrow({
      where: { registryKey: 'confession.secret-letter', status: 'ACTIVE' },
      select: { id: true },
    });
    creatorId = `cleanup-owner-${randomUUID()}`;
    pageId = randomUUID();
    audioId = randomUUID();
    sourceStorageKey = `pages/${pageId}/audio/${audioId}`;
    await prisma.user.create({
      data: {
        id: creatorId,
        name: 'Cleanup owner',
        email: `${creatorId}@letterly.test`,
      },
    });
    await prisma.page.create({
      data: {
        id: pageId,
        creatorId,
        templateVersionId: template.id,
        slug: `cleanup-${pageId}`,
        displaySlug: `cleanup-${pageId}`,
        content: {},
        settings: {},
      },
    });
  });

  beforeEach(async () => {
    await prisma.page.update({
      where: { id: pageId },
      data: { currentAudioId: null },
    });
    await prisma.pageAudio.deleteMany({ where: { pageId } });
    await prisma.mediaCleanup.deleteMany({
      where: { objectKey: { startsWith: `pages/${pageId}/audio/` } },
    });
    await prisma.pageAudio.create({
      data: {
        id: audioId,
        pageId,
        state: 'VERIFYING',
        sourceStorageKey,
        sourceMimeType: 'audio/mpeg',
        displayTitle: 'Fixture song',
        sourceByteSize: 1024,
        sourceSha256: 'fixture-checksum',
        uploadExpiresAt: now,
        expiresAt: now,
        processingLeaseExpiresAt: now,
      },
    });
  });

  afterAll(async () => {
    try {
      if (creatorId) await prisma.user.deleteMany({ where: { id: creatorId } });
      if (sourceStorageKey)
        await prisma.mediaCleanup.deleteMany({
          where: { objectKey: { startsWith: `pages/${pageId}/audio/` } },
        });
    } finally {
      await disconnectPrisma();
    }
  });

  it('does not expire or queue audio completed after the initial expiry selection', async () => {
    const selected = deferred();
    const resumeExpiry = deferred();
    let firstSelection = true;
    const cleanupClient = prisma.$extends({
      query: {
        pageAudio: {
          async findMany({ args, query }) {
            const result = await query(args);
            if (firstSelection) {
              firstSelection = false;
              selected.resolve();
              await resumeExpiry.promise;
            }
            return result;
          },
        },
      },
    });
    const cleanup = new PrismaPageAudioRepository(
      cleanupClient as unknown as PrismaClient,
    ).expireAudio({ now });
    const result = cleanup.catch((error: unknown) => error);
    try {
      await selected.promise;
      const completed = await new PrismaPageAudioRepository(
        prisma,
      ).markAudioReady({
        creatorId,
        pageId,
        audioId,
        expectedSourceStorageKey: sourceStorageKey,
      });
      expect(completed?.state).toBe('READY');
    } finally {
      resumeExpiry.resolve();
    }
    expect(await result).toBeUndefined();
    const audio = await prisma.pageAudio.findUniqueOrThrow({
      where: { id: audioId },
    });
    expect(audio.state).toBe('READY');
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(0);
  });

  it('does not expire a verification lease renewed after the initial selection', async () => {
    const selected = deferred();
    const resumeExpiry = deferred();
    let firstSelection = true;
    const cleanupClient = prisma.$extends({
      query: {
        pageAudio: {
          async findMany({ args, query }) {
            const result = await query(args);
            if (firstSelection) {
              firstSelection = false;
              selected.resolve();
              await resumeExpiry.promise;
            }
            return result;
          },
        },
      },
    });
    const cleanup = new PrismaPageAudioRepository(
      cleanupClient as unknown as PrismaClient,
    ).expireAudio({ now });
    const result = cleanup.catch((error: unknown) => error);
    const leaseExpiresAt = new Date(now.getTime() + 300_000);
    try {
      await selected.promise;
      const renewed = await new PrismaPageAudioRepository(prisma).claimAudio({
        creatorId,
        pageId,
        audioId,
        now,
        leaseExpiresAt,
      });
      expect(renewed.type).toBe('claimed');
    } finally {
      resumeExpiry.resolve();
    }
    expect(await result).toBeUndefined();
    const audio = await prisma.pageAudio.findUniqueOrThrow({
      where: { id: audioId },
    });
    expect(audio.state).toBe('VERIFYING');
    expect(audio.processingLeaseExpiresAt).toEqual(leaseExpiresAt);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(0);
  });

  it('rejects completion after expiry wins and queues the abandoned source', async () => {
    const repository = new PrismaPageAudioRepository(prisma);
    await repository.expireAudio({ now });
    expect(
      await repository.markAudioReady({
        creatorId,
        pageId,
        audioId,
        expectedSourceStorageKey: sourceStorageKey,
      }),
    ).toBeNull();
    expect(
      await prisma.pageAudio.findUniqueOrThrow({ where: { id: audioId } }),
    ).toMatchObject({ state: 'EXPIRED' });
    expect(
      await prisma.page.findUniqueOrThrow({ where: { id: pageId } }),
    ).toMatchObject({ currentAudioId: null });
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(1);
  });

  it('rolls back expiry when durable cleanup recording fails', async () => {
    const failure = new Error('fixture cleanup write unavailable');
    const client = prisma.$extends({
      query: {
        mediaCleanup: {
          createMany() {
            return Promise.reject(failure);
          },
        },
      },
    });
    await expect(
      new PrismaPageAudioRepository(
        client as unknown as PrismaClient,
      ).expireAudio({ now }),
    ).rejects.toBe(failure);
    expect(
      await prisma.pageAudio.findUniqueOrThrow({ where: { id: audioId } }),
    ).toMatchObject({ state: 'VERIFYING' });
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(0);
  });

  it('expires only 50 records from a 75 record backlog per transaction', async () => {
    await prisma.pageAudio.createMany({
      data: Array.from({ length: 74 }, (_, index) => ({
        pageId,
        state: 'VERIFYING' as const,
        sourceStorageKey: `${sourceStorageKey}/${index}`,
        sourceMimeType: 'audio/mpeg',
        displayTitle: 'Backlog song',
        sourceByteSize: 1024,
        sourceSha256: 'fixture-checksum',
        uploadExpiresAt: now,
        expiresAt: now,
        processingLeaseExpiresAt: now,
      })),
    });
    const repository = new PrismaPageAudioRepository(prisma);
    await repository.expireAudio({ now });
    expect(
      await prisma.pageAudio.count({ where: { pageId, state: 'EXPIRED' } }),
    ).toBe(50);
    expect(
      await prisma.pageAudio.count({ where: { pageId, state: 'VERIFYING' } }),
    ).toBe(25);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: { startsWith: `pages/${pageId}/audio/` } },
      }),
    ).toBe(50);
    await repository.expireAudio({ now });
    expect(
      await prisma.pageAudio.count({ where: { pageId, state: 'EXPIRED' } }),
    ).toBe(75);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: { startsWith: `pages/${pageId}/audio/` } },
      }),
    ).toBe(75);
  });
});
