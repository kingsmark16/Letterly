import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient, Prisma } from '@letterly/database';
import type {
  AdminReportDetail,
  AdminReportListQuery,
  AdminReportSummary,
} from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';

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

const reportSummarySelect = {
  id: true,
  pageId: true,
  reason: true,
  message: true,
  status: true,
  moderationVersion: true,
  createdAt: true,
  updatedAt: true,
  page: { select: { creatorId: true } },
  _count: { select: { moderationActions: true } },
} as const;

const reportDetailSelect = {
  ...reportSummarySelect,
  page: {
    select: {
      creatorId: true,
      moderationStatus: true,
      creator: { select: { moderationStatus: true } },
    },
  },
  moderationActions: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      targetType: true,
      targetId: true,
      actionType: true,
      reasonCode: true,
      note: true,
      previousState: true,
      resultingState: true,
      actorId: true,
      requestId: true,
      createdAt: true,
      appealOrigin: {
        select: {
          id: true,
          originalActionId: true,
          status: true,
          externalReference: true,
          reasonCode: true,
          moderationVersion: true,
          requestedAt: true,
          resolvedAt: true,
        },
      },
    },
  },
} satisfies Prisma.PageReportSelect;

function summaryFromRow(
  row: Prisma.PageReportGetPayload<{ select: typeof reportSummarySelect }>,
): AdminReportSummary {
  return {
    id: row.id,
    pageId: row.pageId,
    creatorId: row.page.creatorId,
    reason: row.reason,
    message: row.message,
    status: row.status,
    moderationVersion: row.moderationVersion,
    actionCount: row._count.moderationActions,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PrismaAdminReportsRepository implements AdminReportsRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async listReports(input: {
    query: AdminReportListQuery;
    cursor: AdminReportCursorPosition | null;
  }): Promise<{
    items: AdminReportSummary[];
    nextPosition: AdminReportCursorPosition | null;
  }> {
    const where: Prisma.PageReportWhereInput = {
      ...(input.query.status ? { status: input.query.status } : {}),
      ...(input.query.reason ? { reason: input.query.reason } : {}),
      page: {
        ...(input.query.pageId ? { id: input.query.pageId } : {}),
        ...(input.query.userId ? { creatorId: input.query.userId } : {}),
      },
      ...(input.cursor
        ? {
            OR: [
              { createdAt: { lt: input.cursor.createdAt } },
              {
                createdAt: input.cursor.createdAt,
                id: { lt: input.cursor.id },
              },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.pageReport.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: input.query.size + 1,
      select: reportSummarySelect,
    });
    const hasMore = rows.length > input.query.size;
    const visibleRows = hasMore ? rows.slice(0, input.query.size) : rows;
    const last = visibleRows.at(-1);

    return {
      items: visibleRows.map(summaryFromRow),
      nextPosition:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }

  async findReport(reportId: string): Promise<AdminReportDetail | null> {
    const row = await this.prisma.pageReport.findUnique({
      where: { id: reportId },
      select: reportDetailSelect,
    });
    if (!row) return null;

    const actions = row.moderationActions.map((action) => ({
      id: action.id,
      targetType: action.targetType,
      targetId: action.targetId,
      actionType: action.actionType,
      reasonCode: action.reasonCode,
      note: action.note,
      previousState: action.previousState,
      resultingState: action.resultingState,
      actorId: action.actorId,
      requestId: action.requestId,
      createdAt: action.createdAt.toISOString(),
    }));
    const appealAction = row.moderationActions.find(
      (action) => action.appealOrigin,
    );
    const appeal = appealAction?.appealOrigin
      ? {
          id: appealAction.appealOrigin.id,
          originalActionId: appealAction.appealOrigin.originalActionId,
          status: appealAction.appealOrigin.status,
          externalReference: appealAction.appealOrigin.externalReference,
          reasonCode: appealAction.appealOrigin.reasonCode,
          moderationVersion: appealAction.appealOrigin.moderationVersion,
          requestedAt: appealAction.appealOrigin.requestedAt.toISOString(),
          resolvedAt:
            appealAction.appealOrigin.resolvedAt?.toISOString() ?? null,
        }
      : null;

    return {
      ...summaryFromRow(row),
      pageModerationStatus: row.page.moderationStatus,
      creatorModerationStatus: row.page.creator.moderationStatus,
      appeal,
      actions,
    };
  }
}
