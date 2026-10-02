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
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import { PageService } from '../src/modules/pages/application/page.service';
import { PageQuestionService } from '../src/modules/pages/application/page-questions.service';
import {
  PAGE_QUESTIONS_REPOSITORY,
  type PageQuestionsRepository,
} from '../src/modules/pages/application/page-questions.repository';
import { PagesController } from '../src/modules/pages/pages.controller';
import { pageQuestionServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const questionId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';

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
    create: jest.fn<PageQuestionsRepository['create']>(),
    list: jest.fn<PageQuestionsRepository['list']>(),
    update: jest.fn<PageQuestionsRepository['update']>(),
    delete: jest.fn<PageQuestionsRepository['delete']>(),
    reorder: jest.fn<PageQuestionsRepository['reorder']>(),
  };
}

describe('Question service factory and HTTP boundary', () => {
  let app: INestApplication<App>;
  let repository: ReturnType<typeof createRepository>;
  const consumeCreator = jest.fn<RateLimitService['consumeCreator']>();

  beforeEach(async () => {
    repository = createRepository();
    consumeCreator.mockReset().mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [PagesController],
      providers: [
        pageQuestionServiceProvider,
        { provide: PAGE_QUESTIONS_REPOSITORY, useValue: {} },
        { provide: PageService, useValue: {} },
        { provide: RateLimitService, useValue: { consumeCreator } },
      ],
    })
      .overrideProvider(PAGE_QUESTIONS_REPOSITORY)
      .useValue(repository)
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(FixtureSessionGuard)
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('resolves the singleton factory and uses authenticated identity through a repository override', async () => {
    expect(app.get(PageQuestionService)).toBe(app.get(PageQuestionService));
    repository.create.mockResolvedValue({
      type: 'updated',
      contentVersion: 3,
      question: {
        id: questionId,
        pageId,
        key: 'question-1',
        type: 'PLAIN_MESSAGE',
        prompt: 'Your message?',
        displayOrder: 0,
        config: null,
        choices: [],
      },
    });
    const response = await request(app.getHttpServer())
      .post(`/api/v1/pages/${pageId}/questions`)
      .send({
        type: 'PLAIN_MESSAGE',
        prompt: 'Your message?',
        expectedContentVersion: 2,
        creatorId: 'untrusted-creator',
      })
      .expect(201);
    expect(repository.create.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          type: 'PLAIN_MESSAGE',
          prompt: 'Your message?',
          expectedContentVersion: 2,
        },
      ],
    ]);
    expect(consumeCreator).toHaveBeenCalledWith(creatorId);
    expect(response.body).toMatchObject({
      contentVersion: 3,
      question: { id: questionId, prompt: 'Your message?' },
    });
  });

  it('preserves stale version metadata through the real update service', async () => {
    repository.update.mockResolvedValue({
      type: 'stale',
      currentContentVersion: 5,
    });
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/pages/${pageId}/questions/${questionId}`)
      .send({ prompt: 'Updated?', expectedContentVersion: 2 })
      .expect(409);
    expect(response.body).toMatchObject({
      code: 'STALE_VERSION',
      details: { currentContentVersion: 5 },
    });
    expect(repository.update.mock.calls[0]?.[0]).toMatchObject({
      creatorId,
      pageId,
      questionId,
      expectedContentVersion: 2,
      confirmResponseDeletion: false,
    });
  });

  it('preserves destructive response confirmation details through the real delete service', async () => {
    repository.delete.mockResolvedValue({
      type: 'response_impact',
      affectedResponseCount: 4,
    });
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/pages/${pageId}/questions/${questionId}`)
      .send({ expectedContentVersion: 2 })
      .expect(409);
    expect(response.body).toMatchObject({
      code: 'RESPONSE_IMPACT',
      details: { affectedResponseCount: 4, confirmResponseDeletion: true },
    });
    expect(repository.delete.mock.calls[0]?.[0]).toMatchObject({
      creatorId,
      pageId,
      questionId,
      confirmResponseDeletion: false,
    });
  });

  it('maps an unavailable question list to the existing safe page error', async () => {
    repository.list.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get(`/api/v1/pages/${pageId}/questions`)
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(repository.list.mock.calls).toEqual([[{ creatorId, pageId }]]);
  });

  it('rejects malformed input before the repository mutation', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/pages/${pageId}/questions`)
      .send({ type: 'PLAIN_MESSAGE', prompt: '', expectedContentVersion: 2 })
      .expect(422);
    expect(repository.create.mock.calls).toHaveLength(0);
    expect(consumeCreator).not.toHaveBeenCalled();
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageQuestionServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      list: jest.fn<PageQuestionService['list']>().mockResolvedValue([]),
    };
    const module = await Test.createTestingModule({
      providers: [pageQuestionServiceProvider],
    })
      .overrideProvider(PageQuestionService)
      .useValue(replacement)
      .compile();
    try {
      expect(module.get(PageQuestionService)).toBe(replacement);
      await expect(
        module.get(PageQuestionService).list({ creatorId, pageId }),
      ).resolves.toEqual([]);
    } finally {
      await module.close();
    }
  });
});
