import type { MediaStorage } from './media-storage';
import { MediaCleanupService } from './media-cleanup.service';
import type { PageMediaRepository } from './page-media.repository';
import type {
  MediaCleanupTask,
  MediaCleanupRepository,
} from './media-cleanup.repository';

type CleanupPorts = Pick<PageMediaRepository, 'expireImages'> &
  MediaCleanupRepository;

function createRepository(): jest.Mocked<CleanupPorts> {
  return {
    expireImages: jest.fn(),
    claimCleanupTasks: jest.fn(),
    markCleanupSucceeded: jest.fn(),
    markCleanupFailed: jest.fn(),
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

function createTask(
  overrides: Partial<MediaCleanupTask> = {},
): MediaCleanupTask {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    objectKey: 'pages/page-1/images/image-1.webp',
    status: 'PENDING',
    attempts: 0,
    nextRetryAt: null,
    lastFailureCode: null,
    leaseOwner: 'worker-1',
    leaseExpiresAt: new Date('2026-08-11T01:05:00.000Z'),
    ...overrides,
  };
}

describe('MediaCleanupService', () => {
  let repository: jest.Mocked<CleanupPorts>;
  let storage: jest.Mocked<MediaStorage>;
  let service: MediaCleanupService;

  beforeEach(() => {
    repository = createRepository();
    storage = createStorage();
    service = new MediaCleanupService(repository, storage, repository);
  });

  it('AC-12 expires database records before processing cleanup tasks', async () => {
    const now = new Date('2026-08-11T01:00:00.000Z');
    const task = createTask();
    repository.claimCleanupTasks
      .mockResolvedValueOnce([task])
      .mockResolvedValue([]);

    await service.runOnce(now);

    expect(repository.expireImages.mock.calls).toEqual([[{ now }]]);
    expect(repository.claimCleanupTasks.mock.calls[0]).toEqual([
      expect.objectContaining({
        now,
        limit: 4,
        leaseExpiresAt: new Date('2026-08-11T01:05:00.000Z'),
      }),
    ]);
    expect(storage.deleteObject.mock.calls).toEqual([[task.objectKey]]);
    expect(repository.markCleanupSucceeded.mock.calls).toEqual([
      [expect.objectContaining({ taskId: task.id })],
    ]);
  });

  it('AC-12 records a safe retry state when storage deletion fails', async () => {
    const task = createTask({ attempts: 4 });
    repository.claimCleanupTasks
      .mockResolvedValueOnce([task])
      .mockResolvedValue([]);
    storage.deleteObject.mockRejectedValue(new Error('provider details'));

    await service.runOnce(new Date('2026-08-11T01:00:00.000Z'));

    expect(repository.markCleanupFailed.mock.calls).toEqual([
      [
        expect.objectContaining({
          taskId: task.id,
          failureCode: 'DELETE_FAILED',
        }),
      ],
    ]);
    expect(repository.markCleanupSucceeded.mock.calls).toHaveLength(0);
  });

  it('processes at most 50 tasks from a backlog with four concurrent deletes', async () => {
    const tasks = Array.from({ length: 75 }, (_, index) =>
      createTask({ id: `task-${index}`, objectKey: `objects/${index}` }),
    );
    repository.claimCleanupTasks.mockImplementation(({ limit }) =>
      Promise.resolve(tasks.splice(0, limit)),
    );
    let active = 0;
    let peak = 0;
    storage.deleteObject.mockImplementation(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
    });

    await service.runOnce();

    expect(storage.deleteObject.mock.calls).toHaveLength(50);
    expect(repository.markCleanupSucceeded.mock.calls).toHaveLength(50);
    expect(repository.markCleanupFailed.mock.calls).toHaveLength(0);
    expect(peak).toBe(4);
    expect(active).toBe(0);
    expect(tasks).toHaveLength(25);
    expect(repository.claimCleanupTasks.mock.calls).toHaveLength(13);
    expect(repository.claimCleanupTasks.mock.calls.at(-1)?.[0].limit).toBe(2);
  });

  it('shares an overlapping run and accepts a new timestamp after it settles', async () => {
    const now = new Date('2026-10-04T00:00:00Z');
    const later = new Date('2026-10-04T00:15:00Z');
    let completeExpiry!: () => void;
    repository.expireImages.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        completeExpiry = resolve;
      }),
    );
    repository.claimCleanupTasks.mockResolvedValue([]);

    const first = service.runOnce(now);
    expect(service.runOnce(later)).toBe(first);
    expect(repository.expireImages.mock.calls).toEqual([[{ now }]]);
    completeExpiry();
    await first;
    await service.runOnce(later);

    expect(repository.expireImages.mock.calls).toEqual([
      [{ now }],
      [{ now: later }],
    ]);
    expect(repository.claimCleanupTasks.mock.calls).toHaveLength(2);
  });

  it('keeps the overlap guard until the active group settles after a retry write failure', async () => {
    const retryFailure = new Error('retry write unavailable');
    const blocked = createTask({ id: 'blocked', objectKey: 'objects/blocked' });
    const failed = createTask({ id: 'failed', objectKey: 'objects/failed' });
    let finishDelete!: () => void;
    const pendingDelete = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    repository.claimCleanupTasks
      .mockResolvedValueOnce([failed, blocked])
      .mockResolvedValue([]);
    storage.deleteObject.mockImplementation((key) =>
      key === failed.objectKey
        ? Promise.reject(new Error('storage unavailable'))
        : pendingDelete,
    );
    repository.markCleanupFailed.mockRejectedValue(retryFailure);

    const first = service.runOnce();
    const result = first.catch((error: unknown) => error);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(repository.markCleanupFailed.mock.calls).toHaveLength(1);
    expect(service.runOnce()).toBe(first);
    expect(repository.expireImages.mock.calls).toHaveLength(1);

    finishDelete();
    expect(await result).toBe(retryFailure);
    await service.runOnce();
    expect(repository.expireImages.mock.calls).toHaveLength(2);
    expect(repository.markCleanupSucceeded.mock.calls).toHaveLength(1);
  });

  it('grants later groups a new lease instead of leasing tasks while they wait', async () => {
    const now = new Date('2026-10-04T00:00:00Z');
    const clock = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(0)
      .mockReturnValue(400_000);
    repository.claimCleanupTasks
      .mockResolvedValueOnce([createTask()])
      .mockResolvedValue([]);
    try {
      await service.runOnce(now);
      expect(repository.claimCleanupTasks.mock.calls[0]?.[0]).toMatchObject({
        now,
        limit: 4,
        leaseExpiresAt: new Date('2026-10-04T00:05:00Z'),
      });
      expect(repository.claimCleanupTasks.mock.calls[1]?.[0]).toMatchObject({
        now,
        limit: 4,
        leaseExpiresAt: new Date('2026-10-04T00:11:40Z'),
      });
    } finally {
      clock.mockRestore();
    }
  });
});
