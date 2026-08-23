import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminModerationActionResponse,
  AdminReportActionRequest,
} from '@letterly/contracts';
import {
  ADMIN_MODERATION_REPOSITORY,
  AdminModerationIdempotencyConflictError,
  AdminModerationStaleVersionError,
  type AdminModerationRepository,
  type ReportModerationOperation,
} from './admin-moderation.repository';

@Injectable()
export class AdminModerationService {
  constructor(
    @Inject(ADMIN_MODERATION_REPOSITORY)
    private readonly repository: AdminModerationRepository,
  ) {}

  mutateReport(input: {
    actorId: string;
    reportId: string;
    operation: ReportModerationOperation;
    request: AdminReportActionRequest;
    requestId: string;
  }): Promise<AdminModerationActionResponse> {
    return this.repository.mutateReport(input);
  }
}

export {
  AdminModerationIdempotencyConflictError,
  AdminModerationStaleVersionError,
};
