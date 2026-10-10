import type { INestApplication } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { RateLimitService } from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import { PageService } from '../src/modules/pages/application/page.service';
import { PageReportsService } from '../src/modules/pages/application/page-reports.service';
import {
  PAGE_REPORTS_REPOSITORY,
  type PageReportsRepository,
} from '../src/modules/pages/application/page-reports.repository';
import { PublicPagesController } from '../src/modules/pages/pages.controller';
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

  beforeEach(async () => {
    repository = createRepository();
    consumePublicReport.mockReset().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [PublicPagesController],
      providers: [
        pageReportsServiceProvider,
        { provide: PAGE_REPORTS_REPOSITORY, useValue: {} },
        { provide: PageService, useValue: {} },
        { provide: RateLimitService, useValue: { consumePublicReport } },
        {
          provide: VISITOR_IDENTITY_SECRET,
          useValue: 'fixture-report-identity-secret',
        },
      ],
    })
      .overrideProvider(PAGE_REPORTS_REPOSITORY)
      .useValue(repository)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
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
    expect(
      repository.findPublishedPageScope.mock.invocationCallOrder[0],
    ).toBeLessThan(consumePublicReport.mock.invocationCallOrder[0]);
    expect(consumePublicReport.mock.invocationCallOrder[0]).toBeLessThan(
      repository.createPublicReport.mock.invocationCallOrder[0],
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
