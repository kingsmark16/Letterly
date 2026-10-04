export const MEDIA_CLEANUP_BATCH_SIZE = 50;
export const MEDIA_CLEANUP_CONCURRENCY = 4;

export interface MediaCleanupRunner {
  runOnce(now?: Date): Promise<void>;
}
