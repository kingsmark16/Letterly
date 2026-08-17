import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import type { PublicReportRequest } from '@letterly/contracts/reports';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CreatePublicReportResult,
  PageReportsRepository,
} from '../application/page-reports.repository';

@Injectable()
export class PrismaPageReportsRepository implements PageReportsRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findPublishedPageScope(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        slug,
        status: 'PUBLISHED',
        slugReservations: {
          some: { normalizedSlug: slug, isCurrent: true },
        },
      },
      select: { id: true },
    });
    return page?.id ?? null;
  }

  async createPublicReport(
    input: PublicReportRequest & { slug: string },
  ): Promise<CreatePublicReportResult> {
    const pageId = await this.findPublishedPageScope(input.slug);
    if (!pageId) {
      return { type: 'not_found' };
    }

    const report = await this.prisma.pageReport.create({
      data: {
        pageId,
        reason: input.reason,
        message: input.message?.trim() || null,
      },
      select: { id: true },
    });
    return { type: 'created', reportId: report.id };
  }
}
