import { chooseYourHeartDefaultGraph } from '@letterly/templates';
import { pageJourneyOwnerResponseSchema } from '@letterly/contracts/page-journeys';
import { jest } from '@jest/globals';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import {
  PAGE_JOURNEYS_REPOSITORY,
  type PageJourneyOwnerState,
  type PageJourneysRepository,
} from '../src/modules/pages/application/page-journeys.repository';
import { pageJourneyServiceProvider } from '../src/modules/pages/pages.module';
import { OwnerPageJourneysController } from '../src/modules/pages/presentation/owner-page-journeys.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const creatorId = 'fixture-creator';
const owner = { pageId, creatorId };
const graph = structuredClone(chooseYourHeartDefaultGraph);
const state: PageJourneyOwnerState = {
  ...owner,
  status: 'DRAFT',
  contentVersion: 1,
  template: { registryKey: 'confession.choose-your-heart', version: 1 },
  draft: { revisionNumber: 2, maxDepth: 1, graph },
  publishedGraphVersion: null,
};
const payload = { ...graph, expectedContentVersion: 0 };
const url = `/api/v1/pages/${pageId}/choose-your-heart`;
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

describe('Owner journey HTTP boundary', () => {
  let app: INestApplication<App>;
  let repository: {
    findOwned: ReturnType<typeof jest.fn<PageJourneysRepository['findOwned']>>;
    save: ReturnType<typeof jest.fn<PageJourneysRepository['save']>>;
  };
  let consumeCreator: ReturnType<
    typeof jest.fn<RateLimitService['consumeCreator']>
  >;

  async function compose(withService = true, withRateLimit = true) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPageJourneysController],
      providers: [
        ...(withService
          ? [
              pageJourneyServiceProvider,
              { provide: PAGE_JOURNEYS_REPOSITORY, useValue: repository },
            ]
          : []),
        ...(withRateLimit
          ? [{ provide: RateLimitService, useValue: { consumeCreator } }]
          : []),
      ],
    })
      .overrideGuard(BetterAuthSessionGuard)
      .useClass(FixtureSessionGuard)
      .compile();
    const result: INestApplication<App> = module.createNestApplication();
    configureHttpApplication(result);
    await result.init();
    return result;
  }

  beforeEach(async () => {
    authenticated = true;
    repository = {
      findOwned: jest
        .fn<PageJourneysRepository['findOwned']>()
        .mockResolvedValue(state),
      save: jest
        .fn<PageJourneysRepository['save']>()
        .mockResolvedValue({ type: 'updated', state }),
    };
    consumeCreator = jest
      .fn<RateLimitService['consumeCreator']>()
      .mockResolvedValue(undefined);
    app = await compose();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reads a safe owner graph using session identity and private caching', async () => {
    const response = await request(app.getHttpServer())
      .get(`${url}?creatorId=untrusted`)
      .expect(200);
    expect(repository.findOwned.mock.calls).toEqual([[owner]]);
    expect(repository.save).not.toHaveBeenCalled();
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(pageJourneyOwnerResponseSchema.parse(response.body)).toEqual({
      draft: { ...graph, revisionNumber: 2 },
      publishedGraphVersion: null,
      contentVersion: 1,
      validation: { valid: true, issues: [] },
    });
    expect(response.body).not.toHaveProperty('creatorId');
    expect(response.body).not.toHaveProperty('status');
    expect(response.headers['cache-control']).toBe('private, no-store');
  });

  it('limits writes before owner lookup and forwards the validated version and graph', async () => {
    const response = await request(app.getHttpServer())
      .put(url)
      .send({ ...payload, creatorId: 'untrusted' })
      .expect(200);
    expect(consumeCreator.mock.calls).toEqual([[creatorId]]);
    expect(repository.findOwned.mock.calls).toEqual([[owner]]);
    expect(repository.save.mock.calls).toEqual([
      [{ ...owner, expectedContentVersion: 0, graph, maxDepth: 1 }],
    ]);
    expect(consumeCreator.mock.invocationCallOrder[0]).toBeLessThan(
      repository.findOwned.mock.invocationCallOrder[0],
    );
    expect(repository.findOwned.mock.invocationCallOrder[0]).toBeLessThan(
      repository.save.mock.invocationCallOrder[0],
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(
      pageJourneyOwnerResponseSchema.parse(response.body).contentVersion,
    ).toBe(1);
  });

  it.each(['get', 'put'] as const)(
    'requires the session guard for %s',
    async (method) => {
      authenticated = false;
      const response = await request(app.getHttpServer())
        [method](url)
        .send(payload)
        .expect(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHENTICATED' });
      expect(repository.findOwned).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(consumeCreator).not.toHaveBeenCalled();
    },
  );

  it.each(['get', 'put'] as const)(
    'rejects an invalid UUID for %s before side effects',
    async (method) => {
      await request(app.getHttpServer())
        [method]('/api/v1/pages/invalid/choose-your-heart')
        .send(payload)
        .expect(422);
      expect(repository.findOwned).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
      expect(consumeCreator).not.toHaveBeenCalled();
    },
  );

  it('rejects a malformed save version before rate limiting or persistence', async () => {
    await request(app.getHttpServer())
      .put(url)
      .send({ ...payload, expectedContentVersion: -1 })
      .expect(422);
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(repository.findOwned).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each(['get', 'put'] as const)(
    'maps a missing owner page to a safe 404 for %s',
    async (method) => {
      repository.findOwned.mockResolvedValue(null);
      const response = await request(app.getHttpServer())
        [method](url)
        .send(payload)
        .expect(404);
      expect(response.body).toMatchObject({
        code: 'PAGE_NOT_FOUND',
        message: 'Page not found',
      });
      expect(repository.save).not.toHaveBeenCalled();
      expect(response.headers['cache-control']).toBe('private, no-store');
    },
  );

  it.each(['get', 'put'] as const)(
    'rejects a non journey template for %s',
    async (method) => {
      repository.findOwned.mockResolvedValue({
        ...state,
        template: { registryKey: 'confession.secret-letter', version: 1 },
      });
      const response = await request(app.getHttpServer())
        [method](url)
        .send(payload)
        .expect(422);
      expect(response.body).toMatchObject({ code: 'UNSUPPORTED_CAPABILITY' });
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      result: { type: 'stale', currentContentVersion: 4 } as const,
      code: 'STALE_VERSION',
      status: 409,
    },
    {
      result: { type: 'invalid_state' } as const,
      code: 'INVALID_STATE',
      status: 409,
    },
    {
      result: { type: 'not_found' } as const,
      code: 'PAGE_NOT_FOUND',
      status: 404,
    },
  ])(
    'retains the save result error: $code',
    async ({ result, code, status }) => {
      repository.save.mockResolvedValue(result);
      const response = await request(app.getHttpServer())
        .put(url)
        .send(payload)
        .expect(status);
      expect(response.body).toMatchObject({ code });
      if (code === 'STALE_VERSION')
        expect(response.body).toMatchObject({
          details: { currentContentVersion: 4 },
        });
      expect(response.headers['cache-control']).toBe('private, no-store');
    },
  );

  it('rejects an invalid graph without persistence and retains issue details', async () => {
    const response = await request(app.getHttpServer())
      .put(url)
      .send({ ...payload, rootQuestionKey: 'missing' })
      .expect(422);
    expect(response.body).toMatchObject({
      code: 'INVALID_BRANCH',
    });
    expect(response.body).toHaveProperty('details.issues.0.path');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: new RateLimitExceededError(15),
      status: 429,
      code: 'RATE_LIMITED',
    },
    {
      error: new RateLimitUnavailableError(),
      status: 503,
      code: 'RATE_LIMIT_UNAVAILABLE',
    },
  ])(
    'retains rate limit error $code before ownership lookup',
    async ({ error, status, code }) => {
      consumeCreator.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .put(url)
        .send(payload)
        .expect(status);
      expect(response.body).toMatchObject({ code });
      if (status === 429)
        expect(response.body).toMatchObject({
          details: { retryAfterSeconds: 15 },
        });
      expect(repository.findOwned).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );

  it.each(['get', 'put'] as const)(
    'retains the optional service unavailable response for %s',
    async (method) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        [method](url)
        .send(payload)
        .expect(503);
      expect(response.body).toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Journey service unavailable',
      });
      expect(consumeCreator).not.toHaveBeenCalled();
      expect(response.headers['cache-control']).toBe('private, no-store');
    },
  );

  it('retains optional rate limit injection', async () => {
    await app.close();
    app = await compose(true, false);
    await request(app.getHttpServer()).put(url).send(payload).expect(200);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(consumeCreator).not.toHaveBeenCalled();
  });

  it('redacts unexpected repository failures', async () => {
    repository.findOwned.mockRejectedValue(
      new Error('private provider failure'),
    );
    const response = await request(app.getHttpServer()).get(url).expect(500);
    expect(response.body).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(response.body)).not.toContain(
      'private provider failure',
    );
  });
});
