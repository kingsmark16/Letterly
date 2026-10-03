export const ADMIN_RETENTION_REPOSITORY = Symbol('ADMIN_RETENTION_REPOSITORY');

export type RetentionFailureCode =
  | 'DB_TIMEOUT'
  | 'SERIALIZATION_RETRY_EXHAUSTED'
  | 'CONSTRAINT_CONFLICT'
  | 'UNKNOWN';

export interface RetentionRunResult {
  acquired: boolean;
  claimed: number;
  deleted: number;
}

export interface AdminRetentionRepository {
  run(input: {
    now: Date;
    retentionDays: number;
    batchSize: number;
  }): Promise<RetentionRunResult>;
  recordSuccess(input: {
    now: Date;
    claimed: number;
    deleted: number;
  }): Promise<void>;
  recordFailure(input: {
    now: Date;
    failureCode: RetentionFailureCode;
  }): Promise<void>;
}
