import { Readable } from 'node:stream';
import {
  MediaStorageRangeNotSatisfiableError,
  type MediaStorage,
} from '../../../infrastructure/storage/media-storage';
import {
  AudioNotReadyError,
  AudioRangeNotSatisfiableError,
  PageAudioService,
} from './page-audio.service';
import type {
  PageAudioRecord,
  PageAudioRepository,
} from './page-audio.repository';
import type { MediaCleanupService } from './media-cleanup.service';

const creatorId = 'creator';
const pageId = '4fd813ef-c48e-4966-8325-1af2fb13b611';
const audioId = '9a7a6dd9-9cb4-4bf3-9183-8a1d5a199e52';
const checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

function createRepository(): jest.Mocked<PageAudioRepository> {
  return {
    prepareAudio: jest.fn(),
    retryAudio: jest.fn(),
    claimAudio: jest.fn(),
    markAudioReady: jest.fn(),
    markAudioFailed: jest.fn(),
    removeCurrentAudio: jest.fn(),
    expireAudio: jest.fn(),
    getOwnerAudio: jest.fn(),
    getPublicAudio: jest.fn(),
  };
}

function createStorage(): jest.Mocked<MediaStorage> {
  return {
    createUploadUrl: jest.fn(),
    getObject: jest.fn(),
    getObjectRange: jest.fn(),
    putObject: jest.fn(),
    deleteObject: jest.fn(),
  };
}

function createAudioRecord(): PageAudioRecord {
  return {
    id: audioId,
    pageId,
    state: 'EXPIRED',
    sourceStorageKey: `pages/${pageId}/audio/${audioId}`,
    sourceMimeType: 'audio/mpeg',
    displayTitle: 'Our song',
    sourceByteSize: 3,
    sourceSha256: checksum,
    durationMilliseconds: null,
    rightsConfirmedAt: new Date(),
    rightsStatementVersion: '2026-09-08',
    failureCode: null,
    processingLeaseExpiresAt: null,
    uploadExpiresAt: new Date(),
    expiresAt: new Date(),
  };
}

describe('PageAudioService', () => {
  it('passes owner ranges through to private storage', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const audio = { ...createAudioRecord(), state: 'READY' as const };
    const stream = {
      body: Readable.from(Buffer.from('audio')),
      contentType: 'audio/mpeg',
      contentLength: 5,
      contentRange: 'bytes 0-4/5',
      totalLength: 5,
    };
    repository.getOwnerAudio.mockResolvedValue(audio);
    storage.getObjectRange.mockResolvedValue(stream);
    const service = new PageAudioService(repository, storage);

    await expect(
      service.getOwnerAudio({ creatorId, pageId, start: 0, end: 4 }),
    ).resolves.toBe(stream);

    expect(repository.getOwnerAudio.mock.calls).toEqual([
      [{ creatorId, pageId }],
    ]);
    expect(storage.getObjectRange.mock.calls).toEqual([
      [{ key: audio.sourceStorageKey, start: 0, end: 4 }],
    ]);
  });

  it('runs cleanup immediately after removing the current track', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const runOnce = jest.fn().mockResolvedValue(undefined);
    const cleanup = {
      runOnce,
    } as unknown as MediaCleanupService;
    repository.removeCurrentAudio.mockResolvedValue({
      type: 'removed',
      audio: createAudioRecord(),
    });
    const service = new PageAudioService(repository, storage, cleanup);

    await service.removeCurrentAudio({ creatorId, pageId });

    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  it('preserves an invalid range result for the HTTP boundary', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const audio = { ...createAudioRecord(), state: 'READY' as const };
    repository.getPublicAudio.mockResolvedValue(audio);
    storage.getObjectRange.mockRejectedValue(
      new MediaStorageRangeNotSatisfiableError(),
    );
    const service = new PageAudioService(repository, storage);

    await expect(
      service.getPublicAudio({ slug: 'letter', start: 20 }),
    ).rejects.toBeInstanceOf(AudioRangeNotSatisfiableError);
  });

  it('keeps a successful removal when the immediate cleanup pass fails', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const runOnce = jest
      .fn()
      .mockRejectedValue(new Error('cleanup unavailable'));
    const cleanup = {
      runOnce,
    } as unknown as MediaCleanupService;
    repository.removeCurrentAudio.mockResolvedValue({
      type: 'removed',
      audio: createAudioRecord(),
    });
    const service = new PageAudioService(repository, storage, cleanup);

    await expect(
      service.removeCurrentAudio({ creatorId, pageId }),
    ).resolves.toBeUndefined();
    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  it('does not activate audio when the stored checksum differs', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const markAudioReady = jest.fn();
    const markAudioFailed = jest.fn();
    repository.markAudioReady = markAudioReady;
    repository.markAudioFailed = markAudioFailed;
    const record = {
      id: audioId,
      pageId,
      state: 'VERIFYING' as const,
      sourceStorageKey: `pages/${pageId}/audio/${audioId}`,
      sourceMimeType: 'audio/mpeg',
      displayTitle: 'Our song',
      sourceByteSize: 3,
      sourceSha256: checksum,
      durationMilliseconds: null,
      rightsConfirmedAt: new Date(),
      rightsStatementVersion: '2026-09-08',
      failureCode: null,
      processingLeaseExpiresAt: new Date(),
      uploadExpiresAt: new Date(Date.now() + 60_000),
      expiresAt: new Date(),
    };
    repository.claimAudio.mockResolvedValue({ type: 'claimed', audio: record });
    storage.getObject.mockResolvedValue({
      body: Buffer.from([0x49, 0x44, 0x33]),
      contentType: 'audio/mpeg',
      contentLength: 3,
      checksumSha256: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    });
    const service = new PageAudioService(repository, storage);

    await expect(
      service.completeUpload({ creatorId, pageId, audioId }),
    ).rejects.toBeInstanceOf(AudioNotReadyError);
    expect(markAudioReady).not.toHaveBeenCalled();
    expect(markAudioFailed).toHaveBeenCalledWith(
      expect.objectContaining({ failureCode: 'VERIFICATION_FAILED' }),
    );
  });

  it('creates a fresh upload when retrying a failed track', async () => {
    const repository = createRepository();
    const storage = createStorage();
    const retriedAudio = {
      ...createAudioRecord(),
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      state: 'UPLOADING' as const,
      sourceStorageKey: `pages/${pageId}/audio/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    };
    repository.retryAudio.mockResolvedValue({
      type: 'created',
      audio: retriedAudio,
    });
    storage.createUploadUrl.mockResolvedValue({
      expiresAt: new Date('2026-09-09T02:00:00.000Z'),
      key: retriedAudio.sourceStorageKey,
      uploadUrl: 'https://uploads.example.test/retry',
      requiredHeaders: {
        contentType: 'audio/mpeg',
        sha256: checksum,
      },
    });
    const service = new PageAudioService(repository, storage);

    await expect(
      service.retryUpload({
        creatorId,
        pageId,
        audioId,
        contentType: 'audio/mpeg',
        title: 'Our song',
        byteSize: 3,
        sha256: checksum,
      }),
    ).resolves.toMatchObject({
      audioId: retriedAudio.id,
      state: 'UPLOADING',
      uploadUrl: 'https://uploads.example.test/retry',
    });

    expect(repository.retryAudio.mock.calls).toHaveLength(1);
    const retryInput = repository.retryAudio.mock.calls[0]?.[0];
    expect(retryInput?.creatorId).toBe(creatorId);
    expect(retryInput?.pageId).toBe(pageId);
    expect(retryInput?.audioId).toBe(audioId);
    expect(retryInput?.newAudioId).not.toBe(audioId);
    expect(retryInput?.sourceStorageKey).toMatch(
      new RegExp(`^pages/${pageId}/audio/`),
    );
  });
});
