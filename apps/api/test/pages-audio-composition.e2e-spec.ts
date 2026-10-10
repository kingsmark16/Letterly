import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import {
  PageAudioService,
  AudioPageNotFoundError,
  AudioStorageError,
  AudioRangeNotSatisfiableError,
  AudioNotReadyError,
} from '../src/modules/pages/application/page-audio.service';
import {
  PAGE_AUDIO_REPOSITORY,
  type PageAudioRepository,
  type PageAudioRecord,
} from '../src/modules/pages/application/page-audio.repository';
import {
  MEDIA_STORAGE,
  MediaStorageUnavailableError,
  MediaStorageRangeNotSatisfiableError,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import { MediaCleanupService } from '../src/modules/pages/application/media-cleanup.service';
import { pageAudioServiceProvider } from '../src/modules/pages/pages.module';

const owner = {
  creatorId: 'creator-1',
  pageId: '4fd813ef-c48e-4966-8325-1af2fb13b611',
};
const audioId = '9a7a6dd9-9cb4-4bf3-9183-8a1d5a199e52';
const checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const body = Buffer.alloc(4100);
Buffer.from([0xff, 0xfb, 0x90, 0x64]).copy(body);
const audio: PageAudioRecord = {
  id: audioId,
  pageId: owner.pageId,
  state: 'READY',
  sourceStorageKey: `pages/${owner.pageId}/audio/${audioId}`,
  sourceMimeType: 'audio/mpeg',
  displayTitle: 'Fixture song',
  sourceByteSize: body.length,
  sourceSha256: checksum,
  durationMilliseconds: null,
  rightsConfirmedAt: null,
  rightsStatementVersion: '2026-09-08',
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: new Date('2026-10-03T12:00:00Z'),
  expiresAt: null,
};
const upload = {
  ...owner,
  contentType: 'audio/mpeg' as const,
  title: 'Fixture song',
  byteSize: body.length,
  sha256: checksum,
};

function createPorts() {
  return {
    repository: {
      prepareAudio: jest.fn<PageAudioRepository['prepareAudio']>(),
      retryAudio: jest.fn<PageAudioRepository['retryAudio']>(),
      claimAudio: jest.fn<PageAudioRepository['claimAudio']>(),
      markAudioReady: jest.fn<PageAudioRepository['markAudioReady']>(),
      markAudioFailed: jest
        .fn<PageAudioRepository['markAudioFailed']>()
        .mockResolvedValue(undefined),
      removeCurrentAudio: jest.fn<PageAudioRepository['removeCurrentAudio']>(),
      expireAudio: jest.fn<PageAudioRepository['expireAudio']>(),
      getOwnerAudio: jest.fn<PageAudioRepository['getOwnerAudio']>(),
      getPublicAudio: jest.fn<PageAudioRepository['getPublicAudio']>(),
    },
    storage: {
      createUploadUrl: jest.fn<MediaStorage['createUploadUrl']>(),
      getObject: jest.fn<MediaStorage['getObject']>(),
      getObjectRange: jest.fn<MediaStorage['getObjectRange']>(),
      putObject: jest.fn<MediaStorage['putObject']>(),
      deleteObject: jest.fn<MediaStorage['deleteObject']>(),
    },
    cleanup: {
      runOnce: jest
        .fn<MediaCleanupService['runOnce']>()
        .mockResolvedValue(undefined),
    },
  };
}

describe('Audio service factory composition', () => {
  let module: TestingModule | undefined;
  let ports: ReturnType<typeof createPorts>;
  beforeEach(() => {
    ports = createPorts();
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  async function compose(withCleanup = false) {
    const builder = Test.createTestingModule({
      providers: [
        pageAudioServiceProvider,
        { provide: PAGE_AUDIO_REPOSITORY, useValue: {} },
        { provide: MEDIA_STORAGE, useValue: {} },
        ...(withCleanup
          ? [{ provide: MediaCleanupService, useValue: {} }]
          : []),
      ],
    })
      .overrideProvider(PAGE_AUDIO_REPOSITORY)
      .useValue(ports.repository)
      .overrideProvider(MEDIA_STORAGE)
      .useValue(ports.storage);
    if (withCleanup)
      builder.overrideProvider(MediaCleanupService).useValue(ports.cleanup);
    module = await builder.compile();
    return module.get(PageAudioService);
  }

  it('resolves the singleton factory and signs an upload through repository/storage overrides', async () => {
    const service = await compose();
    expect(module?.get(PageAudioService)).toBe(service);
    ports.repository.prepareAudio.mockResolvedValue({ type: 'created', audio });
    ports.storage.createUploadUrl.mockResolvedValue({
      expiresAt: audio.uploadExpiresAt,
      key: 'fixture-key',
      uploadUrl: 'https://uploads.example.test/audio',
      requiredHeaders: { contentType: 'audio/mpeg', sha256: checksum },
    });
    const result = await service.prepareUpload(upload);
    expect(result).toMatchObject({
      state: 'UPLOADING',
      uploadUrl: 'https://uploads.example.test/audio',
      uploadExpiresAt: '2026-10-03T12:00:00.000Z',
    });
    const prepared = ports.repository.prepareAudio.mock.calls[0]?.[0];
    expect(prepared).toMatchObject({
      ...owner,
      audioId: result.audioId,
      sourceStorageKey: `pages/${owner.pageId}/audio/${result.audioId}`,
      sourceMimeType: 'audio/mpeg',
      displayTitle: upload.title,
      sourceByteSize: body.length,
      sourceSha256: checksum,
      rightsStatementVersion: '2026-09-08',
    });
    expect(ports.storage.createUploadUrl.mock.calls).toEqual([
      [
        {
          contentType: 'audio/mpeg',
          expiresInSeconds: 3600,
          key: prepared?.sourceStorageKey,
          sha256: checksum,
        },
      ],
    ]);
  });

  it('marks signing failures before returning the safe storage error', async () => {
    const service = await compose();
    ports.repository.prepareAudio.mockResolvedValue({ type: 'created', audio });
    ports.storage.createUploadUrl.mockRejectedValue(
      new MediaStorageUnavailableError(),
    );
    await expect(service.prepareUpload(upload)).rejects.toBeInstanceOf(
      AudioStorageError,
    );
    const prepared = ports.repository.prepareAudio.mock.calls[0]?.[0];
    expect(ports.repository.markAudioFailed.mock.calls).toEqual([
      [
        {
          ...owner,
          audioId: prepared?.audioId,
          failureCode: 'STORAGE_UNAVAILABLE',
          expectedSourceStorageKey: prepared?.sourceStorageKey,
        },
      ],
    ]);
  });

  it('completes a verified MP3 using the real file type detector', async () => {
    const service = await compose();
    ports.repository.claimAudio.mockResolvedValue({ type: 'claimed', audio });
    ports.storage.getObject.mockResolvedValue({
      body,
      contentType: 'audio/mpeg',
      contentLength: body.length,
      checksumSha256: checksum,
    });
    ports.repository.markAudioReady.mockResolvedValue(audio);
    await expect(service.completeUpload({ ...owner, audioId })).resolves.toBe(
      audio,
    );
    expect(ports.repository.claimAudio.mock.calls[0]?.[0]).toMatchObject({
      ...owner,
      audioId,
    });
    expect(ports.storage.getObject.mock.calls).toEqual([
      [audio.sourceStorageKey],
    ]);
    expect(ports.repository.markAudioReady.mock.calls).toEqual([
      [{ ...owner, audioId, expectedSourceStorageKey: audio.sourceStorageKey }],
    ]);
    expect(ports.repository.markAudioFailed.mock.calls).toHaveLength(0);
  });

  it('rejects checksum mismatches before marking audio ready', async () => {
    const service = await compose();
    ports.repository.claimAudio.mockResolvedValue({ type: 'claimed', audio });
    ports.storage.getObject.mockResolvedValue({
      body,
      contentType: 'audio/mpeg',
      contentLength: body.length,
      checksumSha256: 'mismatch',
    });
    await expect(
      service.completeUpload({ ...owner, audioId }),
    ).rejects.toBeInstanceOf(AudioNotReadyError);
    expect(ports.repository.markAudioReady.mock.calls).toHaveLength(0);
    expect(ports.repository.markAudioFailed.mock.calls).toEqual([
      [
        {
          ...owner,
          audioId,
          failureCode: 'VERIFICATION_FAILED',
          expectedSourceStorageKey: audio.sourceStorageKey,
        },
      ],
    ]);
  });

  it.each(['owner', 'public'] as const)(
    'preserves %s scope, byte range, and stream identity',
    async (surface) => {
      const service = await compose();
      ports.repository.getOwnerAudio.mockResolvedValue(audio);
      ports.repository.getPublicAudio.mockResolvedValue(audio);
      const stream = {
        body: Readable.from(Buffer.from('audio')),
        contentType: 'audio/mpeg',
        contentLength: 5,
        contentRange: 'bytes 0-4/5',
        totalLength: 5,
      };
      ports.storage.getObjectRange.mockResolvedValue(stream);
      const promise =
        surface === 'owner'
          ? service.getOwnerAudio({ ...owner, start: 0, end: 4 })
          : service.getPublicAudio({ slug: 'letter42', start: 0, end: 4 });
      await expect(promise).resolves.toBe(stream);
      expect(ports.storage.getObjectRange.mock.calls).toEqual([
        [{ key: audio.sourceStorageKey, start: 0, end: 4 }],
      ]);
      expect(ports.repository.getOwnerAudio.mock.calls).toEqual(
        surface === 'owner' ? [[owner]] : [],
      );
      expect(ports.repository.getPublicAudio.mock.calls).toEqual(
        surface === 'public' ? [[{ slug: 'letter42' }]] : [],
      );
    },
  );

  it.each(['owner', 'public'] as const)(
    'retains %s range and storage failure mapping',
    async (surface) => {
      const service = await compose();
      ports.repository.getOwnerAudio.mockResolvedValue(audio);
      ports.repository.getPublicAudio.mockResolvedValue(audio);
      const read = () =>
        surface === 'owner'
          ? service.getOwnerAudio({ ...owner, start: 20 })
          : service.getPublicAudio({ slug: 'letter42', start: 20 });
      ports.storage.getObjectRange.mockRejectedValue(
        new MediaStorageRangeNotSatisfiableError(),
      );
      await expect(read()).rejects.toBeInstanceOf(
        AudioRangeNotSatisfiableError,
      );
      ports.storage.getObjectRange.mockRejectedValue(
        new MediaStorageUnavailableError(),
      );
      await expect(read()).rejects.toBeInstanceOf(AudioStorageError);
    },
  );

  it.each(['owner', 'public'] as const)(
    'retains unavailable %s audio without storage I/O',
    async (surface) => {
      const service = await compose();
      ports.repository.getOwnerAudio.mockResolvedValue(null);
      ports.repository.getPublicAudio.mockResolvedValue(null);
      const read =
        surface === 'owner'
          ? service.getOwnerAudio(owner)
          : service.getPublicAudio({ slug: 'letter42' });
      await expect(read).rejects.toBeInstanceOf(AudioPageNotFoundError);
      expect(ports.storage.getObjectRange.mock.calls).toHaveLength(0);
    },
  );

  it.each([true, false])(
    'removes audio with cleanup enabled: %s',
    async (withCleanup) => {
      const service = await compose(withCleanup);
      ports.repository.removeCurrentAudio.mockResolvedValue({
        type: 'removed',
      });
      await expect(service.removeCurrentAudio(owner)).resolves.toBeUndefined();
      expect(ports.repository.removeCurrentAudio.mock.calls).toEqual([[owner]]);
      expect(ports.cleanup.runOnce.mock.calls).toHaveLength(
        withCleanup ? 1 : 0,
      );
      if (withCleanup)
        expect(
          ports.repository.removeCurrentAudio.mock.invocationCallOrder[0],
        ).toBeLessThan(ports.cleanup.runOnce.mock.invocationCallOrder[0]);
    },
  );

  it('keeps a completed removal when immediate cleanup fails, and skips cleanup for no current audio', async () => {
    const service = await compose(true);
    ports.repository.removeCurrentAudio.mockResolvedValue({ type: 'removed' });
    ports.cleanup.runOnce.mockRejectedValue(
      new Error('fixture cleanup unavailable'),
    );
    await expect(service.removeCurrentAudio(owner)).resolves.toBeUndefined();
    expect(ports.cleanup.runOnce.mock.calls).toHaveLength(1);
    ports.repository.removeCurrentAudio.mockResolvedValue({ type: 'none' });
    await expect(service.removeCurrentAudio(owner)).resolves.toBeUndefined();
    expect(ports.cleanup.runOnce.mock.calls).toHaveLength(1);
  });

  it.each([PAGE_AUDIO_REPOSITORY, MEDIA_STORAGE])(
    'requires dependency %s',
    async (token) => {
      const dependencies = [
        { provide: PAGE_AUDIO_REPOSITORY, useValue: ports.repository },
        { provide: MEDIA_STORAGE, useValue: ports.storage },
      ];
      await expect(
        Test.createTestingModule({
          providers: [
            pageAudioServiceProvider,
            ...dependencies.filter((binding) => binding.provide !== token),
          ],
        }).compile(),
      ).rejects.toThrow('dependencies');
    },
  );

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      removeCurrentAudio: jest
        .fn<PageAudioService['removeCurrentAudio']>()
        .mockResolvedValue(undefined),
    };
    module = await Test.createTestingModule({
      providers: [pageAudioServiceProvider],
    })
      .overrideProvider(PageAudioService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageAudioService)).toBe(replacement);
    await expect(
      module.get(PageAudioService).removeCurrentAudio(owner),
    ).resolves.toBeUndefined();
  });
});
