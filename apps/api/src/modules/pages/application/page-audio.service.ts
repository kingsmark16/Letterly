import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { audioUploadResponseSchema } from '@letterly/contracts/pages';
import {
  MEDIA_STORAGE,
  MediaStorageUnavailableError,
  type MediaStorage,
} from '../../../infrastructure/storage/media-storage';
import {
  PAGE_AUDIO_REPOSITORY,
  type PageAudioRepository,
} from './page-audio.repository';
import { MediaCleanupService } from './media-cleanup.service';

const UPLOAD_URL_SECONDS = 60 * 60;
const RECORD_EXPIRY_MS = 24 * 60 * 60 * 1000;
const PROCESSING_LEASE_MS = 3 * 60 * 1000;
export const AUDIO_RIGHTS_STATEMENT_VERSION = '2026-09-08';

export class AudioPageNotFoundError extends Error {}
export class AudioUploadActiveError extends Error {}
export class AudioNotReadyError extends Error {}
export class AudioProcessingError extends Error {}
export class AudioStorageError extends Error {}

@Injectable()
export class PageAudioService {
  constructor(
    @Inject(PAGE_AUDIO_REPOSITORY)
    private readonly repository: PageAudioRepository,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    @Optional() private readonly cleanup?: MediaCleanupService,
  ) {}

  async prepareUpload(input: {
    creatorId: string;
    pageId: string;
    contentType: 'audio/mpeg' | 'audio/mp4';
    title: string;
    byteSize: number;
    sha256: string;
    durationMilliseconds?: number;
  }) {
    const audioId = randomUUID();
    const sourceStorageKey = `pages/${input.pageId}/audio/${audioId}`;
    const uploadExpiresAt = new Date(Date.now() + UPLOAD_URL_SECONDS * 1000);
    const prepared = await this.repository.prepareAudio({
      creatorId: input.creatorId,
      pageId: input.pageId,
      audioId,
      sourceStorageKey,
      sourceMimeType: input.contentType,
      displayTitle: input.title,
      sourceByteSize: input.byteSize,
      sourceSha256: input.sha256,
      durationMilliseconds: input.durationMilliseconds,
      rightsStatementVersion: AUDIO_RIGHTS_STATEMENT_VERSION,
      uploadExpiresAt,
      expiresAt: new Date(Date.now() + RECORD_EXPIRY_MS),
    });
    if (prepared.type === 'not_found') throw new AudioPageNotFoundError();
    if (prepared.type === 'active_upload') throw new AudioUploadActiveError();
    try {
      const signed = await this.storage.createUploadUrl({
        contentType: input.contentType,
        expiresInSeconds: UPLOAD_URL_SECONDS,
        key: sourceStorageKey,
        sha256: input.sha256,
      });
      return audioUploadResponseSchema.parse({
        audioId,
        uploadUrl: signed.uploadUrl,
        requiredHeaders: signed.requiredHeaders,
        uploadExpiresAt: signed.expiresAt.toISOString(),
        state: 'UPLOADING',
      });
    } catch (error) {
      await this.repository.markAudioFailed({
        creatorId: input.creatorId,
        pageId: input.pageId,
        audioId,
        failureCode: 'STORAGE_UNAVAILABLE',
        expectedSourceStorageKey: sourceStorageKey,
      });
      if (error instanceof MediaStorageUnavailableError)
        throw new AudioStorageError();
      throw new AudioStorageError();
    }
  }

  async completeUpload(input: {
    creatorId: string;
    pageId: string;
    audioId: string;
  }) {
    const now = new Date();
    const claimed = await this.repository.claimAudio({
      ...input,
      now,
      leaseExpiresAt: new Date(now.getTime() + PROCESSING_LEASE_MS),
    });
    if (claimed.type === 'not_found') throw new AudioPageNotFoundError();
    if (claimed.type === 'ready') return claimed.audio;
    if (claimed.type === 'processing') throw new AudioProcessingError();
    if (claimed.type === 'not_ready' || !claimed.audio.sourceStorageKey)
      throw new AudioNotReadyError();
    try {
      const object = await this.storage.getObject(
        claimed.audio.sourceStorageKey,
      );
      if (
        object.contentLength !== claimed.audio.sourceByteSize ||
        object.checksumSha256 !== claimed.audio.sourceSha256
      ) {
        throw new AudioNotReadyError();
      }
      const { fileTypeFromBuffer } = await import('file-type');
      const detected = await fileTypeFromBuffer(object.body);
      const typeMatches = detected?.mime === claimed.audio.sourceMimeType;
      if (!typeMatches) {
        throw new AudioNotReadyError();
      }
      const ready = await this.repository.markAudioReady({
        ...input,
        expectedSourceStorageKey: claimed.audio.sourceStorageKey,
      });
      if (!ready) throw new AudioNotReadyError();
      return ready;
    } catch (error) {
      await this.repository.markAudioFailed({
        ...input,
        failureCode:
          error instanceof AudioNotReadyError
            ? 'VERIFICATION_FAILED'
            : 'STORAGE_UNAVAILABLE',
        expectedSourceStorageKey: claimed.audio.sourceStorageKey,
      });
      if (error instanceof AudioNotReadyError) throw error;
      throw new AudioStorageError();
    }
  }

  async getPublicAudio(input: { slug: string; start?: number; end?: number }) {
    const audio = await this.repository.getPublicAudio({ slug: input.slug });
    if (!audio?.sourceStorageKey) throw new AudioPageNotFoundError();
    try {
      return await this.storage.getObjectRange({
        key: audio.sourceStorageKey,
        start: input.start,
        end: input.end,
      });
    } catch {
      throw new AudioStorageError();
    }
  }

  async getOwnerAudio(input: { creatorId: string; pageId: string }) {
    const audio = await this.repository.getOwnerAudio(input);
    if (!audio?.sourceStorageKey) throw new AudioPageNotFoundError();
    try {
      return await this.storage.getObjectRange({ key: audio.sourceStorageKey });
    } catch {
      throw new AudioStorageError();
    }
  }

  async removeCurrentAudio(input: {
    creatorId: string;
    pageId: string;
  }): Promise<void> {
    const result = await this.repository.removeCurrentAudio(input);
    if (result.type === 'not_found') throw new AudioPageNotFoundError();
    if (result.type === 'removed' && this.cleanup) {
      try {
        await this.cleanup.runOnce();
      } catch {
        // The transaction already recorded the cleanup task. The scheduled
        // worker will retry it if this immediate pass cannot complete.
      }
    }
  }
}
