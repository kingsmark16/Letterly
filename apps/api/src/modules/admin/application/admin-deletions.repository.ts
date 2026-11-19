import type {
  DeletionAcceptRequest,
  DeletionImpactCounts,
  DeletionJobDetail,
  DeletionJobSummary,
  DeletionListQuery,
  DeletionPreview,
  DeletionRetryRequest,
} from '@letterly/contracts';
import type { AdminCursorPosition } from './admin-cursor';

export const ADMIN_DELETIONS_REPOSITORY = Symbol('ADMIN_DELETIONS_REPOSITORY');
export type DeletionErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'PROTECTED_TARGET'
  | 'DELETION_IN_PROGRESS'
  | 'STALE_MODERATION_VERSION'
  | 'STALE_DELETION_IMPACT'
  | 'INVALID_DELETION_STATE'
  | 'IDEMPOTENCY_CONFLICT';
export class AdminDeletionError extends Error {
  constructor(readonly code: DeletionErrorCode) {
    super(code);
  }
}
export interface DeletionReadPage {
  items: DeletionJobSummary[];
  nextPosition: AdminCursorPosition | null;
}
export interface AdminDeletionsRepository {
  preview(
    actorId: string,
    pageId: string,
    version: number,
    targetType?: 'PAGE' | 'CREATOR',
  ): Promise<DeletionPreview>;
  accept(
    actorId: string,
    pageId: string,
    request: DeletionAcceptRequest,
    requestId: string,
    targetType?: 'PAGE' | 'CREATOR',
    enabled?: boolean,
  ): Promise<DeletionJobSummary>;
  retry(
    actorId: string,
    jobId: string,
    request: DeletionRetryRequest,
    requestId: string,
  ): Promise<DeletionJobSummary>;
  get(jobId: string): Promise<DeletionJobDetail | null>;
  list(
    query: DeletionListQuery,
    position: AdminCursorPosition | null,
    parentId?: string,
  ): Promise<DeletionReadPage>;
}
export interface DeletionTokenPort {
  issue(input: {
    actorId: string;
    targetId: string;
    targetType?: 'PAGE' | 'CREATOR';
    expectedModerationVersion: number;
    counts: DeletionImpactCounts;
    now: Date;
  }): { confirmationToken: string; issuedAt: string; expiresAt: string };
  verify(
    token: string,
    input: {
      actorId: string;
      targetId: string;
      targetType?: 'PAGE' | 'CREATOR';
      expectedModerationVersion: number;
      counts: DeletionImpactCounts;
      now: Date;
    },
  ): void;
}
