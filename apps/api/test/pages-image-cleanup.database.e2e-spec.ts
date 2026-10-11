import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import {
  secretLetterContentSchema,
  secretLetterTemplate,
} from '@letterly/templates/secret-letter';
import { PrismaPageMediaRepository } from '../src/modules/pages/infrastructure/prisma-page-media.repository';
import { PrismaPagesRepository } from '../src/modules/pages/infrastructure/prisma-pages.repository';

const describeDatabase =
  process.env.RUN_REAL_DB_TESTS === '1' ? describe : describe.skip;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describeDatabase('Image expiry with concurrent mutations', () => {
  jest.setTimeout(45_000);
  let prisma: PrismaClient;
  let creatorId: string;
  let pageId: string;
  let imageId: string;
  let sourceStorageKey: string;
  let storageKey: string;
  const now = new Date('2026-10-04T00:00:00Z');

  beforeAll(async () => {
    prisma = getPrismaClient();
    const template = await prisma.templateVersion.findFirstOrThrow({
      where: { registryKey: 'confession.secret-letter', status: 'ACTIVE' },
      select: { id: true },
    });
    creatorId = `image-cleanup-owner-${randomUUID()}`;
    pageId = randomUUID();
    imageId = randomUUID();
    sourceStorageKey = `pages/${pageId}/images/${imageId}/source`;
    storageKey = `pages/${pageId}/images/${imageId}/output.webp`;
    await prisma.user.create({
      data: {
        id: creatorId,
        name: 'Image cleanup owner',
        email: `${creatorId}@letterly.test`,
      },
    });
    await prisma.page.create({
      data: {
        id: pageId,
        creatorId,
        templateVersionId: template.id,
        slug: `image-cleanup-${pageId}`,
        displaySlug: `image-cleanup-${pageId}`,
        content: secretLetterTemplate.defaultContent,
        settings: secretLetterTemplate.defaultSettings,
      },
    });
  });

  beforeEach(async () => {
    await prisma.pageImage.deleteMany({ where: { pageId } });
    await prisma.page.update({
      where: { id: pageId },
      data: { contentVersion: 0 },
    });
    await prisma.mediaCleanup.deleteMany({
      where: { objectKey: { startsWith: `pages/${pageId}/images/` } },
    });
    await prisma.pageImage.create({
      data: {
        id: imageId,
        pageId,
        state: 'SANITIZING',
        sourceStorageKey,
        sourceMimeType: 'image/png',
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
      if (pageId)
        await prisma.mediaCleanup.deleteMany({
          where: { objectKey: { startsWith: `pages/${pageId}/images/` } },
        });
    } finally {
      await disconnectPrisma();
    }
  });

  async function duringSelection(operation: () => Promise<void>, cutoff = now) {
    const selected = deferred();
    const resume = deferred();
    let first = true;
    const client = prisma.$extends({
      query: {
        pageImage: {
          async findMany({ args, query }) {
            const result = await query(args);
            if (first) {
              first = false;
              selected.resolve();
              await resume.promise;
            }
            return result;
          },
        },
      },
    });
    const cleanup = new PrismaPageMediaRepository(
      client as unknown as PrismaClient,
    ).expireImages({ now: cutoff });
    const result = cleanup.catch((error: unknown) => error);
    try {
      await selected.promise;
      await operation();
    } finally {
      resume.resolve();
    }
    expect(await result).toBeUndefined();
  }

  it('queues the newly sanitized output rather than orphaning it after a stale selection', async () => {
    await duringSelection(async () => {
      const ready = await new PrismaPageMediaRepository(prisma).markImageReady({
        creatorId,
        pageId,
        imageId,
        storageKey,
        outputByteSize: 512,
        outputSha256: 'output-checksum',
        width: 640,
        height: 480,
        expectedSourceStorageKey: sourceStorageKey,
      });
      expect(ready?.state).toBe('READY');
    });
    expect(
      await prisma.pageImage.findUnique({ where: { id: imageId } }),
    ).toBeNull();
    expect(
      await prisma.mediaCleanup.count({ where: { objectKey: storageKey } }),
    ).toBe(1);
  });

  it('does not queue an image attached after selection when callers use different clock cutoffs', async () => {
    const expiresAt = new Date(Date.now() + 60_000);
    await prisma.pageImage.update({
      where: { id: imageId },
      data: {
        state: 'READY',
        sourceStorageKey: null,
        storageKey,
        outputByteSize: 512,
        outputSha256: 'output-checksum',
        width: 640,
        height: 480,
        expiresAt,
        processingLeaseExpiresAt: null,
      },
    });
    await duringSelection(async () => {
      const attached = await new PrismaPagesRepository(prisma).updateDraft({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        updateContent: () =>
          secretLetterContentSchema.parse(secretLetterTemplate.defaultContent),
        images: [{ imageId, sortOrder: 0 }],
      });
      expect(attached.type).toBe('updated');
    }, expiresAt);
    expect(
      await prisma.pageImage.findUniqueOrThrow({ where: { id: imageId } }),
    ).toMatchObject({ storageKey, expiresAt: null });
    expect(
      await prisma.mediaCleanup.count({ where: { objectKey: storageKey } }),
    ).toBe(0);
  });

  it('preserves a retry and queues only the superseded source', async () => {
    const replacementKey = `${sourceStorageKey}/retry`;
    const expiresAt = new Date(Date.now() + 300_000);
    await duringSelection(async () => {
      const retried = await new PrismaPageMediaRepository(prisma).retryImage({
        creatorId,
        pageId,
        imageId,
        sourceStorageKey: replacementKey,
        uploadExpiresAt: expiresAt,
        expiresAt,
      });
      expect(retried.type).toBe('retried');
    });
    expect(
      await prisma.pageImage.findUniqueOrThrow({ where: { id: imageId } }),
    ).toMatchObject({ state: 'UPLOADING', sourceStorageKey: replacementKey });
    expect(
      await prisma.mediaCleanup.count({ where: { objectKey: replacementKey } }),
    ).toBe(0);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(1);
  });

  it('rejects sanitization completion after expiry deletes the record', async () => {
    const repository = new PrismaPageMediaRepository(prisma);
    await repository.expireImages({ now });
    expect(
      await repository.markImageReady({
        creatorId,
        pageId,
        imageId,
        storageKey,
        outputByteSize: 512,
        outputSha256: 'output-checksum',
        width: 640,
        height: 480,
        expectedSourceStorageKey: sourceStorageKey,
      }),
    ).toBeNull();
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(1);
  });

  it('rolls back cleanup records when image deletion fails', async () => {
    const failure = new Error('fixture image deletion unavailable');
    const client = prisma.$extends({
      query: {
        pageImage: {
          deleteMany() {
            return Promise.reject(failure);
          },
        },
      },
    });
    await expect(
      new PrismaPageMediaRepository(
        client as unknown as PrismaClient,
      ).expireImages({ now }),
    ).rejects.toBe(failure);
    expect(await prisma.pageImage.count({ where: { id: imageId } })).toBe(1);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: sourceStorageKey },
      }),
    ).toBe(0);
  });

  it('deletes a 75 record backlog in batches of 50 and 25 with both keys queued', async () => {
    await prisma.pageImage.deleteMany({ where: { pageId } });
    await prisma.pageImage.createMany({
      data: Array.from({ length: 75 }, (_, index) => ({
        pageId,
        state: 'FAILED' as const,
        sourceStorageKey: `${sourceStorageKey}/${index}`,
        storageKey: `${storageKey}/${index}`,
        sourceMimeType: 'image/png',
        sourceByteSize: 1024,
        sourceSha256: 'fixture-checksum',
        uploadExpiresAt: now,
        expiresAt: now,
      })),
    });
    const repository = new PrismaPageMediaRepository(prisma);
    await repository.expireImages({ now });
    expect(await prisma.pageImage.count({ where: { pageId } })).toBe(25);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: { startsWith: `pages/${pageId}/images/` } },
      }),
    ).toBe(100);
    await repository.expireImages({ now });
    expect(await prisma.pageImage.count({ where: { pageId } })).toBe(0);
    expect(
      await prisma.mediaCleanup.count({
        where: { objectKey: { startsWith: `pages/${pageId}/images/` } },
      }),
    ).toBe(150);
  });
});
