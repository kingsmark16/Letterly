import type { PublicReportRequest } from '@letterly/contracts/reports';

export const PAGE_REPORTS_REPOSITORY = Symbol('PAGE_REPORTS_REPOSITORY');

export type CreatePublicReportResult =
  { type: 'created'; reportId: string } | { type: 'not_found' };

export interface PageReportsRepository {
  findPublishedPageScope(slug: string): Promise<string | null>;
  createPublicReport(
    input: PublicReportRequest & { slug: string },
  ): Promise<CreatePublicReportResult>;
}
