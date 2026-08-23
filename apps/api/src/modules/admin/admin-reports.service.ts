import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportListResponse,
} from '@letterly/contracts';
import {
  ADMIN_REPORTS_REPOSITORY,
  type AdminReportsRepository,
} from './admin-reports.repository';
import {
  AdminCursorService,
  adminFilterHash,
  InvalidAdminCursorError,
} from './admin-cursor.service';

export class AdminReportNotFoundError extends Error {
  constructor() {
    super('Administrator report not found');
  }
}

@Injectable()
export class AdminReportsService {
  constructor(
    @Inject(ADMIN_REPORTS_REPOSITORY)
    private readonly repository: AdminReportsRepository,
    private readonly cursors: AdminCursorService,
  ) {}

  async list(query: AdminReportListQuery): Promise<AdminReportListResponse> {
    const filterHash = adminFilterHash({
      status: query.status ?? null,
      reason: query.reason ?? null,
      pageId: query.pageId ?? null,
      userId: query.userId ?? null,
    });
    let cursor = null;
    if (query.cursor) {
      cursor = this.cursors.decode({
        cursor: query.cursor,
        filterHash,
        size: query.size,
      });
    }

    const result = await this.repository.listReports({ query, cursor });
    return {
      items: result.items,
      nextCursor: result.nextPosition
        ? this.cursors.encode({
            position: result.nextPosition,
            filterHash,
            size: query.size,
          })
        : null,
    };
  }

  async detail(reportId: string): Promise<AdminReportDetail> {
    const report = await this.repository.findReport(reportId);
    if (!report) throw new AdminReportNotFoundError();
    return report;
  }
}

export { InvalidAdminCursorError };
