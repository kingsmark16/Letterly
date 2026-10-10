import { randomUUID } from 'node:crypto';
import {
  MediaStorageUnavailableError,
  type MediaStorage,
} from './media-storage';
import type {
  MediaCleanupTask,
  PageMediaRepository,
} from './page-media.repository';
import type { PageAudioRepository } from './page-audio.repository';
import type { MediaCleanupRunner } from './media-cleanup';

const CLEANUP_LEASE_MS = 5 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 50;

export class MediaCleanupService implements MediaCleanupRunner {
  constructor(
    private readonly repository: PageMediaRepository,
    private readonly storage: MediaStorage,
    private readonly audioRepository?: PageAudioRepository,
  ) {}

  async runOnce(now = new Date()): Promise<void> {
    await this.repository.expireImages({ now });
    await this.audioRepository?.expireAudio({ now });

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
