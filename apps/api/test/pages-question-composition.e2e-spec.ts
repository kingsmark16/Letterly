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
import { ApiException } from '../src/infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import { PageQuestionService } from '../src/modules/pages/application/page-questions.service';
import {
  PAGE_QUESTIONS_REPOSITORY,
  type PageQuestionRecord,
  type PageQuestionMutationResult,
  type PageQuestionsRepository,
} from '../src/modules/pages/application/page-questions.repository';
import { OwnerPageQuestionsController } from '../src/modules/pages/presentation/owner-page-questions.controller';
import { pageQuestionServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const questionId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';
const question: PageQuestionRecord = {
  id: questionId,
  pageId,
  key: 'question-1',
  type: 'PLAIN_MESSAGE',
  prompt: 'Your message?',
  displayOrder: 0,
  config: null,
  choices: [],
};
const baseUrl = `/api/v1/pages/${pageId}/questions`;
const routes = [
  {
    name: 'create',
    method: 'post',
    path: baseUrl,
    body: {
      type: 'PLAIN_MESSAGE',
      prompt: 'Your message?',
      expectedContentVersion: 2,
    },
    operation: 'create',
  },
  { name: 'list', method: 'get', path: baseUrl, body: {}, operation: 'list' },
  {
    name: 'reorder',
    method: 'patch',
    path: `${baseUrl}/order`,
    body: { questionIds: [questionId], expectedContentVersion: 2 },
    operation: 'reorder',
  },
  {
    name: 'update',
    method: 'patch',
    path: `${baseUrl}/${questionId}`,
    body: { prompt: 'Updated?', expectedContentVersion: 2 },
    operation: 'update',
  },
  {
    name: 'delete',
    method: 'delete',
    path: `${baseUrl}/${questionId}`,
    body: { expectedContentVersion: 2 },
    operation: 'delete',
  },
] as const;
let authenticated = true;

class FixtureSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!authenticated) {
      throw new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }
    const incoming = context.switchToHttp().getRequest<AuthenticatedRequest>();
    incoming.authSession = {
      user: { id: creatorId },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}

function createRepository() {
  const reorder = jest.fn<PageQuestionsRepository['reorder']>();
  reorder.mockResolvedValue({
    type: 'reordered',
    questionIds: [questionId],
    contentVersion: 3,
  });
  return {
    create: jest
      .fn<PageQuestionsRepository['create']>()
      .mockResolvedValue({ type: 'updated', question, contentVersion: 3 }),
    list: jest
      .fn<PageQuestionsRepository['list']>()
      .mockResolvedValue([question]),
    update: jest
      .fn<PageQuestionsRepository['update']>()
      .mockResolvedValue({ type: 'updated', question, contentVersion: 3 }),
    delete: jest
      .fn<PageQuestionsRepository['delete']>()
      .mockResolvedValue({ type: 'deleted', contentVersion: 3 }),
    reorder,
  };
}

describe('Question service factory and HTTP boundary', () => {
  let app: INestApplication<App>;
  let repository: ReturnType<typeof createRepository>;
  const consumeCreator = jest.fn<RateLimitService['consumeCreator']>();

  beforeEach(async () => {
    authenticated = true;
    repository = createRepository();
    consumeCreator.mockReset().mockResolvedValue(undefined);
    app = await compose();
  });

  async function compose(withService = true, withRateLimit = true) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPageQuestionsController],
      providers: [
        ...(withService
          ? [
              pageQuestionServiceProvider,
              { provide: PAGE_QUESTIONS_REPOSITORY, useValue: {} },
            ]
          : []),
        ...(withRateLimit
          ? [{ provide: RateLimitService, useValue: { consumeCreator } }]
          : []),
      ],
    })
      .overrideProvider(PAGE_QUESTIONS_REPOSITORY)
      .useValue(repository)
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(FixtureSessionGuard)
      .compile();
    const result: INestApplication<App> = module.createNestApplication();
    configureHttpApplication(result);
    await result.init();
    return result;
  }

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

  it('lists a safe private projection without applying write limits', async () => {
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}?creatorId=untrusted`)
      .expect(200);
    expect(repository.list.mock.calls).toEqual([[{ creatorId, pageId }]]);
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(response.body).toEqual([
      {
        id: questionId,
        pageId,
        type: 'PLAIN_MESSAGE',
        prompt: 'Your message?',
        displayOrder: 0,
        choices: [],
      },
    ]);
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('resolves the order route before the question ID route and retains version forwarding', async () => {
    const response = await request(app.getHttpServer())
      .patch(`${baseUrl}/order`)
      .send({ questionIds: [questionId], expectedContentVersion: 2 })
      .expect(200);
    expect(response.body).toEqual({
      questionIds: [questionId],
      contentVersion: 3,
    });
    expect(repository.reorder.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          questionIds: [questionId],
          expectedContentVersion: 2,
        },
      ],
    ]);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('forwards explicit update confirmation and removes persistence fields from the response', async () => {
    const response = await request(app.getHttpServer())
      .patch(`${baseUrl}/${questionId}`)
      .send({
        prompt: 'Updated?',
        expectedContentVersion: 2,
        confirmResponseDeletion: true,
        creatorId: 'untrusted',
      })
      .expect(200);
    expect(repository.update.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          questionId,
          prompt: 'Updated?',
          expectedContentVersion: 2,
          confirmResponseDeletion: true,
        },
      ],
    ]);
    expect(response.body).not.toHaveProperty('question.key');
    expect(response.body).not.toHaveProperty('question.config');
  });

  it('forwards explicit delete confirmation and retains the delete response', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${baseUrl}/${questionId}`)
      .send({
        expectedContentVersion: 2,
        confirmResponseDeletion: true,
        creatorId: 'untrusted',
      })
      .expect(200);
    expect(repository.delete.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId,
          questionId,
          expectedContentVersion: 2,
          confirmResponseDeletion: true,
        },
      ],
    ]);
    expect(response.body).toEqual({ deleted: true, contentVersion: 3 });
  });

  it.each(routes)('requires authentication before $name', async (route) => {
    authenticated = false;
    const response = await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(401);
    expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(repository[route.operation]).not.toHaveBeenCalled();
    expect(consumeCreator).not.toHaveBeenCalled();
  });

  it.each(routes)(
    'retains optional service unavailable behavior for $name',
    async (route) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        [route.method](route.path)
        .send(route.body)
        .expect(503);
      expect(response.body).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Question service unavailable',
      });
      expect(consumeCreator).not.toHaveBeenCalled();
    },
  );

  it.each(routes.filter((route) => route.operation !== 'list'))(
    'limits $name before persistence',
    async (route) => {
      consumeCreator.mockRejectedValue(new RateLimitExceededError(17));
      const response = await request(app.getHttpServer())
        [route.method](route.path)
        .send(route.body)
        .expect(429);
      expect(response.body).toMatchObject({
        code: 'RATE_LIMITED',
        details: { retryAfterSeconds: 17 },
      });
      expect(consumeCreator.mock.calls).toEqual([[creatorId]]);
      expect(repository[route.operation]).not.toHaveBeenCalled();
    },
  );

  it('maps an unavailable write limiter before persistence', async () => {
    consumeCreator.mockRejectedValue(new RateLimitUnavailableError());
    const response = await request(app.getHttpServer())
      .post(baseUrl)
      .send(routes[0].body)
      .expect(503);
    expect(response.body).toMatchObject({ code: 'RATE_LIMIT_UNAVAILABLE' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('retains optional rate limit injection', async () => {
    await app.close();
    app = await compose(true, false);
    await request(app.getHttpServer())
      .post(baseUrl)
      .send(routes[0].body)
      .expect(201);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    { method: 'get', path: '/api/v1/pages/invalid/questions', body: {} },
    { method: 'patch', path: `${baseUrl}/invalid`, body: routes[3].body },
    {
      method: 'delete',
      path: `${baseUrl}/${questionId}`,
      body: { expectedContentVersion: -1 },
    },
  ] as const)(
    'rejects malformed route or body inputs: $method $path',
    async ({ method, path, body }) => {
      await request(app.getHttpServer())[method](path).send(body).expect(422);
      expect(consumeCreator).not.toHaveBeenCalled();
      expect(repository.list).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    },
  );

  it.each([
    { type: 'not_found', status: 404, code: 'PAGE_NOT_FOUND' },
    { type: 'invalid_state', status: 409, code: 'INVALID_STATE' },
    {
      type: 'unsupported_capability',
      status: 422,
      code: 'UNSUPPORTED_CAPABILITY',
    },
    { type: 'invalid_branch', status: 422, code: 'INVALID_BRANCH' },
    { type: 'invalid_choice', status: 422, code: 'INVALID_BRANCH' },
    { type: 'key_taken', status: 409, code: 'QUESTION_KEY_TAKEN' },
    { type: 'question_limit', status: 422, code: 'QUESTION_LIMIT_REACHED' },
  ] as const)(
    'retains the mutation result mapping for $type',
    async ({ type, status, code }) => {
      const result: PageQuestionMutationResult = { type };
      repository.create.mockResolvedValue(result);
      const response = await request(app.getHttpServer())
        .post(baseUrl)
        .send(routes[0].body)
        .expect(status);
      expect(response.body).toMatchObject({ code });
    },
  );

  it('keeps unexpected repository failures private', async () => {
    repository.list.mockRejectedValue(new Error('private provider failure'));
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .expect(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(JSON.stringify(response.body)).not.toContain(
      'private provider failure',
    );
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
