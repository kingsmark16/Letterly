import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import type { PublicReportRequest } from '@letterly/contracts/reports';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CreatePublicReportResult,
  PageReportsRepository,
} from '../application/page-reports.repository';
import {
  publicPageAvailabilityWhere,
  lockPublicPage,
} from './public-availability';

@Injectable()
export class PrismaPageReportsRepository implements PageReportsRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findPublishedPageScope(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findFirst({
      where: publicPageAvailabilityWhere(slug),
      select: { id: true },
    });
    return page?.id ?? null;
  }

  async createPublicReport(
    input: PublicReportRequest & { slug: string },
  ): Promise<CreatePublicReportResult> {
    return this.prisma.$transaction(async (transaction) => {
      const page = await lockPublicPage(transaction, input.slug);
      if (!page) {
        return { type: 'not_found' };
      }

      const report = await transaction.pageReport.create({
        data: {
          pageId: page.id,
          reason: input.reason,
          message: input.message?.trim() || null,
        },
        select: { id: true },
      });
      return { type: 'created', reportId: report.id };
    });
  }
}
