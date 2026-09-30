import { Inject, Injectable } from '@nestjs/common';
import type { PageAnalyticsPeriod } from '@letterly/contracts/analytics';
import {
  PAGE_ANALYTICS_REPOSITORY,
  type PageAnalyticsRepository,
} from './page-analytics.repository';

export class PageAnalyticsNotFoundError extends Error {
  constructor() {
    super('Page not found');
    this.name = 'PageAnalyticsNotFoundError';
  }
}

@Injectable()
export class PageAnalyticsService {
  constructor(
    @Inject(PAGE_ANALYTICS_REPOSITORY)
    private readonly repository: PageAnalyticsRepository,
  ) {}

  async findPublicPageId(slug: string): Promise<string> {
    const pageId = await this.repository.findPublicPageId(
      slug.trim().toLowerCase(),
    );
    if (!pageId) throw new PageAnalyticsNotFoundError();
    return pageId;
  }

  async recordVisit(pageId: string, browserTokenHash: string): Promise<string> {
    const now = new Date();
    const visitedOn = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    return this.repository.recordVisit(pageId, browserTokenHash, visitedOn);
  }

  async recordDuration(
    pageId: string,
    browserTokenHash: string,
    viewId: string,
    activeSeconds: number,
  ): Promise<void> {
    await this.repository.recordDuration(
      pageId,
      browserTokenHash,
      viewId,
      activeSeconds,
    );
  }

  async readOwned(
    pageId: string,
    creatorId: string,
    visitorDays: PageAnalyticsPeriod = 30,
  ) {
    const today = new Date();
    const since = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (visitorDays - 1),
      ),
    );
    const counts = await this.repository.readOwned(pageId, creatorId, since);
    if (!counts) throw new PageAnalyticsNotFoundError();

    const days = new Map(counts.activity.map((day) => [day.date, day]));
    const activity = Array.from({ length: visitorDays }, (_, index) => {
      const date = new Date(since);
      date.setUTCDate(since.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return (
        days.get(key) ?? {
          date: key,
          views: 0,
          visitors: 0,
          responses: 0,
          averageActiveSeconds: null,
          measuredViews: 0,
        }
      );
    });

    return { visitorDays, ...counts, activity };
  }
}
