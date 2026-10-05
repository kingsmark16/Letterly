export const MEDIA_CLEANUP_REPOSITORY = Symbol('MEDIA_CLEANUP_REPOSITORY');

export interface MediaCleanupTask {
  id: string;
  objectKey: string;
  status: 'PENDING' | 'REVIEW';
  attempts: number;
  nextRetryAt: Date | null;
  lastFailureCode: string | null;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
}

export interface MediaCleanupRepository {
  claimCleanupTasks(input: {
    now: Date;
    workerId: string;
    leaseExpiresAt: Date;
    limit: number;
  }): Promise<MediaCleanupTask[]>;
  markCleanupSucceeded(input: {
    taskId: string;
    workerId: string;
  }): Promise<void>;
  markCleanupFailed(input: {
    taskId: string;
    workerId: string;
    now: Date;
    failureCode: string;
  }): Promise<void>;
}
