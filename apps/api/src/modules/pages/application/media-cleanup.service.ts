import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  MEDIA_STORAGE,
  MediaStorageUnavailableError,
  type MediaStorage,
} from '../../../infrastructure/storage/media-storage';
import {
  PAGE_MEDIA_REPOSITORY,
  type MediaCleanupTask,
  type PageMediaRepository,
} from './page-media.repository';

export const MEDIA_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const CLEANUP_LEASE_MS = 5 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 50;

@Injectable()
export class MediaCleanupService implements OnModuleInit, OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(PAGE_MEDIA_REPOSITORY)
    private readonly repository: PageMediaRepository,
    @Inject(MEDIA_STORAGE)
    private readonly storage: MediaStorage,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.runOnce().catch(() => undefined);
    }, MEDIA_CLEANUP_INTERVAL_MS);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async runOnce(now = new Date()): Promise<void> {
    await this.repository.expireImages({ now });

    const workerId = randomUUID();
    const tasks = await this.repository.claimCleanupTasks({
      now,
      workerId,
      leaseExpiresAt: new Date(now.getTime() + CLEANUP_LEASE_MS),
      limit: CLEANUP_BATCH_SIZE,
    });

    await Promise.all(
      tasks.map((task) => this.processTask(task, workerId, now)),
    );
  }

  private async processTask(
    task: MediaCleanupTask,
    workerId: string,
    now: Date,
  ): Promise<void> {
    try {
      await this.storage.deleteObject(task.objectKey);
      await this.repository.markCleanupSucceeded({
        taskId: task.id,
        workerId,
      });
    } catch (error: unknown) {
      await this.repository.markCleanupFailed({
        taskId: task.id,
        workerId,
        now,
        failureCode:
          error instanceof MediaStorageUnavailableError
            ? 'STORAGE_UNAVAILABLE'
            : 'DELETE_FAILED',
      });
    }
  }
}
