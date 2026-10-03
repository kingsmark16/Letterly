import type {
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportListResponse,
} from '@letterly/contracts';
import { type AdminReportsRepository } from './admin-reports.repository';
import type { AdminCursorPort } from './admin-cursor';

export class AdminReportNotFoundError extends Error {
  constructor() {
    super('Administrator report not found');
  }
}

export class AdminReportsService {
  constructor(
    private readonly repository: AdminReportsRepository,
    private readonly cursors: AdminCursorPort,
  ) {}

  async list(query: AdminReportListQuery): Promise<AdminReportListResponse> {
    const filterHash = this.cursors.filterHash({
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
