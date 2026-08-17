import type { OwnerPageImage, PageImageState } from '../domain/page.types';

export const PAGE_MEDIA_REPOSITORY = Symbol('PAGE_MEDIA_REPOSITORY');

export interface PageMediaRecord {
  id: string;
  pageId: string;
  state: PageImageState;
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
}

export interface MediaCleanupTask {
  id: string;
  objectKey: string;
  status: 'PENDING' | 'REVIEW';
  attempts: number;
  nextRetryAt: Date | null;
  lastFailureCode: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
}

export type PrepareImageResult =
  | { type: 'created'; image: PageMediaRecord }
  | { type: 'not_found' }
  | { type: 'limit' };

export type ClaimImageResult =
  | { type: 'claimed'; image: PageMediaRecord }
  | { type: 'ready'; image: PageMediaRecord }
  | { type: 'not_found' }
  | { type: 'processing' }
  | { type: 'not_ready' };

export type RetryImageResult =
  | { type: 'retried'; image: PageMediaRecord }
  | { type: 'not_found' }
  | { type: 'attached' }
  | { type: 'processing' }
  | { type: 'unavailable' };

export type RemoveImageResult =
  | { type: 'removed' }
  | { type: 'not_found' }
  | { type: 'attached' }
  | { type: 'processing' };

export interface PageMediaRepository {
  prepareImage(input: {
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
  }): Promise<PrepareImageResult>;
  listOwnerImages(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerPageImage[] | null>;
  claimImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    now: Date;
    leaseExpiresAt: Date;
  }): Promise<ClaimImageResult>;
  markImageFailed(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    failureCode: string;
    cleanupKeys?: string[];
    expectedSourceStorageKey?: string;
  }): Promise<void>;
  markImageReady(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    storageKey: string;
    outputByteSize: number;
    outputSha256: string;
    width: number;
    height: number;
    expectedSourceStorageKey?: string;
  }): Promise<PageMediaRecord | null>;
  retryImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
    sourceStorageKey: string;
    uploadExpiresAt: Date;
    expiresAt: Date;
  }): Promise<RetryImageResult>;
  removeImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
  }): Promise<RemoveImageResult>;
  getOwnerImage(input: {
    creatorId: string;
    pageId: string;
    imageId: string;
  }): Promise<PageMediaRecord | null>;
  getPublicImage(input: {
    slug: string;
    imageId: string;
  }): Promise<PageMediaRecord | null>;
  expireImages(input: { now: Date }): Promise<void>;
  claimCleanupTasks(input: {
    now: Date;
    workerId: string;
    leaseExpiresAt: Date;
    limit: number;
  }): Promise<MediaCleanupTask[]>;
  markCleanupSucceeded(input: {
    taskId: string;
    workerId: string;
  }): Promise<void>;
  markCleanupFailed(input: {
    taskId: string;
    workerId: string;
    now: Date;
    failureCode: string;
  }): Promise<void>;
}
