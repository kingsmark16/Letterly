import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  ClaimImageResult,
  MediaCleanupTask,
  PageMediaRecord,
  PageMediaRepository,
  PrepareImageResult,
  RemoveImageResult,
  RetryImageResult,
} from '../application/page-media.repository';
import type { OwnerPageImage } from '../domain/page.types';
import { publicPageAvailabilityWhere } from '../application/public-availability';

const MAX_PAGE_IMAGES = 10;
const MAX_PAGE_SOURCE_BYTES = 104_857_600;
const CLEANUP_MAX_ATTEMPTS = 5;
const CLEANUP_BACKOFF_MS = 60_000;

const mediaSelect = {
  id: true,
  pageId: true,
  state: true,
  attachedAt: true,
  storageKey: true,
  sourceStorageKey: true,
  sourceMimeType: true,
  sourceByteSize: true,
  sourceSha256: true,
  outputByteSize: true,
  outputSha256: true,
  width: true,
  height: true,
  sortOrder: true,
  caption: true,
  failureCode: true,
  processingLeaseExpiresAt: true,
  uploadExpiresAt: true,
  expiresAt: true,
} as const;

function mapRecord(record: {
  id: string;
  pageId: string;
  state: PageMediaRecord['state'];
  attachedAt: Date | null;
  storageKey: string | null;
  sourceStorageKey: string | null;
  sourceMimeType: string;
  sourceByteSize: number;
  sourceSha256: string;
  outputByteSize: number | null;
  outputSha256: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number | null;
  caption: string | null;
  failureCode: string | null;
  processingLeaseExpiresAt: Date | null;
  uploadExpiresAt: Date;
  expiresAt: Date | null;
}): PageMediaRecord {
  return { ...record };
}

function mapOwnerImage(
  pageId: string,
  record: Pick<
    PageMediaRecord,
    | 'id'
    | 'state'
    | 'attachedAt'
    | 'sortOrder'
    | 'caption'
    | 'failureCode'
    | 'expiresAt'
    | 'storageKey'
  >,
): OwnerPageImage {
  return {
    imageId: record.id,
    state: record.state,
    attached: record.attachedAt !== null,
    sortOrder: record.sortOrder,
    mediaUrl: record.storageKey
      ? `/api/v1/pages/${pageId}/images/${record.id}`
      : null,
    caption: record.caption,
    failureCode: record.failureCode,
    expiresAt: record.expiresAt,
  };
}

@Injectable()
export class PrismaPageMediaRepository implements PageMediaRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async prepareImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    sourceStorageKey: string;
    contentType: string;
    byteSize: number;
    sha256: string;
    uploadExpiresAt: Date;
    expiresAt: Date;
    replaceImageId?: string;
  }): Promise<PrepareImageResult> {
    return this.prisma.$transaction(async (transaction) => {
      const lockedPages = await transaction.$queryRaw<
        Array<{ id: string; status?: string }>
      >`
        SELECT "id", "status"
        FROM "Page"
        WHERE "id" = CAST(${input.pageId} AS uuid)
          AND "creatorId" = ${input.creatorId}
        FOR UPDATE
      `;

      if (lockedPages.length === 0) {
        return { type: 'not_found' as const };
      }

      if (lockedPages[0]?.status === 'PUBLISHED') {
        return { type: 'not_found' as const };
      }

      const records = await transaction.pageImage.findMany({
        where: {
          pageId: input.pageId,
          state: { not: 'EXPIRED' },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          attachedAt: true,
          sourceByteSize: true,
        },
      });

      let replacementId: string | undefined;

      if (input.replaceImageId) {
        const replacement = records.find(
          (record) =>
            record.id === input.replaceImageId && record.attachedAt !== null,
        );

        if (!replacement) {
          return { type: 'limit' as const };
        }

        replacementId = replacement.id;
      }

      const countedRecords = replacementId
        ? records.filter((record) => record.id !== replacementId)
        : records;
      const imageCount = countedRecords.length + 1;
      const sourceBytes =
        countedRecords.reduce(
          (total, record) => total + record.sourceByteSize,
          0,
        ) + input.byteSize;

      if (imageCount > MAX_PAGE_IMAGES || sourceBytes > MAX_PAGE_SOURCE_BYTES) {
        return { type: 'limit' as const };
      }

      const image = await transaction.pageImage.create({
        data: {
          id: input.imageId,
          pageId: input.pageId,
          state: 'UPLOADING',
          sourceStorageKey: input.sourceStorageKey,
          sourceMimeType: input.contentType,
          sourceByteSize: input.byteSize,
          sourceSha256: input.sha256,
          replaceImageId: replacementId,
          uploadExpiresAt: input.uploadExpiresAt,
          expiresAt: input.expiresAt,
        },
        select: mediaSelect,
      });

      return { type: 'created' as const, image: mapRecord(image) };
    });
  }

  async listOwnerImages(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerPageImage[] | null> {
    const page = await this.prisma.page.findFirst({
      where: { id: input.pageId, creatorId: input.creatorId },
      select: {
        id: true,
        images: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: mediaSelect,
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return page
      ? page.images.map((image) =>
          mapOwnerImage(input.pageId, mapRecord(image)),
        )
      : null;
  }

  async claimImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    now: Date;
    leaseExpiresAt: Date;
  }): Promise<ClaimImageResult> {
    const current = await this.prisma.pageImage.findFirst({
      where: {
        id: input.imageId,
        pageId: input.pageId,
        page: {
          creatorId: input.creatorId,
          status: { in: ['DRAFT', 'UNPUBLISHED'] },
        },
        OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
      },
      select: mediaSelect,
    });

    if (!current) return { type: 'not_found' };
    if (
      current.attachedAt === null &&
      current.expiresAt !== null &&
      current.expiresAt <= input.now
    ) {
      return { type: 'not_found' };
    }
    if (current.state === 'READY') {
      return { type: 'ready', image: mapRecord(current) };
    }
    if (
      (current.state === 'VERIFYING' || current.state === 'SANITIZING') &&
      current.processingLeaseExpiresAt &&
      current.processingLeaseExpiresAt > input.now
    ) {
      return { type: 'processing' };
    }
    if (current.state !== 'UPLOADING') {
      return { type: 'not_ready' };
    }

    const claimed = await this.prisma.pageImage.updateMany({
      where: {
        id: input.imageId,
        pageId: input.pageId,
        page: {
          creatorId: input.creatorId,
          status: { in: ['DRAFT', 'UNPUBLISHED'] },
        },
        state: 'UPLOADING',
        OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
      },
      data: {
        state: 'SANITIZING',
        processingLeaseExpiresAt: input.leaseExpiresAt,
      },
    });

    if (claimed.count === 0) {
      return { type: 'processing' };
    }

    const image = await this.prisma.pageImage.findUnique({
      where: { id: input.imageId },
      select: mediaSelect,
    });

    return image
      ? { type: 'claimed', image: mapRecord(image) }
      : { type: 'not_found' };
  }

  async markImageFailed(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    failureCode: string;
    cleanupKeys?: string[];
    expectedSourceStorageKey?: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const image = await transaction.pageImage.findFirst({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
        },
        select: { state: true, storageKey: true, sourceStorageKey: true },
      });

      if (!image) return;

      if (
        (input.expectedSourceStorageKey &&
          image.sourceStorageKey !== input.expectedSourceStorageKey) ||
        (image.state !== 'UPLOADING' && image.state !== 'SANITIZING')
      ) {
        return;
      }

      const cleanupKeys = new Set(input.cleanupKeys ?? []);
      if (image.storageKey) cleanupKeys.add(image.storageKey);
      if (image.sourceStorageKey) cleanupKeys.add(image.sourceStorageKey);

      if (cleanupKeys.size > 0) {
        await transaction.mediaCleanup.createMany({
          data: Array.from(cleanupKeys, (objectKey) => ({
            objectKey,
            nextRetryAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      await transaction.pageImage.updateMany({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
          state: { in: ['UPLOADING', 'SANITIZING'] },
          ...(input.expectedSourceStorageKey
            ? { sourceStorageKey: input.expectedSourceStorageKey }
            : {}),
        },
        data: {
          state: 'FAILED',
          failureCode: input.failureCode,
          processingLeaseExpiresAt: null,
          storageKey: null,
        },
      });
    });
  }

  async markImageReady(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    storageKey: string;
    outputByteSize: number;
    outputSha256: string;
    width: number;
    height: number;
    expectedSourceStorageKey?: string;
  }): Promise<PageMediaRecord | null> {
    const updated = await this.prisma.pageImage.updateMany({
      where: {
        id: input.imageId,
        pageId: input.pageId,
        page: {
          creatorId: input.creatorId,
          status: { in: ['DRAFT', 'UNPUBLISHED'] },
        },
        state: 'SANITIZING',
        ...(input.expectedSourceStorageKey
          ? { sourceStorageKey: input.expectedSourceStorageKey }
          : {}),
      },
      data: {
        state: 'READY',
        storageKey: input.storageKey,
        sourceStorageKey: null,
        outputByteSize: input.outputByteSize,
        outputSha256: input.outputSha256,
        width: input.width,
        height: input.height,
        failureCode: null,
        processingLeaseExpiresAt: null,
      },
    });

    if (updated.count === 0) return null;

    const image = await this.prisma.pageImage.findUnique({
      where: { id: input.imageId },
      select: mediaSelect,
    });

    return image ? mapRecord(image) : null;
  }

  async retryImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    sourceStorageKey: string;
    uploadExpiresAt: Date;
    expiresAt: Date;
  }): Promise<RetryImageResult> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.pageImage.findFirst({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
        },
        select: mediaSelect,
      });

      if (!current) return { type: 'not_found' as const };
      if (current.attachedAt) return { type: 'attached' as const };
      if (
        (current.state === 'VERIFYING' || current.state === 'SANITIZING') &&
        current.processingLeaseExpiresAt &&
        current.processingLeaseExpiresAt > new Date()
      ) {
        return { type: 'processing' as const };
      }

      const updatedRows = await transaction.pageImage.updateMany({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
          attachedAt: null,
          state: current.state,
          sourceStorageKey: current.sourceStorageKey,
          storageKey: current.storageKey,
          processingLeaseExpiresAt: current.processingLeaseExpiresAt,
        },
        data: {
          state: 'UPLOADING',
          sourceStorageKey: input.sourceStorageKey,
          storageKey: null,
          outputByteSize: null,
          outputSha256: null,
          width: null,
          height: null,
          failureCode: null,
          processingLeaseExpiresAt: null,
          uploadExpiresAt: input.uploadExpiresAt,
          expiresAt: input.expiresAt,
        },
      });

      if (updatedRows.count !== 1) {
        return { type: 'unavailable' as const };
      }

      if (current.sourceStorageKey || current.storageKey) {
        const keys = [current.sourceStorageKey, current.storageKey].filter(
          (key): key is string => Boolean(key),
        );
        const cleanupAt = new Date(
          Math.max(Date.now(), current.uploadExpiresAt.getTime()),
        );
        await transaction.mediaCleanup.createMany({
          data: keys.map((objectKey) => ({
            objectKey,
            nextRetryAt: cleanupAt,
          })),
          skipDuplicates: true,
        });
      }

      const updated = await transaction.pageImage.findFirst({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
        },
        select: mediaSelect,
      });

      if (!updated) {
        throw new Error('Retried image could not be read');
      }

      return { type: 'retried' as const, image: mapRecord(updated) };
    });
  }

  async removeImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
  }): Promise<RemoveImageResult> {
    return this.prisma.$transaction(async (transaction) => {
      const image = await transaction.pageImage.findFirst({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
        },
        select: mediaSelect,
      });

      if (!image) return { type: 'not_found' as const };
      if (image.attachedAt) return { type: 'attached' as const };
      if (
        (image.state === 'VERIFYING' || image.state === 'SANITIZING') &&
        image.processingLeaseExpiresAt &&
        image.processingLeaseExpiresAt > new Date()
      ) {
        return { type: 'processing' as const };
      }

      const deleted = await transaction.pageImage.deleteMany({
        where: {
          id: input.imageId,
          pageId: input.pageId,
          page: {
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'UNPUBLISHED'] },
          },
          attachedAt: null,
          state: image.state,
          sourceStorageKey: image.sourceStorageKey,
          storageKey: image.storageKey,
          processingLeaseExpiresAt: image.processingLeaseExpiresAt,
        },
      });

      if (deleted.count !== 1) {
        const latest = await transaction.pageImage.findFirst({
          where: {
            id: input.imageId,
            pageId: input.pageId,
            page: {
              creatorId: input.creatorId,
              status: { in: ['DRAFT', 'UNPUBLISHED'] },
            },
          },
          select: mediaSelect,
        });

        if (!latest) return { type: 'not_found' as const };
        if (latest.attachedAt) return { type: 'attached' as const };
        if (
          (latest.state === 'VERIFYING' || latest.state === 'SANITIZING') &&
          latest.processingLeaseExpiresAt &&
          latest.processingLeaseExpiresAt > new Date()
        ) {
          return { type: 'processing' as const };
        }
        return { type: 'not_found' as const };
      }

      const keys = [image.storageKey, image.sourceStorageKey].filter(
        (key): key is string => Boolean(key),
      );
      if (keys.length > 0) {
        await transaction.mediaCleanup.createMany({
          data: keys.map((objectKey) => ({
            objectKey,
            nextRetryAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      return { type: 'removed' as const };
    });
  }

  async getOwnerImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
  }): Promise<PageMediaRecord | null> {
    const now = new Date();
    const image = await this.prisma.pageImage.findFirst({
      where: {
        id: input.imageId,
        pageId: input.pageId,
        page: { creatorId: input.creatorId },
        state: 'READY',
        OR: [
          { attachedAt: { not: null } },
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: mediaSelect,
    });

    return image ? mapRecord(image) : null;
  }

  async getPublicImage(input: {
    slug: string;
    imageId: string;
  }): Promise<PageMediaRecord | null> {
    const image = await this.prisma.pageImage.findFirst({
      where: {
        id: input.imageId,
        state: 'READY',
        attachedAt: { not: null },
        page: {
          ...publicPageAvailabilityWhere(input.slug),
        },
      },
      select: mediaSelect,
    });

    return image ? mapRecord(image) : null;
  }

  async expireImages(input: { now: Date }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const expired = await transaction.pageImage.findMany({
        where: {
          attachedAt: null,
          expiresAt: { lte: input.now },
        },
        select: {
          id: true,
          storageKey: true,
          sourceStorageKey: true,
        },
      });

      if (expired.length === 0) return;

      const cleanupKeys = new Set<string>();
      for (const image of expired) {
        if (image.storageKey) cleanupKeys.add(image.storageKey);
        if (image.sourceStorageKey) cleanupKeys.add(image.sourceStorageKey);
      }

      if (cleanupKeys.size > 0) {
        await transaction.mediaCleanup.createMany({
          data: Array.from(cleanupKeys, (objectKey) => ({
            objectKey,
            nextRetryAt: input.now,
          })),
          skipDuplicates: true,
        });
      }

      await transaction.pageImage.deleteMany({
        where: {
          id: { in: expired.map((image) => image.id) },
          attachedAt: null,
          expiresAt: { lte: input.now },
        },
      });
    });
  }

  async claimCleanupTasks(input: {
    now: Date;
    workerId: string;
    leaseExpiresAt: Date;
    limit: number;
  }): Promise<MediaCleanupTask[]> {
    const candidates = await this.prisma.mediaCleanup.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: input.now } }],
        AND: [
          {
            OR: [
              { leaseExpiresAt: null },
              { leaseExpiresAt: { lte: input.now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: input.limit,
      select: {
        id: true,
        objectKey: true,
        status: true,
        attempts: true,
        nextRetryAt: true,
        lastFailureCode: true,
        leaseOwner: true,
        leaseExpiresAt: true,
      },
    });
    const claimed: MediaCleanupTask[] = [];

    for (const candidate of candidates) {
      const updated = await this.prisma.mediaCleanup.updateMany({
        where: {
          id: candidate.id,
          status: 'PENDING',
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: input.now } }],
          AND: [
            {
              OR: [
                { leaseExpiresAt: null },
                { leaseExpiresAt: { lte: input.now } },
              ],
            },
          ],
        },
        data: {
          leaseOwner: input.workerId,
          leaseExpiresAt: input.leaseExpiresAt,
        },
      });

      if (updated.count > 0) {
        claimed.push({
          ...candidate,
          leaseOwner: input.workerId,
          leaseExpiresAt: input.leaseExpiresAt,
        });
      }
    }

    return claimed;
  }

  async markCleanupSucceeded(input: {
    taskId: string;
    workerId: string;
  }): Promise<void> {
    await this.prisma.mediaCleanup.deleteMany({
      where: {
        id: input.taskId,
        status: 'PENDING',
        leaseOwner: input.workerId,
      },
    });
  }

  async markCleanupFailed(input: {
    taskId: string;
    workerId: string;
    now: Date;
    failureCode: string;
  }): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const task = await transaction.mediaCleanup.findFirst({
        where: {
          id: input.taskId,
          status: 'PENDING',
          leaseOwner: input.workerId,
        },
        select: { attempts: true },
      });

      if (!task) return;

      const attempts = task.attempts + 1;
      const review = attempts >= CLEANUP_MAX_ATTEMPTS;

      await transaction.mediaCleanup.updateMany({
        where: {
          id: input.taskId,
          status: 'PENDING',
          leaseOwner: input.workerId,
        },
        data: {
          status: review ? 'REVIEW' : 'PENDING',
          attempts,
          nextRetryAt: review
            ? null
            : new Date(
                input.now.getTime() + CLEANUP_BACKOFF_MS * 2 ** (attempts - 1),
              ),
          lastFailureCode: input.failureCode,
          leaseOwner: null,
          leaseExpiresAt: null,
        },
      });
    });
  }
}
