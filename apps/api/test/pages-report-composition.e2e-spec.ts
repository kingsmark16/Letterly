import { firstMockCallOrder } from './support/required-test-value';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import { createHmac } from 'node:crypto';
import { hashBrowserToken } from '../src/infrastructure/http/browser-token';
import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitService,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import { PageReportsService } from '../src/modules/pages/application/page-reports.service';
import {
  PAGE_REPORTS_REPOSITORY,
  type PageReportsRepository,
} from '../src/modules/pages/application/page-reports.repository';
import { PublicPageReportsController } from '../src/modules/pages/presentation/public-page-reports.controller';
import { pageReportsServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const reportId = '22222222-2222-4222-8222-222222222222';

function createRepository() {
  return {
    findPublishedPageScope: jest
      .fn<PageReportsRepository['findPublishedPageScope']>()
      .mockResolvedValue(pageId),
    createPublicReport: jest
      .fn<PageReportsRepository['createPublicReport']>()
      .mockResolvedValue({ type: 'created', reportId }),
  };
}

describe('Report service factory and anonymous HTTP boundary', () => {
  let app: INestApplication<App>;
  let repository: ReturnType<typeof createRepository>;
  const consumePublicReport =
    jest.fn<RateLimitService['consumePublicReport']>();

  async function compose(
    options: { service?: boolean; limiter?: boolean; secret?: boolean } = {},
  ) {
    const module = await Test.createTestingModule({
      controllers: [PublicPageReportsController],
      providers: [
        ...(options.service === false ? [] : [pageReportsServiceProvider]),
        { provide: PAGE_REPORTS_REPOSITORY, useValue: {} },
        ...(options.limiter === false
          ? []
          : [{ provide: RateLimitService, useValue: { consumePublicReport } }]),
        ...(options.secret === false
          ? []
          : [
              {
                provide: VISITOR_IDENTITY_SECRET,
                useValue: 'fixture-report-identity-secret',
              },
            ]),
      ],
    })
      .overrideProvider(PAGE_REPORTS_REPOSITORY)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  }

  beforeEach(async () => {
    repository = createRepository();
    consumePublicReport.mockReset().mockResolvedValue(undefined);
    await compose();
  });

  afterEach(async () => {
    await app.close();
  });

  const secret = 'fixture-report-identity-secret';
  function signedIdentity() {
    const payload = createVisitorIdentityPayload(
      '203.0.113.24',
      Math.floor(Date.now() / 1000),
    );
    return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
  }
  function post(body: object = { reason: 'SPAM' }) {
    return request(app.getHttpServer())
      .post('/api/v1/public/pages/Letter42/reports')
      .send(body);
  }
  async function recompose(options: Parameters<typeof compose>[0]) {
    await app.close();
    await compose(options);
  }
  function expectNoCreation() {
    expect(repository.createPublicReport).not.toHaveBeenCalled();
  }

  it('prefers the decoded page scoped browser hash over a signed visitor identity', async () => {
    await post()
      .set('Cookie', 'letterly_browser=fixture%2Fbrowser')
      .set(visitorIdentityHeader, signedIdentity())
      .expect(201);
    expect(consumePublicReport).toHaveBeenCalledWith(
      pageId,
      hashBrowserToken(pageId, 'fixture/browser', secret),
    );
    expect(repository.createPublicReport).toHaveBeenCalledWith({
      slug: 'letter42',
      reason: 'SPAM',
      message: undefined,
    });
  });

  it('uses signed visitor identity when no browser cookie exists', async () => {
    await post().set(visitorIdentityHeader, signedIdentity()).expect(201);
    expect(consumePublicReport).toHaveBeenCalledWith(pageId, '203.0.113.24');
  });

  it.each([
    'letterly_browser=',
    'letterly_browser=%XX',
    `letterly_browser=${'a'.repeat(513)}`,
    'other=value',
  ])('falls back to signed identity for unusable cookie %s', async (cookie) => {
    await post()
      .set('Cookie', cookie)
      .set(visitorIdentityHeader, signedIdentity())
      .expect(201);
    expect(consumePublicReport).toHaveBeenCalledWith(pageId, '203.0.113.24');
  });

  it('uses the transport IP when a signed identity cannot be verified', async () => {
    await post().set(visitorIdentityHeader, 'invalid-signature').expect(201);
    expect(consumePublicReport).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^(::ffff:)?127\.0\.0\.1$/),
    );
  });

  it('keeps reports available without an identity secret and falls back to transport IP', async () => {
    await recompose({ secret: false });
    await post()
      .set('Cookie', 'letterly_browser=fixture-browser')
      .set(visitorIdentityHeader, signedIdentity())
      .expect(201);
    expect(consumePublicReport).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^(::ffff:)?127\.0\.0\.1$/),
    );
  });

  it('keeps optional limiter absence independent of report service availability', async () => {
    await recompose({ limiter: false });
    await post().expect(201);
    expect(consumePublicReport).not.toHaveBeenCalled();
    expect(repository.createPublicReport).toHaveBeenCalledTimes(1);
  });

  it('returns service unavailable before scope or rate checks when the service is absent', async () => {
    await recompose({ service: false });
    const response = await post().expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Report service unavailable',
    });
    expect(repository.findPublishedPageScope).not.toHaveBeenCalled();
    expect(consumePublicReport).not.toHaveBeenCalled();
    expectNoCreation();
  });

  it.each([
    [new RateLimitExceededError(37), 429, 'RATE_LIMITED'],
    [new RateLimitUnavailableError(), 503, 'RATE_LIMIT_UNAVAILABLE'],
  ] as const)(
    'preserves report rate error %s after availability and before creation',
    async (error, status, code) => {
      consumePublicReport.mockRejectedValue(error);
      const response = await post().expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
      expect(response.headers['cache-control']).toBe('no-store');
      if (status === 429) expect(response.headers['retry-after']).toBe('37');
      expect(repository.findPublishedPageScope).toHaveBeenCalledTimes(1);
      expectNoCreation();
    },
  );

  it.each([
    {},
    { reason: 'UNKNOWN' },
    { reason: 'SPAM', message: '' },
    { reason: 'SPAM', message: '   ' },
    { reason: 'SPAM', message: 'a'.repeat(1001) },
  ])('rejects invalid report body %j before scope lookup', async (body) => {
    const response = await post(body).expect(422);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'VALIDATION_FAILED',
    );
    expect(repository.findPublishedPageScope).not.toHaveBeenCalled();
    expect(consumePublicReport).not.toHaveBeenCalled();
    expectNoCreation();
  });

  it.each([
    'INAPPROPRIATE_CONTENT',
    'HARASSMENT',
    'SPAM',
    'PERSONAL_INFORMATION',
    'OTHER',
  ])('accepts reason %s with a bounded trimmed message', async (reason) => {
    await post({ reason, message: `  ${'a'.repeat(1000)}  ` }).expect(201);
    expect(repository.createPublicReport).toHaveBeenCalledWith({
      slug: 'letter42',
      reason,
      message: 'a'.repeat(1000),
    });
  });

  it('rejects overlong page slugs before scope lookup', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/pages/${'a'.repeat(201)}/reports`)
      .send({ reason: 'SPAM' })
      .expect(422);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'VALIDATION_FAILED',
    );
    expect(repository.findPublishedPageScope).not.toHaveBeenCalled();
    expectNoCreation();
  });

  it('rejects malformed service receipts without leaking report details', async () => {
    repository.createPublicReport.mockResolvedValue({
      type: 'created',
      reportId: 'invalid-private-id',
    });
    const response = await post().expect(500);
    expect(apiErrorEnvelopeSchema.parse(response.body).message).toBe(
      'An unexpected error occurred',
    );
    expect(response.text).not.toContain('invalid-private-id');
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('redacts unexpected limiter failures', async () => {
    consumePublicReport.mockRejectedValue(new Error('private-limit-details'));
    const response = await post().expect(500);
    expect(apiErrorEnvelopeSchema.parse(response.body).message).toBe(
      'An unexpected error occurred',
    );
    expect(response.text).not.toContain('private-limit-details');
    expectNoCreation();
  });

  it('creates a safe anonymous receipt through the singleton factory and repository override', async () => {
    expect(app.get(PageReportsService)).toBe(app.get(PageReportsService));
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/Letter42/reports')
      .set('Cookie', 'letterly_browser=fixture-browser')
      .send({
        reason: 'SPAM',
        message: '  unwanted content  ',
        pageId: 'untrusted-page',
      })
      .expect(201);
    expect(response.body).toEqual({ accepted: true, reportId });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    expect(repository.findPublishedPageScope.mock.calls).toEqual([
      ['letter42'],
    ]);
    expect(repository.createPublicReport.mock.calls).toEqual([
      [{ slug: 'letter42', reason: 'SPAM', message: 'unwanted content' }],
    ]);
    expect(consumePublicReport).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(firstMockCallOrder(repository.findPublishedPageScope)).toBeLessThan(
      firstMockCallOrder(consumePublicReport),
    );
    expect(firstMockCallOrder(consumePublicReport)).toBeLessThan(
      firstMockCallOrder(repository.createPublicReport),
    );
  });

  it('rejects an unavailable page before rate limiting or report creation', async () => {
    repository.findPublishedPageScope.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/reports')
      .send({ reason: 'SPAM' })
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
    expect(consumePublicReport).not.toHaveBeenCalled();
    expect(repository.createPublicReport.mock.calls).toHaveLength(0);
  });

  it('retains the safe error when the page disappears after the scope check', async () => {
    repository.createPublicReport.mockResolvedValue({ type: 'not_found' });
    const response = await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/reports')
      .send({ reason: 'SPAM' })
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
    expect(consumePublicReport).toHaveBeenCalledTimes(1);
    expect(repository.createPublicReport.mock.calls).toHaveLength(1);
  });

  it.each(['scope', 'creation'] as const)(
    'hides repository failure details at the %s stage',
    async (stage) => {
      const failure = new Error('private-provider-detail');
      if (stage === 'scope')
        repository.findPublishedPageScope.mockRejectedValue(failure);
      else repository.createPublicReport.mockRejectedValue(failure);
      const response = await request(app.getHttpServer())
        .post('/api/v1/public/pages/letter42/reports')
        .send({ reason: 'SPAM' })
        .expect(503);
      expect(response.body).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Report service temporarily unavailable',
      });
      expect(response.text).not.toContain('private-provider-detail');
      expect(response.headers['cache-control']).toBe('no-store');
      if (stage === 'scope') {
        expect(consumePublicReport).not.toHaveBeenCalled();
        expect(repository.createPublicReport.mock.calls).toHaveLength(0);
      }
    },
  );

  it('validates report input before scope lookup or writes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/public/pages/letter42/reports')
      .send({ reason: 'UNKNOWN' })
      .expect(422);
    expect(repository.findPublishedPageScope.mock.calls).toHaveLength(0);
    expect(repository.createPublicReport.mock.calls).toHaveLength(0);
    expect(consumePublicReport).not.toHaveBeenCalled();
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageReportsServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service token overrides without constructing missing dependencies', async () => {
    const replacement = {
      findPublicPageScope: jest
        .fn<PageReportsService['findPublicPageScope']>()
        .mockResolvedValue(pageId),
    };
    const module = await Test.createTestingModule({
      providers: [pageReportsServiceProvider],
    })
      .overrideProvider(PageReportsService)
      .useValue(replacement)
      .compile();
    try {
      expect(module.get(PageReportsService)).toBe(replacement);
      await expect(
        module.get(PageReportsService).findPublicPageScope('letter42'),
      ).resolves.toBe(pageId);
    } finally {
      await module.close();
    }
  });
});
