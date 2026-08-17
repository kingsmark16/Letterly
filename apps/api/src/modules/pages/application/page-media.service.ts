import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  imageOperationResponseSchema,
  imageUploadResponseSchema,
} from '@letterly/contracts/pages';
import {
  MEDIA_STORAGE,
  MediaStorageUnavailableError,
  type MediaStorage,
} from '../../../infrastructure/storage/media-storage';
import {
  ImageProcessingError,
  ImageProcessor,
} from '../infrastructure/image-processor';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRecord,
  type PageMediaRepository,
} from './page-media.repository';

const UPLOAD_URL_SECONDS = 60 * 60;
const RECORD_EXPIRY_MS = 24 * 60 * 60 * 1000;
const PROCESSING_LEASE_MS = 180 * 1000;
const MAX_ACTIVE_PER_CREATOR = 2;
const MAX_ACTIVE_PER_INSTANCE = 8;

export class MediaPageNotFoundError extends Error {
  constructor() {
    super('Page or image not found');
    this.name = 'MediaPageNotFoundError';
  }
}

export class MediaImageLimitError extends Error {
  constructor() {
    super('Image limit reached');
    this.name = 'MediaImageLimitError';
  }
}

export class MediaImageNotReadyError extends Error {
  constructor() {
    super('Image is not ready');
    this.name = 'MediaImageNotReadyError';
  }
}

export class MediaImageProcessingError extends Error {
  constructor() {
    super('Image is already processing');
    this.name = 'MediaImageProcessingError';
  }
}

export class MediaImageAttachedError extends Error {
  constructor() {
    super('Attached images are changed through page save');
    this.name = 'MediaImageAttachedError';
  }
}

export class MediaImageRetryUnavailableError extends Error {
  constructor() {
    super('Image cannot be retried');
    this.name = 'MediaImageRetryUnavailableError';
  }
}

export class MediaImageProcessingFailedError extends Error {
  constructor(readonly failureCode: string) {
    super('Image processing failed');
    this.name = 'MediaImageProcessingFailedError';
  }
}

export class MediaStorageError extends Error {
  constructor() {
    super('Media storage unavailable');
    this.name = 'MediaStorageError';
  }
}

export class MediaRateLimitError extends Error {
  constructor() {
    super('Image processing limit reached');
    this.name = 'MediaRateLimitError';
  }
}

export interface MediaImageCommand {
  creatorId: string;
  pageId: string;
}

@Injectable()
export class PageMediaService {
  private readonly logger = new Logger(PageMediaService.name);
  private readonly activeByCreator = new Map<string, number>();
  private activeCount = 0;

  constructor(
    @Inject(PAGE_MEDIA_REPOSITORY)
    private readonly repository: PageMediaRepository,
    @Inject(MEDIA_STORAGE)
    private readonly storage: MediaStorage,
    @Inject(ImageProcessor)
    private readonly processor: ImageProcessor,
  ) {}

  async prepareUpload(
    input: MediaImageCommand & {
      contentType: string;
      byteSize: number;
      sha256: string;
      replaceImageId?: string;
    },
  ): Promise<ReturnType<typeof imageUploadResponseSchema.parse>> {
    const imageId = randomUUID();
    const sourceStorageKey = `pages/${input.pageId}/sources/${imageId}`;
    const uploadExpiresAt = new Date(Date.now() + UPLOAD_URL_SECONDS * 1000);
    const expiresAt = new Date(Date.now() + RECORD_EXPIRY_MS);
    const prepared = await this.repository.prepareImage({
      ...input,
      imageId,
      sourceStorageKey,
      uploadExpiresAt,
      expiresAt,
    });

    if (prepared.type === 'not_found') throw new MediaPageNotFoundError();
    if (prepared.type === 'limit') throw new MediaImageLimitError();

    try {
      const signed = await this.storage.createUploadUrl({
        contentType: input.contentType,
        expiresInSeconds: UPLOAD_URL_SECONDS,
        key: sourceStorageKey,
        sha256: input.sha256,
      });

      return imageUploadResponseSchema.parse({
        imageId,
        uploadUrl: signed.uploadUrl,
        requiredHeaders: signed.requiredHeaders,
        uploadExpiresAt: signed.expiresAt.toISOString(),
        state: 'UPLOADING',
      });
    } catch (error: unknown) {
      await this.repository.markImageFailed({
        creatorId: input.creatorId,
        pageId: input.pageId,
        imageId,
        failureCode: 'STORAGE_UNAVAILABLE',
        cleanupKeys: [sourceStorageKey],
        expectedSourceStorageKey: sourceStorageKey,
      });
      if (error instanceof MediaStorageUnavailableError) {
        throw new MediaStorageError();
      }
      throw new MediaStorageError();
    }
  }

  async listOwnerImages(input: MediaImageCommand) {
    const images = await this.repository.listOwnerImages(input);

    if (!images) throw new MediaPageNotFoundError();

    return images;
  }

  async completeUpload(input: MediaImageCommand & { imageId: string }) {
    this.acquireProcessingSlot(input.creatorId);

    try {
      const now = new Date();
      const claimed = await this.repository.claimImage({
        ...input,
        now,
        leaseExpiresAt: new Date(now.getTime() + PROCESSING_LEASE_MS),
      });

      if (claimed.type === 'not_found') throw new MediaPageNotFoundError();
      if (claimed.type === 'ready')
        return this.toOperationResponse(claimed.image);
      if (claimed.type === 'processing') throw new MediaImageProcessingError();
      if (claimed.type === 'not_ready') throw new MediaImageNotReadyError();

      const image = claimed.image;
      const outputStorageKey = `pages/${input.pageId}/images/${input.imageId}.webp`;
      let stage = 'read_source';

      try {
        if (!image.sourceStorageKey) {
          throw new MediaImageProcessingFailedError('SOURCE_MISSING');
        }

        const source = await this.storage.getObject(image.sourceStorageKey);
        stage = 'sanitize_image';
        const sanitized = await this.processor.sanitize({
          body: source.body,
          expectedContentType: image.sourceMimeType,
          storedContentType: source.contentType,
          storedContentLength: source.contentLength,
          storedChecksumSha256: source.checksumSha256,
          expectedChecksumSha256: image.sourceSha256,
        });

        stage = 'write_output';
        await this.storage.putObject({
          key: outputStorageKey,
          body: sanitized.body,
          contentType: 'image/webp',
        });
        stage = 'delete_source';
        await this.storage.deleteObject(image.sourceStorageKey);

        stage = 'mark_ready';
        const ready = await this.repository.markImageReady({
          creatorId: input.creatorId,
          pageId: input.pageId,
          imageId: input.imageId,
          storageKey: outputStorageKey,
          outputByteSize: sanitized.byteSize,
          outputSha256: sanitized.checksum,
          width: sanitized.width,
          height: sanitized.height,
          expectedSourceStorageKey: image.sourceStorageKey ?? undefined,
        });

        if (!ready)
          throw new MediaImageProcessingFailedError('IMAGE_NOT_READY');
        return this.toOperationResponse(ready);
      } catch (error: unknown) {
        const failureCode =
          error instanceof ImageProcessingError ||
          error instanceof MediaImageProcessingFailedError
            ? error.failureCode
            : 'STORAGE_UNAVAILABLE';

        if (!(error instanceof ImageProcessingError)) {
          const providerError = storageErrorDetails(error);
          this.logger.error({
            event: 'image_completion_failed',
            stage,
            imageId: input.imageId,
            ...providerError,
          });
        }

        await this.repository.markImageFailed({
          creatorId: input.creatorId,
          pageId: input.pageId,
          imageId: input.imageId,
          failureCode,
          cleanupKeys: [outputStorageKey],
          expectedSourceStorageKey: image.sourceStorageKey ?? undefined,
        });

        if (error instanceof ImageProcessingError) {
          throw new MediaImageProcessingFailedError(error.failureCode);
        }
        if (error instanceof MediaImageProcessingFailedError) throw error;
        throw new MediaStorageError();
      }
    } finally {
      this.releaseProcessingSlot(input.creatorId);
    }
  }

  async retryUpload(input: MediaImageCommand & { imageId: string }) {
    const sourceStorageKey = `pages/${input.pageId}/sources/${input.imageId}-${randomUUID()}`;
    const uploadExpiresAt = new Date(Date.now() + UPLOAD_URL_SECONDS * 1000);
    const retried = await this.repository.retryImage({
      ...input,
      sourceStorageKey,
      uploadExpiresAt,
      expiresAt: new Date(Date.now() + RECORD_EXPIRY_MS),
    });

    if (retried.type === 'not_found') throw new MediaPageNotFoundError();
    if (retried.type === 'attached') throw new MediaImageAttachedError();
    if (retried.type === 'processing') throw new MediaImageProcessingError();
    if (retried.type === 'unavailable') {
      throw new MediaImageRetryUnavailableError();
    }

    try {
      const signed = await this.storage.createUploadUrl({
        contentType: retried.image.sourceMimeType,
        expiresInSeconds: UPLOAD_URL_SECONDS,
        key: sourceStorageKey,
        sha256: retried.image.sourceSha256,
      });

      return imageUploadResponseSchema.parse({
        imageId: input.imageId,
        uploadUrl: signed.uploadUrl,
        requiredHeaders: signed.requiredHeaders,
        uploadExpiresAt: signed.expiresAt.toISOString(),
        state: 'UPLOADING',
      });
    } catch {
      await this.repository.markImageFailed({
        creatorId: input.creatorId,
        pageId: input.pageId,
        imageId: input.imageId,
        failureCode: 'STORAGE_UNAVAILABLE',
        cleanupKeys: [sourceStorageKey],
        expectedSourceStorageKey: sourceStorageKey,
      });
      throw new MediaStorageError();
    }
  }

  async removeUpload(input: MediaImageCommand & { imageId: string }) {
    const removed = await this.repository.removeImage(input);
    if (removed.type === 'not_found') throw new MediaPageNotFoundError();
    if (removed.type === 'attached') throw new MediaImageAttachedError();
    if (removed.type === 'processing') throw new MediaImageProcessingError();
  }

  async getOwnerMedia(input: MediaImageCommand & { imageId: string }) {
    const image = await this.repository.getOwnerImage(input);
    if (!image || !image.storageKey) throw new MediaPageNotFoundError();
    return this.readStoredImage(image.storageKey);
  }

  async getPublicMedia(input: { slug: string; imageId: string }) {
    const image = await this.repository.getPublicImage(input);
    if (!image || !image.storageKey) throw new MediaPageNotFoundError();
    return this.readStoredImage(image.storageKey);
  }

  private async readStoredImage(key: string): Promise<Buffer> {
    try {
      return (await this.storage.getObject(key)).body;
    } catch {
      throw new MediaStorageError();
    }
  }

  private toOperationResponse(image: PageMediaRecord) {
    return imageOperationResponseSchema.parse({
      imageId: image.id,
      state: image.state,
      outputByteSize: image.outputByteSize,
      width: image.width,
      height: image.height,
      mediaUrl: image.storageKey
        ? `/api/v1/pages/${image.pageId}/images/${image.id}`
        : null,
      failureCode: image.failureCode,
    });
  }

  private acquireProcessingSlot(creatorId: string): void {
    const creatorCount = this.activeByCreator.get(creatorId) ?? 0;
    if (
      creatorCount >= MAX_ACTIVE_PER_CREATOR ||
      this.activeCount >= MAX_ACTIVE_PER_INSTANCE
    ) {
      throw new MediaRateLimitError();
    }

    this.activeByCreator.set(creatorId, creatorCount + 1);
    this.activeCount += 1;
  }

  private releaseProcessingSlot(creatorId: string): void {
    const creatorCount = this.activeByCreator.get(creatorId) ?? 0;
    if (creatorCount <= 1) {
      this.activeByCreator.delete(creatorId);
    } else {
      this.activeByCreator.set(creatorId, creatorCount - 1);
    }
    this.activeCount = Math.max(0, this.activeCount - 1);
  }
}

function storageErrorDetails(error: unknown): {
  errorCode?: string;
  errorName?: string;
  statusCode?: number;
} {
  if (typeof error !== 'object' || error === null) return {};

  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    code?: string;
    name?: string;
  };

  return {
    ...(candidate.code ? { errorCode: candidate.code } : {}),
    ...(candidate.name ? { errorName: candidate.name } : {}),
    ...(candidate.$metadata?.httpStatusCode
      ? { statusCode: candidate.$metadata.httpStatusCode }
      : {}),
  };
}
