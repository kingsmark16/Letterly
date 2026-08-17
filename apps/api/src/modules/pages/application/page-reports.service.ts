import { Inject, Injectable } from '@nestjs/common';
import type { PublicReportRequest } from '@letterly/contracts/reports';
import {
  PAGE_REPORTS_REPOSITORY,
  type PageReportsRepository,
} from './page-reports.repository';

export class PublicReportPageNotFoundError extends Error {
  constructor() {
    super('This letter is not available');
    this.name = 'PublicReportPageNotFoundError';
  }
}

export class PublicReportUnavailableError extends Error {
  constructor() {
    super('Report service unavailable');
    this.name = 'PublicReportUnavailableError';
  }
}

@Injectable()
export class PageReportsService {
  constructor(
    @Inject(PAGE_REPORTS_REPOSITORY)
    private readonly repository: PageReportsRepository,
  ) {}

  async findPublicPageScope(slug: string): Promise<string> {
    let pageId: string | null;
    try {
      pageId = await this.repository.findPublishedPageScope(
        slug.trim().toLowerCase(),
      );
    } catch {
      throw new PublicReportUnavailableError();
    }
    if (!pageId) {
      throw new PublicReportPageNotFoundError();
    }
    return pageId;
  }

  async create(
    input: PublicReportRequest & { slug: string },
  ): Promise<{ accepted: true; reportId: string }> {
    let result: Awaited<
      ReturnType<PageReportsRepository['createPublicReport']>
    >;
    try {
      result = await this.repository.createPublicReport({
        slug: input.slug.trim().toLowerCase(),
        reason: input.reason,
        message: input.message,
      });
    } catch {
      throw new PublicReportUnavailableError();
    }
    if (result.type === 'not_found') {
      throw new PublicReportPageNotFoundError();
    }
    return { accepted: true, reportId: result.reportId };
  }
}
