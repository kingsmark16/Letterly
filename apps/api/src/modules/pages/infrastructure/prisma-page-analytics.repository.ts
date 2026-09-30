import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import { publicPageAvailabilityWhere } from '../application/public-availability';
import type {
  PageAnalyticsRepository,
  PageAnalyticsCounts,
} from '../application/page-analytics.repository';

type DailyVisitCount = { date: Date; visitors: bigint; views: bigint };
type DailyResponseCount = { date: Date; count: bigint };
type VisitTotals = { visitors: bigint; views: bigint };
type DailyActiveTimeTotals = {
  date: Date;
  measuredViews: bigint;
  totalSeconds: bigint;
};

@Injectable()
export class PrismaPageAnalyticsRepository implements PageAnalyticsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findPublicPageId(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findFirst({
      where: publicPageAvailabilityWhere(slug),
      select: { id: true },
    });
    return page?.id ?? null;
  }

  async recordVisit(
    pageId: string,
    browserTokenHash: string,
    visitedOn: Date,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.pageVisit.upsert({
          where: {
            pageId_browserTokenHash_visitedOn: {
              pageId,
              browserTokenHash,
              visitedOn,
            },
          },
          create: { pageId, browserTokenHash, visitedOn, viewCount: 1 },
          update: { viewCount: { increment: 1 } },
        });
        const session = await transaction.pageViewSession.create({
          data: { pageId, browserTokenHash },
          select: { id: true },
        });
        return session.id;
      },
      { maxWait: 30000, timeout: 30000 },
    );
  }

  async recordDuration(
    pageId: string,
    browserTokenHash: string,
    viewId: string,
    activeSeconds: number,
  ): Promise<void> {
    const session = await this.prisma.pageViewSession.findFirst({
      where: { id: viewId, pageId, browserTokenHash },
      select: { startedAt: true },
    });
    if (!session) return;
    const elapsedSeconds = Math.floor(
      (Date.now() - session.startedAt.getTime()) / 1000,
    );
    const boundedSeconds = Math.min(
      activeSeconds,
      Math.max(0, elapsedSeconds + 2),
      1800,
    );
    if (boundedSeconds < 1) return;
    await this.prisma.pageViewSession.updateMany({
      where: {
        id: viewId,
        pageId,
        browserTokenHash,
        activeSeconds: { lt: boundedSeconds },
      },
      data: { activeSeconds: boundedSeconds },
    });
  }

  async readOwned(
    pageId: string,
    creatorId: string,
    since: Date,
  ): Promise<PageAnalyticsCounts | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        creatorId,
        status: 'PUBLISHED',
      },
      select: { id: true },
    });
    if (!page) return null;

    const [
      dailyVisits,
      visitorTotal,
      dailyResponses,
      totalResponses,
      unreadResponses,
      dailyActiveTime,
    ] = await Promise.all([
      this.prisma.$queryRaw<DailyVisitCount[]>`
        SELECT "visitedOn" AS date,
               COUNT(*)::bigint AS visitors,
               COALESCE(SUM("viewCount"), 0)::bigint AS views
        FROM "PageVisit"
        WHERE "pageId" = ${pageId}::uuid AND "visitedOn" >= ${since}::date
        GROUP BY "visitedOn"
      `,
      this.prisma.$queryRaw<VisitTotals[]>`
        SELECT COUNT(DISTINCT "browserTokenHash")::bigint AS visitors,
               COALESCE(SUM("viewCount"), 0)::bigint AS views
        FROM "PageVisit"
        WHERE "pageId" = ${pageId}::uuid AND "visitedOn" >= ${since}::date
      `,
      this.prisma.$queryRaw<DailyResponseCount[]>`
        SELECT ("submittedAt" AT TIME ZONE 'UTC')::date AS date, COUNT(*)::bigint AS count
        FROM "VisitorSubmission"
        WHERE "pageId" = ${pageId}::uuid AND "deletedAt" IS NULL AND "submittedAt" >= ${since}
        GROUP BY ("submittedAt" AT TIME ZONE 'UTC')::date
      `,
      this.prisma.visitorSubmission.count({
        where: { pageId, deletedAt: null, submittedAt: { gte: since } },
      }),
      this.prisma.visitorSubmission.count({
        where: { pageId, deletedAt: null, readState: 'UNREAD' },
      }),
      this.prisma.$queryRaw<DailyActiveTimeTotals[]>`
        SELECT "startedAt"::date AS date,
               COUNT(*)::bigint AS "measuredViews",
               COALESCE(SUM("activeSeconds"), 0)::bigint AS "totalSeconds"
        FROM "PageViewSession"
        WHERE "pageId" = ${pageId}::uuid
          AND "startedAt" >= ${since}
          AND "activeSeconds" > 0
        GROUP BY "startedAt"::date
      `,
    ]);

    const activity = new Map<
      string,
      {
        date: string;
        views: number;
        visitors: number;
        responses: number;
        averageActiveSeconds: number | null;
        measuredViews: number;
      }
    >();
    for (const row of dailyVisits) {
      const date = row.date.toISOString().slice(0, 10);
      activity.set(date, {
        date,
        views: Number(row.views),
        visitors: Number(row.visitors),
        responses: 0,
        averageActiveSeconds: null,
        measuredViews: 0,
      });
    }
    for (const row of dailyResponses) {
      const date = row.date.toISOString().slice(0, 10);
      const day = activity.get(date) ?? {
        date,
        views: 0,
        visitors: 0,
        responses: 0,
        averageActiveSeconds: null,
        measuredViews: 0,
      };
      day.responses = Number(row.count);
      activity.set(date, day);
    }

    let measuredViews = 0;
    let totalActiveSeconds = 0;
    for (const row of dailyActiveTime) {
      const date = row.date.toISOString().slice(0, 10);
      const timedViews = Number(row.measuredViews);
      const seconds = Number(row.totalSeconds);
      measuredViews += timedViews;
      totalActiveSeconds += seconds;
      const day = activity.get(date) ?? {
        date,
        views: 0,
        visitors: 0,
        responses: 0,
        averageActiveSeconds: null,
        measuredViews: 0,
      };
      day.averageActiveSeconds = Math.round(seconds / timedViews);
      day.measuredViews = timedViews;
      activity.set(date, day);
    }

    return {
      views: Number(visitorTotal[0]?.views ?? 0n),
      visitors: Number(visitorTotal[0]?.visitors ?? 0n),
      totalResponses,
      unreadResponses,
      averageActiveSeconds:
        measuredViews > 0
          ? Math.round(totalActiveSeconds / measuredViews)
          : null,
      measuredViews,
      activity: [...activity.values()],
    };
  }
}
