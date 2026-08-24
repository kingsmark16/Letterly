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
  PageNotFoundError,
  StalePageVersionError,
} from '../src/modules/pages/application/page.service';
import { PageMediaService } from '../src/modules/pages/application/page-media.service';
import { PageQuestionService } from '../src/modules/pages/application/page-questions.service';
import { PAGES_REPOSITORY } from '../src/modules/pages/application/pages.repository';
import { TEMPLATE_VERSION_READER } from '../src/modules/pages/application/template-version.reader';
import type { AuthenticatedRequest } from '../src/modules/auth/better-auth-session.guard';
import { BetterAuthSessionGuard } from '../src/modules/auth/better-auth-session.guard';
import { PagesModule } from '../src/modules/pages/pages.module';
import { PrismaPageMediaRepository } from '../src/modules/pages/infrastructure/prisma-page-media.repository';
import { PrismaPagesRepository } from '../src/modules/pages/infrastructure/prisma-pages.repository';
import { PrismaTemplateVersionReader } from '../src/modules/pages/infrastructure/prisma-template-version.reader';
import type {
  PageSummary,
  OwnerPage,
} from '../src/modules/pages/domain/page.types';

const creatorId = 'creator-draft-test';
const otherCreatorId = 'other-creator-draft-test';
const pageId = '11111111-1111-4111-8111-111111111111';
const templateVersionId = '22222222-2222-4222-8222-222222222222';

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

const pageService = {
  createDraft: jest.fn<PageService['createDraft']>(),
  getOwnedPage: jest.fn<PageService['getOwnedPage']>(),
  updateDraft: jest.fn<PageService['updateDraft']>(),
  listPages: jest.fn<PageService['listPages']>(),
  deleteDraft: jest.fn<PageService['deleteDraft']>(),
};

const pageQuestionService = {
  list: jest.fn<PageQuestionService['list']>(),
};

const pageMediaService = {
  listOwnerImages: jest.fn<PageMediaService['listOwnerImages']>(),
};

const ownerPage: OwnerPage = {
  id: pageId,
  creatorId,
  slug: 'draft-test',
  displaySlug: 'draft-test',
  status: 'DRAFT',
  contentVersion: 0,
  content: {
    recipientName: '',
    mainMessage: '',
    sections: [],
  },
  settings: {
    theme: 'romantic',
    fontStyle: 'handwritten',
    autoPlayMusic: false,
    music: null,
    responsesEnabled: false,
  },
  template: {
    id: '33333333-3333-4333-8333-333333333333',
    key: 'secret-letter',
    name: 'Secret Letter',
    templateVersionId,
    version: 1,
    registryKey: 'confession.secret-letter',
  },
  createdAt: new Date('2026-08-20T00:00:00.000Z'),
  updatedAt: new Date('2026-08-20T00:00:00.000Z'),
};

const draftSummary: PageSummary = {
  id: pageId,
  recipientLabel: 'For Alex',
  status: 'DRAFT',
  contentVersion: 1,
  template: ownerPage.template,
  createdAt: ownerPage.createdAt,
  updatedAt: new Date('2026-08-20T00:05:00.000Z'),
};

describe('authenticated draft HTTP boundary (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    jest.clearAllMocks();
    pageService.createDraft.mockResolvedValue(ownerPage);
    pageService.getOwnedPage.mockResolvedValue(ownerPage);
    pageService.updateDraft.mockResolvedValue({
      ...ownerPage,
      contentVersion: 1,
      content: {
        ...ownerPage.content,
        recipientName: 'Alex',
        mainMessage: 'A private draft message.',
      },
      updatedAt: new Date('2026-08-20T00:05:00.000Z'),
    });
    pageService.listPages.mockResolvedValue({
      items: [draftSummary],
      nextCursor: null,
    });
    pageService.deleteDraft.mockResolvedValue(undefined);
    pageQuestionService.list.mockResolvedValue([]);
    pageMediaService.listOwnerImages.mockResolvedValue([]);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, PagesModule],
    })
      .overrideProvider(PageService)
      .useValue(pageService)
      .overrideProvider(PageQuestionService)
      .useValue(pageQuestionService)
      .overrideProvider(PageMediaService)
      .useValue(pageMediaService)
      .overrideProvider(RateLimitService)
      .useValue({ consumeCreator: jest.fn(), consumePublic: jest.fn() })
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

  it('AC-1 creates one private draft for the authenticated creator', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/pages')
      .set('x-test-user', creatorId)
      .send({ templateVersionId })
      .expect(201);

    expect(response.body).toMatchObject({
      id: pageId,
      status: 'DRAFT',
      contentVersion: 0,
      recipientLabel: 'Untitled letter',
    });
    expect(response.body).not.toHaveProperty('creatorId');
    expect(pageService.createDraft).toHaveBeenCalledWith({
      creatorId,
      templateVersionId,
    });
  });

  it('AC-8 rejects an unauthenticated create without calling the page service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pages')
      .send({ templateVersionId })
      .expect(401);

    expect(pageService.createDraft).not.toHaveBeenCalled();
  });

  it('AC-5 lists private summaries without exposing the message', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/pages?status=DRAFT&size=20')
      .set('x-test-user', creatorId)
      .expect(200);

    expect(response.body).toMatchObject({
      items: [
        {
          id: pageId,
          recipientLabel: 'For Alex',
          contentVersion: 1,
        },
      ],
      nextCursor: null,
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    const listBody = response.body as unknown as {
      items: Array<Record<string, unknown>>;
    };
    expect(Object.keys(listBody.items[0] ?? {})).not.toContain('mainMessage');
    expect(pageService.listPages).toHaveBeenCalledWith({
      creatorId,
      size: 20,
      cursor: null,
      status: 'DRAFT',
    });
  });

  it('AC-6 reopens the owner projection for the authenticated creator', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}`)
      .set('x-test-user', creatorId)
      .expect(200);

    expect(response.body).toMatchObject({
      id: pageId,
      content: ownerPage.content,
      contentVersion: 0,
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).not.toHaveProperty('creatorId');
    expect(pageService.getOwnedPage).toHaveBeenCalledWith({
      creatorId,
      pageId,
    });
  });

  it('AC-9 keeps the private question list out of shared caches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}/questions`)
      .set('x-test-user', creatorId)
      .expect(200);

    expect(response.body).toEqual([]);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(pageQuestionService.list).toHaveBeenCalledWith({
      creatorId,
      pageId,
    });
  });

  it('AC-9 keeps the private image list out of shared caches', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}/images`)
      .set('x-test-user', creatorId)
      .expect(200);

    expect(response.body).toEqual([]);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(pageMediaService.listOwnerImages).toHaveBeenCalledWith({
      creatorId,
      pageId,
    });
  });

  it('AC-4 returns safe stale version details without overwriting newer content', async () => {
    pageService.updateDraft.mockRejectedValueOnce(
      new StalePageVersionError(2, new Date('2026-08-20T00:10:00.000Z')),
    );

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/pages/${pageId}`)
      .set('x-test-user', creatorId)
      .send({
        recipientName: 'Alex',
        mainMessage: 'An older browser attempt.',
        expectedContentVersion: 1,
      })
      .expect(409);

    expect(response.body).toMatchObject({
      code: 'STALE_VERSION',
      details: {
        currentContentVersion: 2,
        currentUpdatedAt: '2026-08-20T00:10:00.000Z',
      },
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('AC-7 permanently deletes the owner draft and returns no content', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/pages/${pageId}`)
      .set('x-test-user', creatorId)
      .expect(204);

    expect(pageService.deleteDraft).toHaveBeenCalledWith({
      creatorId,
      pageId,
    });
  });

  it('AC-8 maps a missing or non owned draft to the safe not found response', async () => {
    pageService.getOwnedPage.mockRejectedValueOnce(new PageNotFoundError());

    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}`)
      .set('x-test-user', otherCreatorId)
      .expect(404);

    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
    expect(pageService.getOwnedPage).toHaveBeenCalledWith({
      creatorId: otherCreatorId,
      pageId,
    });
  });
});
