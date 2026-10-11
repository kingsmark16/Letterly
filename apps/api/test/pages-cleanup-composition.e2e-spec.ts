import { firstMockCallOrder } from './support/required-test-value';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { MediaCleanupService } from '../src/modules/pages/application/media-cleanup.service';
import type { MediaCleanupRunner } from '../src/modules/pages/application/media-cleanup';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRepository,
  type MediaCleanupTask,
} from '../src/modules/pages/application/page-media.repository';
import {
  PAGE_AUDIO_REPOSITORY,
  type PageAudioRepository,
} from '../src/modules/pages/application/page-audio.repository';
import {
  MEDIA_STORAGE,
  MediaStorageUnavailableError,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import { MediaCleanupScheduler } from '../src/modules/pages/infrastructure/media-cleanup.scheduler';
import { mediaCleanupServiceProvider } from '../src/modules/pages/pages.module';

const now = new Date('2026-10-03T01:00:00Z');
const task: MediaCleanupTask = {
  id: 'task-1',
  objectKey: 'pages/page-1/audio/audio-1',
  status: 'PENDING',
  attempts: 0,
  nextRetryAt: null,
  lastFailureCode: null,
  leaseOwner: null,
  leaseExpiresAt: null,
};

function createPorts() {
  return {
    repository: {
      expireImages: jest
        .fn<PageMediaRepository['expireImages']>()
        .mockResolvedValue(undefined),
      claimCleanupTasks: jest
        .fn<PageMediaRepository['claimCleanupTasks']>()
        .mockResolvedValueOnce([task])
        .mockResolvedValue([]),
      markCleanupSucceeded: jest
        .fn<PageMediaRepository['markCleanupSucceeded']>()
        .mockResolvedValue(undefined),
      markCleanupFailed: jest
        .fn<PageMediaRepository['markCleanupFailed']>()
        .mockResolvedValue(undefined),
    },
    storage: {
      deleteObject: jest
        .fn<MediaStorage['deleteObject']>()
        .mockResolvedValue(undefined),
    },
    audioRepository: {
      expireAudio: jest
        .fn<PageAudioRepository['expireAudio']>()
        .mockResolvedValue(undefined),
    },
  };
}

describe('Cleanup service factory composition', () => {
  let module: TestingModule | undefined;
  let ports: ReturnType<typeof createPorts>;
  beforeEach(() => {
    ports = createPorts();
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  async function compose(withAudio = false) {
    const builder = Test.createTestingModule({
      providers: [
        mediaCleanupServiceProvider,
        { provide: PAGE_MEDIA_REPOSITORY, useValue: {} },
        { provide: MEDIA_STORAGE, useValue: {} },
        ...(withAudio
          ? [{ provide: PAGE_AUDIO_REPOSITORY, useValue: {} }]
          : []),
      ],
    })
      .overrideProvider(PAGE_MEDIA_REPOSITORY)
      .useValue(ports.repository)
      .overrideProvider(MEDIA_STORAGE)
      .useValue(ports.storage);
    if (withAudio)
      builder
        .overrideProvider(PAGE_AUDIO_REPOSITORY)
        .useValue(ports.audioRepository);
    module = await builder.compile();
    return module.get(MediaCleanupService);
  }

  it.each([true, false])(
    'preserves expiry order, leases, and task success with audio expiry enabled: %s',
    async (withAudio) => {
      const service = await compose(withAudio);
      expect(module?.get(MediaCleanupService)).toBe(service);
      await service.runOnce(now);
      expect(ports.repository.expireImages.mock.calls).toEqual([[{ now }]]);
      expect(ports.audioRepository.expireAudio.mock.calls).toEqual(
        withAudio ? [[{ now }]] : [],
      );
      const claim = ports.repository.claimCleanupTasks.mock.calls[0]?.[0];
      expect(claim).toMatchObject({
        now,
        leaseExpiresAt: new Date('2026-10-03T01:05:00Z'),
        limit: 4,
      });
      expect(claim?.workerId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(ports.storage.deleteObject.mock.calls).toEqual([[task.objectKey]]);
      expect(ports.repository.markCleanupSucceeded.mock.calls).toEqual([
        [{ taskId: task.id, workerId: claim?.workerId }],
      ]);
      expect(ports.repository.markCleanupFailed.mock.calls).toHaveLength(0);
      expect(firstMockCallOrder(ports.repository.expireImages)).toBeLessThan(
        firstMockCallOrder(ports.repository.claimCleanupTasks),
      );
      if (withAudio) {
        expect(firstMockCallOrder(ports.repository.expireImages)).toBeLessThan(
          firstMockCallOrder(ports.audioRepository.expireAudio),
        );
        expect(
          firstMockCallOrder(ports.audioRepository.expireAudio),
        ).toBeLessThan(firstMockCallOrder(ports.repository.claimCleanupTasks));
      }
    },
  );

  it.each([
    [new MediaStorageUnavailableError(), 'STORAGE_UNAVAILABLE'],
    [new Error('fixture delete unavailable'), 'DELETE_FAILED'],
  ] as const)(
    'retains safe task failure code %s',
    async (failure, failureCode) => {
      const service = await compose();
      ports.storage.deleteObject.mockRejectedValue(failure);
      await service.runOnce(now);
      const claim = ports.repository.claimCleanupTasks.mock.calls[0]?.[0];
      expect(ports.repository.markCleanupFailed.mock.calls).toEqual([
        [{ taskId: task.id, workerId: claim?.workerId, now, failureCode }],
      ]);
      expect(ports.repository.markCleanupSucceeded.mock.calls).toHaveLength(0);
    },
  );

  it.each([PAGE_MEDIA_REPOSITORY, MEDIA_STORAGE])(
    'requires dependency %s',
    async (token) => {
      const dependencies = [
        { provide: PAGE_MEDIA_REPOSITORY, useValue: ports.repository },
        { provide: MEDIA_STORAGE, useValue: ports.storage },
      ];
      await expect(
        Test.createTestingModule({
          providers: [
            mediaCleanupServiceProvider,
            ...dependencies.filter((binding) => binding.provide !== token),
          ],
        }).compile(),
      ).rejects.toThrow('dependencies');
    },
  );

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      runOnce: jest
        .fn<MediaCleanupRunner['runOnce']>()
        .mockResolvedValue(undefined),
    };
    module = await Test.createTestingModule({
      providers: [mediaCleanupServiceProvider],
    })
      .overrideProvider(MediaCleanupService)
      .useValue(replacement)
      .compile();
    expect(module.get(MediaCleanupService)).toBe(replacement);
    await module.get(MediaCleanupService).runOnce(now);
    expect(replacement.runOnce.mock.calls).toEqual([[now]]);
  });
});

describe('Cleanup scheduler Nest lifecycle', () => {
  let module: TestingModule | undefined;
  let runOnce: ReturnType<typeof jest.fn<MediaCleanupRunner['runOnce']>>;
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    runOnce = jest
      .fn<MediaCleanupRunner['runOnce']>()
      .mockResolvedValue(undefined);
  });
  afterEach(async () => {
    await module?.close();
    module = undefined;
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function initialize() {
    module = await Test.createTestingModule({
      providers: [mediaCleanupServiceProvider, MediaCleanupScheduler],
    })
      .overrideProvider(MediaCleanupService)
      .useValue({ runOnce })
      .compile();
    await module.init();
  }

  it('starts one unreferenced interval, waits fifteen minutes, and stops on module shutdown', async () => {
    const intervalSpy = jest.spyOn(globalThis, 'setInterval');
    await initialize();
    expect(jest.getTimerCount()).toBe(1);
    expect(runOnce.mock.calls).toHaveLength(0);
    expect(intervalSpy.mock.calls[0]?.[1]).toBe(900000);
    const handle = intervalSpy.mock.results[0]?.value as
      ReturnType<typeof setInterval> | undefined;
    expect(handle?.hasRef()).toBe(false);
    await jest.advanceTimersByTimeAsync(899999);
    expect(runOnce.mock.calls).toHaveLength(0);
    await jest.advanceTimersByTimeAsync(1);
    expect(runOnce.mock.calls).toEqual([[]]);
    await module?.close();
    module = undefined;
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(900000);
    expect(runOnce.mock.calls).toHaveLength(1);
  });

  it('suppresses a scheduled failure and runs again on the next interval', async () => {
    runOnce.mockRejectedValueOnce(
      new Error('fixture scheduled cleanup unavailable'),
    );
    await initialize();
    await jest.advanceTimersByTimeAsync(900000);
    expect(runOnce.mock.calls).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(900000);
    expect(runOnce.mock.calls).toHaveLength(2);
    expect(jest.getTimerCount()).toBe(1);
  });

  it('cancels a pending first execution when the module closes early', async () => {
    await initialize();
    await module?.close();
    module = undefined;
    expect(jest.getTimerCount()).toBe(0);
    await jest.advanceTimersByTimeAsync(1800000);
    expect(runOnce.mock.calls).toHaveLength(0);
  });
});
