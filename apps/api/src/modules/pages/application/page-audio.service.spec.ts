import type { MediaStorage } from '../../../infrastructure/storage/media-storage';
import { PageAudioService, AudioNotReadyError } from './page-audio.service';
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
});
