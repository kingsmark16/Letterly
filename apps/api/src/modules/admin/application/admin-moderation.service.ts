import type {
  AdminAppealCreateRequest,
  AdminAppealDecisionRequest,
  AdminAppealResponse,
  AdminPageDisableRequest,
  AdminPageModerationResponse,
  AdminPageRestoreRequest,
  AdminModerationActionResponse,
  AdminReportActionRequest,
  AdminUserDisableRequest,
  AdminUserModerationResponse,
  AdminUserRestoreRequest,
} from '@letterly/contracts';
import {
  type AdminModerationRepository,
  type ReportModerationOperation,
} from './admin-moderation.repository';

export class AdminModerationService {
  constructor(private readonly repository: AdminModerationRepository) {}

  mutateReport(input: {
    actorId: string;
    reportId: string;
    operation: ReportModerationOperation;
    request: AdminReportActionRequest;
    requestId: string;
  }): Promise<AdminModerationActionResponse> {
    return this.repository.mutateReport(input);
  }

  mutatePage(input: {
    actorId: string;
    pageId: string;
    operation: 'PAGE_DISABLE' | 'PAGE_RESTORE';
    request: AdminPageDisableRequest | AdminPageRestoreRequest;
    requestId: string;
  }): Promise<AdminPageModerationResponse> {
    return this.repository.mutatePage(input);
  }

  mutateUser(input: {
    actorId: string;
    userId: string;
    operation: 'USER_DISABLE' | 'USER_RESTORE';
    request: AdminUserDisableRequest | AdminUserRestoreRequest;
    requestId: string;
  }): Promise<AdminUserModerationResponse> {
    return this.repository.mutateUser(input);
  }

  createAppeal(input: {
    actorId: string;
    request: AdminAppealCreateRequest;
    requestId: string;
  }): Promise<AdminAppealResponse> {
    return this.repository.createAppeal(input);
  }

  mutateAppeal(input: {
    actorId: string;
    appealId: string;
    operation: 'APPEAL_ACCEPT' | 'APPEAL_REJECT';
    request: AdminAppealDecisionRequest;
    requestId: string;
  }): Promise<AdminAppealResponse> {
    return this.repository.mutateAppeal(input);
  }
}
