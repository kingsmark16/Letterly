import { jest } from '@jest/globals';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import {
  publicSecretLetterProjectionSchema,
  publicSecretLetterLockedProjectionSchema,
} from '@letterly/contracts/pages';
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
import { z } from 'zod';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitService,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import { unlockCookieName } from '../src/infrastructure/http/unlock-cookie';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  PageService,
  PageNotFoundError,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from '../src/modules/pages/application/page.service';
import { PublicPageReadController } from '../src/modules/pages/presentation/public-page-read.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const secret = 'fixture-read-identity-secret';
const url = '/api/v1/public/pages/Letter42';
const letter = publicSecretLetterProjectionSchema.parse({
  displaySlug: 'letter42',
  canonicalUrl: 'http://localhost:3000/p/letter42',
  template: { key: 'secret-letter', version: 1 },
  recipientName: 'Juliet',
  mainMessage: 'A published letter.',
  sections: [],
  images: [],
});
const journey = pageJourneyPublicPageProjectionSchema.parse({
  displaySlug: 'letter42',
  canonicalUrl: 'http://localhost:3000/p/letter42',
  template: { key: 'choose-your-heart', version: 1 },
  publishedGraphVersion: 1,
  rootQuestionKey: 'root',
  maxDepth: 1,
  questions: [],
  outcomes: [],
  images: [],
});
const locked = publicSecretLetterLockedProjectionSchema.parse({
  state: 'LOCKED',
  displaySlug: 'letter42',
  canonicalUrl: 'http://localhost:3000/p/letter42',
  template: { key: 'secret-letter', version: 1 },
});

describe('Public page reading HTTP boundary', () => {
  let app: INestApplication<App>;
  let getPublicPage: ReturnType<typeof jest.fn<PageService['getPublicPage']>>;
  let consumePublic: ReturnType<
    typeof jest.fn<RateLimitService['consumePublic']>
  >;
  async function compose(withLimiter = true, withSecret = true) {
    const module = await Test.createTestingModule({
      controllers: [PublicPageReadController],
      providers: [
        { provide: PageService, useValue: { getPublicPage } },
        ...(withLimiter
          ? [{ provide: RateLimitService, useValue: { consumePublic } }]
          : []),
        ...(withSecret
          ? [{ provide: VISITOR_IDENTITY_SECRET, useValue: secret }]
          : []),
      ],
    }).compile();
    const result: INestApplication<App> = module.createNestApplication();
    configureHttpApplication(result);
    await result.init();
    return result;
  }
  beforeEach(async () => {
    getPublicPage = jest
      .fn<PageService['getPublicPage']>()
      .mockResolvedValue(letter);
    consumePublic = jest
      .fn<RateLimitService['consumePublic']>()
      .mockResolvedValue(undefined);
    app = await compose();
  });
  afterEach(async () => {
    await app.close();
  });
  function expectPrivateHeaders(headers: Record<string, unknown>) {
    expect(headers['cache-control']).toBe('no-store');
    expect(headers['x-robots-tag']).toBe('noindex, nofollow, noarchive');
    expect(headers['x-request-id']).toEqual(expect.any(String));
  }
  it.each([
    { name: 'letter', projection: letter },
    { name: 'journey', projection: journey },
    { name: 'locked', projection: locked },
  ])(
    'returns the existing safe $name projection anonymously',
    async ({ projection }) => {
      getPublicPage.mockResolvedValue(projection);
      const response = await request(app.getHttpServer()).get(url).expect(200);
      expect(response.body).toEqual(projection);
      expectPrivateHeaders(response.headers);
      expect(getPublicPage.mock.calls[0]?.[0]).toBe('Letter42');
      expect(consumePublic.mock.invocationCallOrder[0]).toBeLessThan(
        getPublicPage.mock.invocationCallOrder[0],
      );
      if ('state' in projection) {
        expect(response.body).not.toHaveProperty('mainMessage');
        expect(response.body).not.toHaveProperty('questions');
      }
    },
  );
  it('retains legacy letter projections without a response capability field', async () => {
    const { response: omittedResponse, ...legacy } = letter;
    expect(omittedResponse).toEqual({ enabled: false });
    getPublicPage.mockResolvedValue(legacy);
    const response = await request(app.getHttpServer()).get(url).expect(200);
    expect(response.body).toEqual(legacy);
    expect(response.body).not.toHaveProperty('response');
  });
  it.each([letter, journey])(
    'strips unrecognized fields during transport projection validation',
    async (projection) => {
      const projectionWithExtraField = { ...projection, privateData: 'hidden' };
      getPublicPage.mockResolvedValue(projectionWithExtraField);
      const response = await request(app.getHttpServer()).get(url).expect(200);
      expect(response.body).toEqual(projection);
      expect(response.text).not.toContain('hidden');
    },
  );
  it('forwards a reader that decodes only the trusted page unlock cookie', async () => {
    await request(app.getHttpServer())
      .get(url)
      .set(
        'Cookie',
        `letterly_browser=existing; letterly_unlock_other=wrong; ${unlockCookieName(pageId)}=proof%2Ftoken`,
      )
      .expect(200);
    const reader = getPublicPage.mock.calls[0]?.[1];
    if (typeof reader !== 'function')
      throw new Error('Expected unlock token reader');
    expect(reader(pageId)).toBe('proof/token');
    expect(reader('another-page')).toBeNull();
  });
  it.each(['development', 'production'])(
    'issues a new browser cookie with existing attributes in %s',
    async (environment) => {
      const previousEnvironment = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = environment;
        const response = await request(app.getHttpServer())
          .get(url)
          .expect(200);
        const cookies = z
          .array(z.string())
          .parse(response.headers['set-cookie']);
        expect(cookies).toHaveLength(1);
        expect(cookies[0]).toMatch(/^letterly_browser=[A-Za-z0-9_-]{43};/);
        expect(cookies[0]).toContain('HttpOnly');
        expect(cookies[0]).toContain('SameSite=Lax');
        expect(cookies[0]).toContain('Path=/');
        expect(cookies[0]).toContain('Max-Age=31536000');
        expect(cookies[0]?.includes('; Secure')).toBe(
          environment === 'production',
        );
      } finally {
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
      }
    },
  );
  it('retains an existing valid browser cookie', async () => {
    const response = await request(app.getHttpServer())
      .get(url)
      .set('Cookie', 'letterly_browser=existing')
      .expect(200);
    expect(response.headers['set-cookie']).toBeUndefined();
  });
  it.each(['letterly_browser=', 'letterly_browser=%XX'])(
    'replaces unusable cookie %s',
    async (cookie) => {
      const response = await request(app.getHttpServer())
        .get(url)
        .set('Cookie', cookie)
        .expect(200);
      expect(
        z.array(z.string()).parse(response.headers['set-cookie']),
      ).toHaveLength(1);
    },
  );
  it('uses signed identity for the public limit', async () => {
    const payload = createVisitorIdentityPayload(
      '203.0.113.24',
      Math.floor(Date.now() / 1000),
    );
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    await request(app.getHttpServer())
      .get(url)
      .set(visitorIdentityHeader, `${payload}.${signature}`)
      .expect(200);
    expect(consumePublic).toHaveBeenCalledWith('203.0.113.24');
  });
  it.each([
    [false, true],
    [true, false],
  ])(
    'retains optional limiter %s and identity secret %s',
    async (withLimiter, withSecret) => {
      await app.close();
      app = await compose(withLimiter, withSecret);
      await request(app.getHttpServer()).get(url).expect(200);
      if (withLimiter)
        expect(consumePublic).toHaveBeenCalledWith(
          expect.stringMatching(/^(::ffff:)?127\.0\.0\.1$/),
        );
      else expect(consumePublic).not.toHaveBeenCalled();
    },
  );
  it.each([
    [new RateLimitExceededError(37), 429, 'RATE_LIMITED'],
    [new RateLimitUnavailableError(), 503, 'RATE_LIMIT_UNAVAILABLE'],
  ] as const)(
    'maps public limit failure %s before reading while retaining cookie issuance',
    async (error, status, code) => {
      consumePublic.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .get(url)
        .expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
      expectPrivateHeaders(response.headers);
      expect(
        z.array(z.string()).parse(response.headers['set-cookie']),
      ).toHaveLength(1);
      if (status === 429) expect(response.headers['retry-after']).toBe('37');
      expect(getPublicPage).not.toHaveBeenCalled();
    },
  );
  it.each([
    [new PageNotFoundError(), 404, 'PAGE_NOT_FOUND'],
    [new PublicPageReadUnavailableError(), 503, 'SERVICE_UNAVAILABLE'],
    [
      new TemplateDefinitionUnavailableError(),
      503,
      'TEMPLATE_DEFINITION_UNAVAILABLE',
    ],
    [new Error('private persistence details'), 500, 'INTERNAL_SERVER_ERROR'],
  ] as const)(
    'maps public read failure %s with private headers',
    async (error, status, code) => {
      getPublicPage.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .get(url)
        .expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
      expect(response.text).not.toContain('private persistence details');
      expectPrivateHeaders(response.headers);
    },
  );
  it('rejects overlong slug before cookie issuance, limits, or reads', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/pages/${'a'.repeat(201)}`)
      .expect(422);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'VALIDATION_FAILED',
    );
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(consumePublic).not.toHaveBeenCalled();
    expect(getPublicPage).not.toHaveBeenCalled();
  });
});
