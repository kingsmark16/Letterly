import { firstMockCallOrder } from './support/required-test-value';
import { jest } from '@jest/globals';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { pageJourneyPublicPageProjectionSchema } from '@letterly/contracts/page-journeys';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { hashBrowserToken } from '../src/infrastructure/http/browser-token';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
  RateLimitService,
} from '../src/infrastructure/http/rate-limit.service';
import { unlockCookieName } from '../src/infrastructure/http/unlock-cookie';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  PAGE_ANALYTICS_REPOSITORY,
  type PageAnalyticsRepository,
} from '../src/modules/pages/application/page-analytics.repository';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from '../src/modules/pages/application/page-journey-metrics';
import {
  PageService,
  PageNotFoundError,
  PublicPageReadUnavailableError,
} from '../src/modules/pages/application/page.service';
import { pageAnalyticsServiceProvider } from '../src/modules/pages/pages.module';
import { PublicPageAnalyticsController } from '../src/modules/pages/presentation/public-page-analytics.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const viewId = '22222222-2222-4222-8222-222222222222';
const secret = 'fixture-analytics-identity-secret';
const browser = 'fixture-browser';
const cookie = `letterly_browser=${browser}`;
const baseUrl = '/api/v1/public/pages/my-letter';
const duration = { viewId, activeSeconds: 60 };
const metric = { event: 'journey_start', templateKey: 'choose-your-heart' };
const routes = [
  { name: 'visit', path: `${baseUrl}/visit`, body: {} },
  { name: 'duration', path: `${baseUrl}/visit/time`, body: duration },
  { name: 'metrics', path: `${baseUrl}/metrics`, body: metric },
] as const;
const projection = pageJourneyPublicPageProjectionSchema.parse({
  displaySlug: 'my-letter',
  canonicalUrl: 'http://localhost:3000/p/my-letter',
  template: { key: 'choose-your-heart', version: 1 },
  publishedGraphVersion: 1,
  rootQuestionKey: 'root',
  maxDepth: 1,
  questions: [],
  outcomes: [],
  images: [],
});
function createPorts() {
  return {
    repository: {
      findPublicPageId: jest
        .fn<PageAnalyticsRepository['findPublicPageId']>()
        .mockResolvedValue(pageId),
      recordVisit: jest
        .fn<PageAnalyticsRepository['recordVisit']>()
        .mockResolvedValue(viewId),
      recordDuration: jest
        .fn<PageAnalyticsRepository['recordDuration']>()
        .mockResolvedValue(undefined),
    },
    page: {
      getPublicPage: jest
        .fn<PageService['getPublicPage']>()
        .mockResolvedValue(projection),
    },
    limiter: {
      consumePublic: jest
        .fn<RateLimitService['consumePublic']>()
        .mockResolvedValue(undefined),
    },
    metrics: { record: jest.fn<PageJourneyMetrics['record']>() },
  };
}
describe('Public analytics HTTP boundary', () => {
  let app: INestApplication<App>;
  let ports: ReturnType<typeof createPorts>;
  async function compose(
    withAnalytics = true,
    withSecret = true,
    withMetrics = true,
    withLimiter = true,
  ) {
    const module = await Test.createTestingModule({
      controllers: [PublicPageAnalyticsController],
      providers: [
        { provide: PageService, useValue: ports.page },
        ...(withAnalytics
          ? [
              pageAnalyticsServiceProvider,
              {
                provide: PAGE_ANALYTICS_REPOSITORY,
                useValue: ports.repository,
              },
            ]
          : []),
        ...(withSecret
          ? [{ provide: VISITOR_IDENTITY_SECRET, useValue: secret }]
          : []),
        ...(withMetrics
          ? [{ provide: PAGE_JOURNEY_METRICS, useValue: ports.metrics }]
          : []),
        ...(withLimiter
          ? [{ provide: RateLimitService, useValue: ports.limiter }]
          : []),
      ],
    }).compile();
    const result: INestApplication<App> = module.createNestApplication();
    configureHttpApplication(result);
    await result.init();
    return result;
  }
  beforeEach(async () => {
    ports = createPorts();
    app = await compose();
  });
  afterEach(async () => {
    await app.close();
  });
  function expectNoWrites() {
    expect(ports.repository.recordVisit).not.toHaveBeenCalled();
    expect(ports.repository.recordDuration).not.toHaveBeenCalled();
    expect(ports.metrics.record).not.toHaveBeenCalled();
  }
  it('records anonymous visits with a page scoped browser hash after public availability', async () => {
    const response = await request(app.getHttpServer())
      .post(routes[0].path)
      .set('Cookie', cookie)
      .expect(200);
    expect(response.body).toEqual({ viewId });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(ports.repository.findPublicPageId.mock.calls).toEqual([
      ['my-letter'],
    ]);
    const input = ports.repository.recordVisit.mock.calls[0];
    expect(input?.slice(0, 2)).toEqual([
      pageId,
      hashBrowserToken(pageId, browser, secret),
    ]);
    expect(input?.[2].getUTCHours()).toBe(0);
    expect(firstMockCallOrder(ports.limiter.consumePublic)).toBeLessThan(
      firstMockCallOrder(ports.page.getPublicPage),
    );
    expect(firstMockCallOrder(ports.page.getPublicPage)).toBeLessThan(
      firstMockCallOrder(ports.repository.findPublicPageId),
    );
  });
  it('forwards validated duration and visitor identity with empty 204', async () => {
    const response = await request(app.getHttpServer())
      .post(routes[1].path)
      .set('Cookie', cookie)
      .send(duration)
      .expect(204);
    expect(response.text).toBe('');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(ports.repository.recordDuration.mock.calls).toEqual([
      [pageId, hashBrowserToken(pageId, browser, secret), viewId, 60],
    ]);
  });
  it.each(['journey_start', 'journey_completed'] as const)(
    'allows bounded %s events without browser cookies',
    async (event) => {
      const body =
        event === 'journey_start'
          ? metric
          : { ...metric, event, outcomeCategory: 'outcome_12' };
      const response = await request(app.getHttpServer())
        .post(routes[2].path)
        .send({ ...body, privateMessage: 'untrusted' })
        .expect(204);
      expect(response.text).toBe('');
      expect(ports.metrics.record.mock.calls).toEqual([[body]]);
    },
  );
  it.each(routes)(
    'passes a trusted page cookie reader through availability for $name',
    async (route) => {
      await request(app.getHttpServer())
        .post(route.path)
        .set(
          'Cookie',
          `${cookie}; ${unlockCookieName(pageId)}=proof%20token; ${unlockCookieName(viewId)}=other`,
        )
        .send(route.body)
        .expect(route.name === 'visit' ? 200 : 204);
      const reader = ports.page.getPublicPage.mock.calls[0]?.[1];
      expect(reader?.(pageId)).toBe('proof token');
      expect(reader?.('different-page')).toBeNull();
    },
  );
  it.each(routes)(
    'uses verified visitor identity for $name limits',
    async (route) => {
      const address = '203.0.113.10';
      const payload = createVisitorIdentityPayload(
        address,
        Math.floor(Date.now() / 1000),
      );
      const signature = createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');
      await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .set(visitorIdentityHeader, `${payload}.${signature}`)
        .send(route.body)
        .expect(route.name === 'visit' ? 200 : 204);
      expect(ports.limiter.consumePublic.mock.calls).toEqual([[address]]);
    },
  );
  it.each(routes.slice(0, 2))(
    'requires cookies before $name limiting or page reads',
    async (route) => {
      const response = await request(app.getHttpServer())
        .post(route.path)
        .send(route.body)
        .expect(422);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'COOKIE_REQUIRED',
      );
      expect(ports.limiter.consumePublic).not.toHaveBeenCalled();
      expect(ports.page.getPublicPage).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );
  it.each(routes.slice(0, 2))(
    'requires the optional analytics service for $name',
    async (route) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'SERVICE_UNAVAILABLE',
      );
      expectNoWrites();
    },
  );
  it.each(routes.slice(0, 2))(
    'requires identity secret for $name',
    async (route) => {
      await app.close();
      app = await compose(true, false);
      await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(503);
      expectNoWrites();
    },
  );
  it('requires the optional metrics recorder before page reads', async () => {
    await app.close();
    app = await compose(true, true, false);
    await request(app.getHttpServer())
      .post(routes[2].path)
      .send(metric)
      .expect(503);
    expect(ports.page.getPublicPage).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it('keeps journey metrics available without visit analytics or identity secret', async () => {
    await app.close();
    app = await compose(false, false);
    await request(app.getHttpServer())
      .post(routes[2].path)
      .send(metric)
      .expect(204);
    expect(ports.metrics.record.mock.calls).toEqual([[metric]]);
  });
  it.each(routes)('blocks locked projections for $name', async (route) => {
    ports.page.getPublicPage.mockResolvedValue({
      state: 'LOCKED',
      displaySlug: 'my-letter',
      canonicalUrl: projection.canonicalUrl,
      template: projection.template,
      recipientName: 'For Alex',
    });
    const response = await request(app.getHttpServer())
      .post(route.path)
      .set('Cookie', cookie)
      .send(route.body)
      .expect(404);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'PAGE_NOT_FOUND',
    );
    expect(ports.repository.findPublicPageId).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it.each(routes)('maps unavailable pages for $name', async (route) => {
    ports.page.getPublicPage.mockRejectedValue(new PageNotFoundError());
    const response = await request(app.getHttpServer())
      .post(route.path)
      .set('Cookie', cookie)
      .send(route.body)
      .expect(404);
    expect(apiErrorEnvelopeSchema.parse(response.body).message).toBe(
      'This letter is not available',
    );
    expectNoWrites();
  });
  it.each(routes)(
    'maps transient page read failure for $name',
    async (route) => {
      ports.page.getPublicPage.mockRejectedValue(
        new PublicPageReadUnavailableError(),
      );
      const response = await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'SERVICE_UNAVAILABLE',
      );
      expectNoWrites();
    },
  );
  it.each(routes)('retains exceeded limit mapping for $name', async (route) => {
    ports.limiter.consumePublic.mockRejectedValue(
      new RateLimitExceededError(12),
    );
    const response = await request(app.getHttpServer())
      .post(route.path)
      .set('Cookie', cookie)
      .send(route.body)
      .expect(429);
    expect(apiErrorEnvelopeSchema.parse(response.body).details).toEqual({
      retryAfterSeconds: 12,
    });
    expect(response.headers['retry-after']).toBe('12');
    expect(ports.page.getPublicPage).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it.each(routes)(
    'retains unavailable limit mapping for $name',
    async (route) => {
      ports.limiter.consumePublic.mockRejectedValue(
        new RateLimitUnavailableError(),
      );
      const response = await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'RATE_LIMIT_UNAVAILABLE',
      );
      expectNoWrites();
    },
  );
  it.each(routes)(
    'keeps optional limiter behavior for $name',
    async (route) => {
      await app.close();
      app = await compose(true, true, true, false);
      await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(route.name === 'visit' ? 200 : 204);
      expect(ports.limiter.consumePublic).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ...duration, activeSeconds: 0 },
    { ...duration, activeSeconds: 1801 },
    { ...duration, activeSeconds: 1.5 },
    { ...duration, viewId: 'invalid' },
  ])('rejects invalid duration %j before limiting', async (body) => {
    await request(app.getHttpServer())
      .post(routes[1].path)
      .set('Cookie', cookie)
      .send(body)
      .expect(422);
    expect(ports.limiter.consumePublic).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it.each([
    { ...metric, event: 'journey_publish' },
    { ...metric, event: 'journey_completed', outcomeCategory: 'outcome_13' },
    { ...metric, templateKey: '' },
  ])('rejects invalid public metric %j', async (body) => {
    await request(app.getHttpServer())
      .post(routes[2].path)
      .send(body)
      .expect(422);
    expect(ports.limiter.consumePublic).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it.each(['request', 'projection'] as const)(
    'rejects a different template in the %s',
    async (source) => {
      const body =
        source === 'request'
          ? { ...metric, templateKey: 'secret-letter' }
          : metric;
      if (source === 'projection')
        ports.page.getPublicPage.mockResolvedValue({
          displaySlug: projection.displaySlug,
          canonicalUrl: projection.canonicalUrl,
          recipientName: 'For Alex',
          mainMessage: 'A letter',
          sections: [],
          images: [],
          template: { key: 'secret-letter', version: 1 },
        });
      const response = await request(app.getHttpServer())
        .post(routes[2].path)
        .send(body)
        .expect(422);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'UNSUPPORTED_CAPABILITY',
      );
      expectNoWrites();
    },
  );
  it.each(routes.slice(0, 2))(
    'maps missing analytics scope for $name',
    async (route) => {
      ports.repository.findPublicPageId.mockResolvedValue(null);
      await request(app.getHttpServer())
        .post(route.path)
        .set('Cookie', cookie)
        .send(route.body)
        .expect(404);
      expectNoWrites();
    },
  );
  it('redacts unexpected analytics persistence failure', async () => {
    ports.repository.recordVisit.mockRejectedValue(
      new Error('private database credentials'),
    );
    const response = await request(app.getHttpServer())
      .post(routes[0].path)
      .set('Cookie', cookie)
      .expect(500);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'INTERNAL_SERVER_ERROR',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('private database');
  });
});
