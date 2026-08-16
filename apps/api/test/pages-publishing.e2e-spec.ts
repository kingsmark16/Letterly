import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { PRISMA_CLIENT } from '../src/infrastructure/database/prisma.provider';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import {
  RATE_LIMIT_STORE,
  RateLimitService,
} from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  APP_ORIGIN,
  PageService,
} from '../src/modules/pages/application/page.service';
import { PAGES_REPOSITORY } from '../src/modules/pages/application/pages.repository';
import { TEMPLATE_VERSION_READER } from '../src/modules/pages/application/template-version.reader';
import type { AuthenticatedRequest } from '../src/modules/auth/better-auth-session.guard';
import { BetterAuthSessionGuard } from '../src/modules/auth/better-auth-session.guard';
import {
  ConfirmationRequiredError,
  InvalidSlugError,
  PageNotFoundError,
} from '../src/modules/pages/application/page.service';
import { PagesModule } from '../src/modules/pages/pages.module';
import { PrismaPageMediaRepository } from '../src/modules/pages/infrastructure/prisma-page-media.repository';
import { PrismaPagesRepository } from '../src/modules/pages/infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from '../src/modules/pages/infrastructure/prisma-template-version.reader';
import type { OwnerPage } from '../src/modules/pages/domain/page.types';

class TestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.header('x-test-user');

    if (!userId) {
      throw new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    request.authSession = {
      user: { id: userId },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}

type PublishingService = Pick<
  PageService,
  'publishPage' | 'unpublishPage' | 'changePublishedSlug' | 'getPublicPage'
>;

const pageService: jest.Mocked<PublishingService> = {
  publishPage: jest.fn(),
  unpublishPage: jest.fn(),
  changePublishedSlug: jest.fn(),
  getPublicPage: jest.fn(),
};

const rateLimitService = {
  consumeCreator: jest.fn<RateLimitService['consumeCreator']>(),
  consumePublic: jest.fn<RateLimitService['consumePublic']>(),
};

const ownerPage: OwnerPage = {
  id: '11111111-1111-4111-8111-111111111111',
  creatorId: 'creator-123',
  slug: 'my-letter',
  displaySlug: 'my-letter',
  status: 'PUBLISHED',
  contentVersion: 1,
  content: {
    recipientName: 'For Alex',
    mainMessage: 'A public message.',
    sections: [],
  },
  settings: {
    theme: 'paper',
    fontStyle: 'serif',
    autoPlayMusic: false,
    music: null,
  },
  template: {
    id: '22222222-2222-4222-8222-222222222222',
    key: 'secret-letter',
    name: 'Secret Letter',
    templateVersionId: '33333333-3333-4333-8333-333333333333',
    version: 1,
    registryKey: 'secret-letter@1',
  },
  createdAt: new Date('2026-08-09T04:00:00.000Z'),
  updatedAt: new Date('2026-08-09T04:01:00.000Z'),
};

describe('Pages publishing HTTP boundary (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    jest.clearAllMocks();
    pageService.publishPage.mockResolvedValue({
      page: ownerPage,
      publishedAt: new Date('2026-08-09T04:00:00.000Z'),
      unpublishedAt: null,
    });
    pageService.unpublishPage.mockResolvedValue({
      page: { ...ownerPage, status: 'UNPUBLISHED' },
      publishedAt: new Date('2026-08-09T04:00:00.000Z'),
      unpublishedAt: new Date('2026-08-09T05:00:00.000Z'),
    });
    pageService.changePublishedSlug.mockResolvedValue({
      page: { ...ownerPage, slug: 'new-letter', displaySlug: 'new-letter' },
      publishedAt: ownerPage.updatedAt,
      unpublishedAt: null,
    });
    pageService.getPublicPage.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'For Alex',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PagesModule],
    })
      .overrideProvider(PageService)
      .useValue(pageService)
      .overrideProvider(RateLimitService)
      .useValue(rateLimitService)
      .overrideProvider(APP_ORIGIN)
      .useValue('http://localhost:3000')
      .overrideProvider(RATE_LIMIT_STORE)
      .useValue({ consume: jest.fn() })
      .overrideProvider(VISITOR_IDENTITY_SECRET)
      .useValue('test-secret-test-secret-test-secret')
      .overrideProvider(PRISMA_CLIENT)
      .useValue({})
      .overrideProvider(PAGES_REPOSITORY)
      .useValue({})
      .overrideProvider(TEMPLATE_VERSION_READER)
      .useValue({})
      .overrideProvider(PrismaPagesRepository)
      .useValue({})
      .overrideProvider(PrismaPageMediaRepository)
      .useValue({})
      .overrideProvider(PrismaTemplateVersionReader)
      .useValue({})
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(TestSessionGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('AC-1 returns the canonical public URL for an authenticated publish', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/pages/11111111-1111-4111-8111-111111111111/publish')
      .set('x-test-user', 'creator-123')
      .send({ customSlug: 'my-letter', confirmReady: true })
      .expect(200);

    expect(response.body).toMatchObject({
      pageId: ownerPage.id,
      status: 'PUBLISHED',
      slug: 'my-letter',
      publicUrl: 'http://localhost:3000/p/my-letter',
      contentVersion: 1,
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(rateLimitService.consumeCreator).toHaveBeenCalledWith('creator-123');
    expect(pageService.publishPage).toHaveBeenCalledWith({
      creatorId: 'creator-123',
      pageId: ownerPage.id,
      customSlug: 'my-letter',
      confirmReady: true,
    });
  });

  it('AC-2 maps an invalid slug to a safe validation response', async () => {
    pageService.publishPage.mockRejectedValueOnce(new InvalidSlugError());

    const response = await request(app.getHttpServer())
      .post('/api/v1/pages/11111111-1111-4111-8111-111111111111/publish')
      .set('x-test-user', 'creator-123')
      .send({ customSlug: 'bad_slug', confirmReady: true })
      .expect(422);

    expect(response.body).toMatchObject({
      statusCode: 422,
      code: 'INVALID_SLUG',
      message:
        'Choose a public slug using lowercase letters, numbers, and single hyphens',
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('AC-4 maps an unpublish confirmation failure to a safe response', async () => {
    pageService.unpublishPage.mockRejectedValueOnce(
      new ConfirmationRequiredError(),
    );

    const response = await request(app.getHttpServer())
      .post('/api/v1/pages/11111111-1111-4111-8111-111111111111/unpublish')
      .set('x-test-user', 'creator-123')
      .send({ confirm: false })
      .expect(422);

    expect(response.body).toMatchObject({
      statusCode: 422,
      code: 'CONFIRMATION_REQUIRED',
      message: 'Explicit confirmation is required',
    });
  });

  it('AC-6 returns only the safe public projection with no session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/public/pages/my-letter')
      .expect(200);

    expect(response.body).toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'For Alex',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    expect(rateLimitService.consumePublic).toHaveBeenCalledWith(
      expect.any(String),
    );
  });

  it('AC-7 maps an unavailable public page to the generic no-store error', async () => {
    pageService.getPublicPage.mockRejectedValueOnce(new PageNotFoundError());

    const response = await request(app.getHttpServer())
      .get('/api/v1/public/pages/missing-letter')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    expect(response.body).not.toHaveProperty('recipientName');
    expect(response.body).not.toHaveProperty('mainMessage');
  });

  it('AC-12 rejects owner mutations without a verified session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/pages/11111111-1111-4111-8111-111111111111/publish')
      .send({ confirmReady: true })
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Authentication required',
    });
    expect(pageService.publishPage).not.toHaveBeenCalled();
  });
});
