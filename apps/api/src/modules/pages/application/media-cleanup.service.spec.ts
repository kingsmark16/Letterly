import type { MediaStorage } from '../../../infrastructure/storage/media-storage';
import { MediaCleanupService } from './media-cleanup.service';
import type {
  MediaCleanupTask,
  PageMediaRepository,
} from './page-media.repository';

function createRepository(): jest.Mocked<PageMediaRepository> {
  return {
    prepareImage: jest.fn(),
    listOwnerImages: jest.fn(),
    claimImage: jest.fn(),
    markImageFailed: jest.fn(),
    markImageReady: jest.fn(),
    retryImage: jest.fn(),
    removeImage: jest.fn(),
    getOwnerImage: jest.fn(),
    getPublicImage: jest.fn(),
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
  let repository: jest.Mocked<PageMediaRepository>;
  let storage: jest.Mocked<MediaStorage>;
  let service: MediaCleanupService;

  beforeEach(() => {
    repository = createRepository();
    storage = createStorage();
    service = new MediaCleanupService(repository, storage);
  });

  it('AC-12 expires database records before processing cleanup tasks', async () => {
    const now = new Date('2026-08-11T01:00:00.000Z');
    const task = createTask();
    repository.claimCleanupTasks.mockResolvedValue([task]);

    await service.runOnce(now);

    expect(repository.expireImages.mock.calls).toEqual([[{ now }]]);
    expect(repository.claimCleanupTasks.mock.calls).toEqual([
      [
        expect.objectContaining({
          now,
          limit: 50,
          leaseExpiresAt: new Date('2026-08-11T01:05:00.000Z'),
        }),
      ],
    ]);
    expect(storage.deleteObject.mock.calls).toEqual([[task.objectKey]]);
    expect(repository.markCleanupSucceeded.mock.calls).toEqual([
      [expect.objectContaining({ taskId: task.id })],
    ]);
  });

  it('AC-12 records a safe retry state when storage deletion fails', async () => {
    const task = createTask({ attempts: 4 });
    repository.claimCleanupTasks.mockResolvedValue([task]);
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
});
