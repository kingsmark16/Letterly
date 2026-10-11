import { Global, Module, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  apiErrorEnvelopeSchema,
  healthResponseSchema,
  type RateLimitStore,
} from '@letterly/contracts';
import type { PrismaClient } from '@letterly/database';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PRISMA_CLIENT } from '../src/infrastructure/database/prisma-token';
import { HealthModule } from '../src/infrastructure/health/health.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RATE_LIMIT_STORE,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';

@Global()
@Module({
  providers: [{ provide: PRISMA_CLIENT, useValue: undefined }],
  exports: [PRISMA_CLIENT],
})
class TestPrismaModule {}

describe('API health endpoints (e2e)', () => {
  let app: INestApplication<App> | undefined;

  async function startApp(
    prisma: PrismaClient,
    rateLimitStore: RateLimitStore,
  ): Promise<INestApplication<App>> {
    const module = await Test.createTestingModule({
      imports: [TestPrismaModule, HealthModule],
    })
      .overrideProvider(PRISMA_CLIENT)
      .useValue(prisma)
      .overrideProvider(RATE_LIMIT_STORE)
      .useValue(rateLimitStore)
      .compile();

    const application: INestApplication<App> = module.createNestApplication({
      bodyParser: false,
    });
    configureHttpApplication(application);
    await application.init();
    app = application;
    return application;
  }

  function createPrisma(operation: () => Promise<unknown>) {
    let calls = 0;
    const prisma = {
      $queryRaw: async () => {
        calls += 1;
        return operation();
      },
    } as unknown as PrismaClient;

    return { prisma, calls: () => calls };
  }

  function createRateLimitStore(operation: () => Promise<void>) {
    let availabilityCalls = 0;
    let consumeCalls = 0;
    const store: RateLimitStore = {
      checkAvailability: async () => {
        availabilityCalls += 1;
        await operation();
      },
      consume: () => {
        consumeCalls += 1;
        return Promise.resolve({
          allowed: true,
          remaining: 1,
          retryAfterSeconds: 60,
        });
      },
    };

    return {
      store,
      availabilityCalls: () => availabilityCalls,
      consumeCalls: () => consumeCalls,
    };
  }

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('serves process health without probing providers, authentication, or rate limits', async () => {
    const postgres = createPrisma(() =>
      Promise.reject(new Error('database secret')),
    );
    const redis = createRateLimitStore(() =>
      Promise.reject(new Error('redis secret')),
    );
    const application = await startApp(postgres.prisma, redis.store);

    const response = await request(application.getHttpServer())
      .get('/health')
      .expect(200);

    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
      service: 'api',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(postgres.calls()).toBe(0);
    expect(redis.availabilityCalls()).toBe(0);
    expect(redis.consumeCalls()).toBe(0);
  });

  it('reports readiness after both PostgreSQL and critical Redis checks pass', async () => {
    const postgres = createPrisma(() => Promise.resolve([]));
    const redis = createRateLimitStore(() => Promise.resolve());
    const application = await startApp(postgres.prisma, redis.store);

    const response = await request(application.getHttpServer())
      .get('/ready')
      .expect(200);

    expect(healthResponseSchema.parse(response.body)).toEqual({
      status: 'ok',
      service: 'api',
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(postgres.calls()).toBe(1);
    expect(redis.availabilityCalls()).toBe(1);
    expect(redis.consumeCalls()).toBe(0);
  });

  it.each<string>(['PostgreSQL', 'critical Redis'])(
    'returns the same safe unavailable response when %s is unavailable',
    async (dependency) => {
      const postgres =
        dependency === 'PostgreSQL'
          ? createPrisma(() =>
              Promise.reject(
                Object.assign(new Error('database unavailable'), {
                  code: 'P1001',
                }),
              ),
            )
          : createPrisma(() => Promise.resolve([]));
      const redis =
        dependency === 'critical Redis'
          ? createRateLimitStore(() =>
              Promise.reject(new RateLimitUnavailableError()),
            )
          : createRateLimitStore(() => Promise.resolve());
      const application = await startApp(postgres.prisma, redis.store);

      const response = await request(application.getHttpServer())
        .get('/ready')
        .expect(503);

      const error = apiErrorEnvelopeSchema.parse(response.body);
      expect(error).toEqual({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Request service temporarily unavailable',
        requestId: error.requestId,
      });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['x-request-id']).toBe(error.requestId);
      expect(JSON.stringify(error)).not.toMatch(/credentials|database|redis/u);
    },
  );

  it('keeps unexpected PostgreSQL probe errors as generic server failures', async () => {
    const postgres = createPrisma(() =>
      Promise.reject(new Error('unexpected probe implementation failure')),
    );
    const redis = createRateLimitStore(() => Promise.resolve());
    const application = await startApp(postgres.prisma, redis.store);

    const response = await request(application.getHttpServer())
      .get('/ready')
      .expect(500);

    const error = apiErrorEnvelopeSchema.parse(response.body);
    expect(error).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(error)).not.toContain(
      'unexpected probe implementation failure',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBe(error.requestId);
  });
});
