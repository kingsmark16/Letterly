import type {
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportSummary,
} from '@letterly/contracts';

export const ADMIN_REPORTS_REPOSITORY = Symbol('ADMIN_REPORTS_REPOSITORY');

export interface AdminReportCursorPosition {
  createdAt: Date;
  id: string;
}

export interface AdminReportsRepository {
  listReports(input: {
    query: AdminReportListQuery;
    cursor: AdminReportCursorPosition | null;
  }): Promise<{
    items: AdminReportSummary[];
    nextPosition: AdminReportCursorPosition | null;
  }>;
  findReport(reportId: string): Promise<AdminReportDetail | null>;
}
