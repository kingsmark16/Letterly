import { randomUUID } from 'node:crypto';
import {
  MediaStorageUnavailableError,
  type MediaStorage,
} from './media-storage';
import type { PageMediaRepository } from './page-media.repository';
import type {
  MediaCleanupTask,
  MediaCleanupRepository,
} from './media-cleanup.repository';
import type { PageAudioRepository } from './page-audio.repository';
import {
  MEDIA_CLEANUP_BATCH_SIZE,
  MEDIA_CLEANUP_CONCURRENCY,
  type MediaCleanupRunner,
} from './media-cleanup';

const CLEANUP_LEASE_MS = 5 * 60 * 1000;

export class MediaCleanupService implements MediaCleanupRunner {
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly repository: Pick<PageMediaRepository, 'expireImages'>,
    private readonly storage: MediaStorage,
    private readonly cleanupRepository: MediaCleanupRepository,
    private readonly audioRepository?: PageAudioRepository,
  ) {}

  runOnce(now = new Date()): Promise<void> {
    if (this.inFlight) return this.inFlight;

    const run = this.runBatch(now);
    this.inFlight = run;
    void run.then(
      () => this.releaseRun(run),
      () => this.releaseRun(run),
    );
    return run;
  }

  private releaseRun(run: Promise<void>): void {
    if (this.inFlight === run) this.inFlight = null;
  }

  private async runBatch(now: Date): Promise<void> {
    await this.repository.expireImages({ now });
    await this.audioRepository?.expireAudio({ now });

    const workerId = randomUUID();
    const startedAt = performance.now();
    let claimedCount = 0;
    while (claimedCount < MEDIA_CLEANUP_BATCH_SIZE) {
      const elapsed =
        claimedCount === 0 ? 0 : Math.max(0, performance.now() - startedAt);
      const tasks = await this.cleanupRepository.claimCleanupTasks({
        now,
        workerId,
        leaseExpiresAt: new Date(now.getTime() + elapsed + CLEANUP_LEASE_MS),
        limit: Math.min(
          MEDIA_CLEANUP_CONCURRENCY,
          MEDIA_CLEANUP_BATCH_SIZE - claimedCount,
        ),
      });
      if (tasks.length === 0) return;
      claimedCount += tasks.length;
      const results = await Promise.allSettled(
        tasks.map((task) => this.processTask(task, workerId, now)),
      );
      for (const result of results) {
        if (result.status === 'rejected') {
          const error: unknown = result.reason;
          throw error;
        }
      }
    }
  }

  private async processTask(
    task: MediaCleanupTask,
    workerId: string,
    now: Date,
  ): Promise<void> {
    try {
      await this.storage.deleteObject(task.objectKey);
      await this.cleanupRepository.markCleanupSucceeded({
        taskId: task.id,
        workerId,
      });
    } catch (error: unknown) {
      await this.cleanupRepository.markCleanupFailed({
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
