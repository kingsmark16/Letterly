import type {
  AdminAppealCreateRequest,
  AdminAppealDecisionRequest,
  AdminAppealResponse,
  AdminModerationActionResponse,
  AdminPageDisableRequest,
  AdminPageModerationResponse,
  AdminPageRestoreRequest,
  AdminReportActionRequest,
  AdminUserDisableRequest,
  AdminUserModerationResponse,
  AdminUserRestoreRequest,
} from '@letterly/contracts';

export const ADMIN_MODERATION_REPOSITORY = Symbol(
  'ADMIN_MODERATION_REPOSITORY',
);

export type ReportModerationOperation =
  'REPORT_REVIEW' | 'REPORT_DISMISS' | 'REPORT_REOPEN';

export class AdminModerationStaleVersionError extends Error {
  constructor() {
    super('Moderation state changed');
  }
}

export class AdminModerationIdempotencyConflictError extends Error {
  constructor() {
    super('Idempotency key was already used for another request');
  }
}

export class AdminModerationNotFoundError extends Error {
  constructor() {
    super('Moderation target not found');
  }
}

export class AdminProtectedTargetError extends Error {
  constructor() {
    super('Target cannot be disabled');
  }
}

export class AdminAppealTransitionError extends Error {
  constructor() {
    super('Appeal transition is not valid');
  }
}

export class AdminModerationTransitionError extends Error {
  constructor() {
    super('Moderation transition is not valid');
  }
}

export interface AdminModerationRepository {
  mutateReport(input: {
    actorId: string;
    reportId: string;
    operation: ReportModerationOperation;
    request: AdminReportActionRequest;
    requestId: string;
  }): Promise<AdminModerationActionResponse>;
  mutatePage(input: {
    actorId: string;
    pageId: string;
    operation: 'PAGE_DISABLE' | 'PAGE_RESTORE';
    request: AdminPageDisableRequest | AdminPageRestoreRequest;
    requestId: string;
  }): Promise<AdminPageModerationResponse>;
  mutateUser(input: {
    actorId: string;
    userId: string;
    operation: 'USER_DISABLE' | 'USER_RESTORE';
    request: AdminUserDisableRequest | AdminUserRestoreRequest;
    requestId: string;
  }): Promise<AdminUserModerationResponse>;
  createAppeal(input: {
    actorId: string;
    request: AdminAppealCreateRequest;
    requestId: string;
  }): Promise<AdminAppealResponse>;
  mutateAppeal(input: {
    actorId: string;
    appealId: string;
    operation: 'APPEAL_ACCEPT' | 'APPEAL_REJECT';
    request: AdminAppealDecisionRequest;
    requestId: string;
  }): Promise<AdminAppealResponse>;
}
