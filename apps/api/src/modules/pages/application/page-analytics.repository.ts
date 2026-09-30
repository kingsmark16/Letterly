export const PAGE_ANALYTICS_REPOSITORY = Symbol('PAGE_ANALYTICS_REPOSITORY');

export interface PageAnalyticsCounts {
  views: number;
  visitors: number;
  totalResponses: number;
  unreadResponses: number;
  averageActiveSeconds: number | null;
  measuredViews: number;
  activity: Array<{
    date: string;
    views: number;
    visitors: number;
    responses: number;
    averageActiveSeconds: number | null;
    measuredViews: number;
  }>;
}

export interface PageAnalyticsRepository {
  findPublicPageId(slug: string): Promise<string | null>;
  recordVisit(
    pageId: string,
    browserTokenHash: string,
    visitedOn: Date,
  ): Promise<string>;
  recordDuration(
    pageId: string,
    browserTokenHash: string,
    viewId: string,
    activeSeconds: number,
  ): Promise<void>;
  readOwned(
    pageId: string,
    creatorId: string,
    since: Date,
  ): Promise<PageAnalyticsCounts | null>;
}
