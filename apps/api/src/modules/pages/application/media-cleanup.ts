export interface MediaCleanupRunner {
  runOnce(now?: Date): Promise<void>;
}
