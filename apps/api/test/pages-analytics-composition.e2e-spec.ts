import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { RateLimitService } from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import { PageService } from '../src/modules/pages/application/page.service';
import { PageAnalyticsService } from '../src/modules/pages/application/page-analytics.service';
import {
  PAGE_ANALYTICS_REPOSITORY,
  type PageAnalyticsRepository,
} from '../src/modules/pages/application/page-analytics.repository';
import {
  PagesController,
  PublicPagesController,
} from '../src/modules/pages/pages.controller';
import { pageAnalyticsServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const viewId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';
const utcDay = new Date('2026-10-02T00:00:00.000Z');

class FixtureSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const incoming = context.switchToHttp().getRequest<AuthenticatedRequest>();
    incoming.authSession = {
      user: { id: creatorId },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}

function createRepository() {
  return {
    findPublicPageId: jest
      .fn<PageAnalyticsRepository['findPublicPageId']>()
      .mockResolvedValue(pageId),
    recordVisit: jest
      .fn<PageAnalyticsRepository['recordVisit']>()
      .mockResolvedValue(viewId),
    recordDuration: jest
      .fn<PageAnalyticsRepository['recordDuration']>()
      .mockResolvedValue(undefined),
    readOwned: jest
      .fn<PageAnalyticsRepository['readOwned']>()
      .mockResolvedValue({
        views: 2,
        visitors: 1,
        totalResponses: 3,
        unreadResponses: 2,
        averageActiveSeconds: 15,
        measuredViews: 1,
        activity: [
          {
            date: '2026-10-01',
            views: 2,
            visitors: 1,
            responses: 3,
            averageActiveSeconds: 15,
            measuredViews: 1,
          },
        ],
      }),
  };
}

describe('Analytics service factory and HTTP boundaries', () => {
  let app: INestApplication<App>;
  let repository: ReturnType<typeof createRepository>;
  const getPublicPage = jest.fn<PageService['getPublicPage']>();

  beforeEach(async () => {
    repository = createRepository();
    getPublicPage.mockReset().mockResolvedValue({
      displaySlug: 'letter42',
      canonicalUrl: 'http://localhost:3000/p/letter42',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'For Alex',
      mainMessage: 'A letter',
      sections: [],
      images: [],
    });
    const module = await Test.createTestingModule({
      controllers: [PagesController, PublicPagesController],
      providers: [
        pageAnalyticsServiceProvider,
        { provide: PAGE_ANALYTICS_REPOSITORY, useValue: {} },
        { provide: PageService, useValue: { getPublicPage } },
        {
          provide: RateLimitService,
          useValue: {
            consumePublic: jest
              .fn<RateLimitService['consumePublic']>()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: VISITOR_IDENTITY_SECRET,
          useValue: 'fixture-analytics-identity-secret',
        },
      ],
    })
      .overrideProvider(PAGE_ANALYTICS_REPOSITORY)
      .useValue(repository)
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(FixtureSessionGuard)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
    jest.useFakeTimers({
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
        'performance',
        'hrtime',
        'queueMicrotask',
      ],
    });
    jest.setSystemTime(new Date('2026-10-03T00:15:00+08:00'));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await app.close();
  });

  it('uses the singleton factory for owner scoped UTC periods and preserves stored/empty activity', async () => {
    expect(app.get(PageAnalyticsService)).toBe(app.get(PageAnalyticsService));
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}/analytics?days=7&creatorId=untrusted`)
      .expect(200);
    expect(repository.readOwned.mock.calls).toEqual([
      [pageId, creatorId, new Date('2026-09-26T00:00:00.000Z')],
    ]);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toMatchObject({
      visitorDays: 7,
      views: 2,
      visitors: 1,
      totalResponses: 3,
      unreadResponses: 2,
    });
    const expectedActivity = [
      ...[
        '2026-09-26',
        '2026-09-27',
        '2026-09-28',
        '2026-09-29',
        '2026-09-30',
      ].map((date) => ({
        date,
        views: 0,
        visitors: 0,
        responses: 0,
        averageActiveSeconds: null,
        measuredViews: 0,
      })),
      {
        date: '2026-10-01',
        views: 2,
        visitors: 1,
        responses: 3,
        averageActiveSeconds: 15,
        measuredViews: 1,
      },
      {
        date: '2026-10-02',
        views: 0,
        visitors: 0,
        responses: 0,
        averageActiveSeconds: null,
        measuredViews: 0,
      },
    ];
    expect(response.body).toMatchObject({ activity: expectedActivity });
  });

  it('retains the default 30 day UTC window', async () => {
    const result = await app
      .get(PageAnalyticsService)
      .readOwned(pageId, creatorId);
    expect(repository.readOwned.mock.calls).toEqual([
      [pageId, creatorId, new Date('2026-09-03T00:00:00.000Z')],
    ]);
    expect(result.visitorDays).toBe(30);
    expect(result.activity).toHaveLength(30);
    expect(result.activity[0]?.date).toBe('2026-09-03');
    expect(result.activity[29]?.date).toBe('2026-10-02');
  });

  it('records normalized public visits and durations with page scoped browser hashes and UTC days', async () => {
    const start = await request(app.getHttpServer())
      .post('/api/v1/public/pages/Letter42/visit')
      .set('Cookie', 'letterly_browser=fixture-browser')
      .expect(200);
    expect(start.body).toEqual({ viewId });
    expect(repository.findPublicPageId.mock.calls).toEqual([['letter42']]);
    expect(repository.recordVisit.mock.calls).toEqual([
      [pageId, expect.stringMatching(/^[a-f0-9]{64}$/), utcDay],
    ]);
    const browserHash = repository.recordVisit.mock.calls[0]?.[1];
    await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/visit/time')
      .set('Cookie', 'letterly_browser=fixture-browser')
      .send({ viewId, activeSeconds: 60 })
      .expect(204);
    expect(repository.recordDuration.mock.calls).toEqual([
      [pageId, browserHash, viewId, 60],
    ]);
    expect(start.headers['cache-control']).toBe('no-store');
  });

  it('rejects locked pages before resolving or recording analytics', async () => {
    getPublicPage.mockResolvedValue({
      state: 'LOCKED',
      displaySlug: 'letter42',
      canonicalUrl: 'http://localhost:3000/p/letter42',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'For Alex',
    });
    await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/visit')
      .set('Cookie', 'letterly_browser=fixture-browser')
      .expect(404);
    expect(repository.findPublicPageId.mock.calls).toHaveLength(0);
    expect(repository.recordVisit.mock.calls).toHaveLength(0);
  });

  it('maps unavailable owner queries to the existing private error', async () => {
    repository.readOwned.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}/analytics`)
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('propagates repository failures unchanged', async () => {
    const failure = new Error('fixture repository failure');
    repository.recordDuration.mockRejectedValue(failure);
    await expect(
      app.get(PageAnalyticsService).recordDuration(pageId, 'hash', viewId, 60),
    ).rejects.toBe(failure);
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageAnalyticsServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      findPublicPageId: jest
        .fn<PageAnalyticsService['findPublicPageId']>()
        .mockResolvedValue(pageId),
    };
    const module = await Test.createTestingModule({
      providers: [pageAnalyticsServiceProvider],
    })
      .overrideProvider(PageAnalyticsService)
      .useValue(replacement)
      .compile();
    try {
      expect(module.get(PageAnalyticsService)).toBe(replacement);
      await expect(
        module.get(PageAnalyticsService).findPublicPageId('letter42'),
      ).resolves.toBe(pageId);
    } finally {
      await module.close();
    }
  });
});
