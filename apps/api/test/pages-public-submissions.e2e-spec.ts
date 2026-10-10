import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { hashBrowserToken } from '../src/infrastructure/http/browser-token';
import {
  RateLimitService,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import { unlockCookieName } from '../src/infrastructure/http/unlock-cookie';
import {
  PagePasswordService,
  PagePasswordConfigurationError,
} from '../src/modules/pages/application/page-password.service';
import { PageSubmissionsService } from '../src/modules/pages/application/page-submissions.service';
import {
  PageJourneySubmissionService,
  PageJourneySubmissionNotFoundError,
  PageJourneySubmissionCapabilityError,
  PageJourneySubmissionInvalidBranchError,
  PageJourneySubmissionVersionConflictError,
  PageJourneySubmissionDuplicateError,
  PageJourneySubmissionIdempotencyConflictError,
} from '../src/modules/pages/application/page-journey-submissions.service';
import { PublicPageSubmissionsController } from '../src/modules/pages/presentation/public-page-submissions.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const secret = 'fixture-submission-identity-secret';
const browser = 'fixture-browser';
const cookie = `letterly_browser=${browser}`;
const url = '/api/v1/public/pages/Letter42/submissions';
const letter = {
  answers: [],
  visitorMessage: 'Private message',
  idempotencyKey: 'body-key',
};
const journey = {
  publishedGraphVersion: 3,
  answers: [{ questionKey: 'root', choiceKey: 'happy' }],
  outcomeKey: 'happy-result',
  visitorMessage: 'Private message',
  idempotencyKey: 'ignored-body-key',
};
function createPorts() {
  return {
    letter: {
      findPublicPageScope: jest
        .fn<PageSubmissionsService['findPublicPageScope']>()
        .mockResolvedValue(pageId),
      submit: jest
        .fn<PageSubmissionsService['submit']>()
        .mockResolvedValue({ accepted: true }),
    },
    journey: {
      findPublicPageScope: jest
        .fn<PageJourneySubmissionService['findPublicPageScope']>()
        .mockResolvedValue(pageId),
      submit: jest
        .fn<PageJourneySubmissionService['submit']>()
        .mockResolvedValue({ accepted: true }),
    },
    password: {
      findPublicProtection: jest
        .fn<PagePasswordService['findPublicProtection']>()
        .mockResolvedValue(null),
      verifyUnlockToken: jest
        .fn<PagePasswordService['verifyUnlockToken']>()
        .mockResolvedValue(true),
    },
    limiter: {
      consumeVisitorSubmission: jest
        .fn<RateLimitService['consumeVisitorSubmission']>()
        .mockResolvedValue(undefined),
    },
  };
}
describe('Public submission controller HTTP boundary', () => {
  let app: INestApplication<App>;
  let ports: ReturnType<typeof createPorts>;
  async function compose(
    options: {
      letter?: boolean;
      journey?: boolean;
      secret?: boolean;
      password?: boolean;
      limiter?: boolean;
    } = {},
  ) {
    const module = await Test.createTestingModule({
      controllers: [PublicPageSubmissionsController],
      providers: [
        ...(options.letter === false
          ? []
          : [{ provide: PageSubmissionsService, useValue: ports.letter }]),
        ...(options.journey === false
          ? []
          : [
              {
                provide: PageJourneySubmissionService,
                useValue: ports.journey,
              },
            ]),
        ...(options.secret === false
          ? []
          : [{ provide: VISITOR_IDENTITY_SECRET, useValue: secret }]),
        ...(options.password === false
          ? []
          : [{ provide: PagePasswordService, useValue: ports.password }]),
        ...(options.limiter === false
          ? []
          : [{ provide: RateLimitService, useValue: ports.limiter }]),
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
  async function recompose(options: Parameters<typeof compose>[0]) {
    await app.close();
    app = await compose(options);
  }
  function post(body: object = journey) {
    return request(app.getHttpServer())
      .post(url)
      .set('Cookie', cookie)
      .set('Idempotency-Key', 'header-key')
      .send(body);
  }
  function expectNoWrites() {
    expect(ports.letter.submit).not.toHaveBeenCalled();
    expect(ports.journey.submit).not.toHaveBeenCalled();
  }
  it('dispatches journeys using only the header key, safe response, and page scoped browser hash', async () => {
    const response = await post().expect(201);
    expect(response.body).toEqual({ accepted: true });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(ports.journey.findPublicPageScope).toHaveBeenCalledWith('letter42');
    expect(ports.journey.submit).toHaveBeenCalledWith({
      ...journey,
      slug: 'letter42',
      idempotencyKey: 'header-key',
      browserTokenHash: hashBrowserToken(pageId, browser, secret),
      observedPasswordVersion: null,
    });
    expect(ports.letter.findPublicPageScope).not.toHaveBeenCalled();
    expect(ports.letter.submit).not.toHaveBeenCalled();
    expect(ports.limiter.consumeVisitorSubmission).toHaveBeenCalledWith(
      pageId,
      hashBrowserToken(pageId, browser, secret),
    );
    expect(
      ports.journey.findPublicPageScope.mock.invocationCallOrder[0],
    ).toBeLessThan(
      ports.password.findPublicProtection.mock.invocationCallOrder[0],
    );
    expect(
      ports.password.findPublicProtection.mock.invocationCallOrder[0],
    ).toBeLessThan(
      ports.limiter.consumeVisitorSubmission.mock.invocationCallOrder[0],
    );
    expect(
      ports.limiter.consumeVisitorSubmission.mock.invocationCallOrder[0],
    ).toBeLessThan(ports.journey.submit.mock.invocationCallOrder[0]);
  });
  it('dispatches letters using the body key and wrapping the private message', async () => {
    await post(letter).expect(201);
    expect(ports.letter.submit).toHaveBeenCalledWith({
      ...letter,
      slug: 'letter42',
      browserTokenHash: hashBrowserToken(pageId, browser, secret),
      visitorMessage: { message: letter.visitorMessage },
      observedPasswordVersion: null,
    });
    expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
  });
  it('requires the journey header even when the body contains a key', async () => {
    const response = await request(app.getHttpServer())
      .post(url)
      .set('Cookie', cookie)
      .send(journey)
      .expect(400);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'BAD_REQUEST',
    );
    expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it('preserves the existing union fallback when empty answers match the letter contract', async () => {
    await post({ ...journey, answers: [] }).expect(201);
    expect(ports.letter.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: journey.idempotencyKey,
        answers: [],
      }),
    );
    expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
  });
  it.each([letter, journey])(
    'requires a cookie before scope, password, and limit checks for %j',
    async (body) => {
      const response = await request(app.getHttpServer())
        .post(url)
        .set('Idempotency-Key', 'header-key')
        .send(body)
        .expect(422);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'COOKIE_REQUIRED',
      );
      expect(ports.letter.findPublicPageScope).not.toHaveBeenCalled();
      expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expect(ports.limiter.consumeVisitorSubmission).not.toHaveBeenCalled();
    },
  );
  it.each([{ secret: false }, { letter: false, journey: false }])(
    'fails unavailable before identity and scope checks with %j',
    async (options) => {
      await recompose(options);
      const response = await request(app.getHttpServer())
        .post(url)
        .send(journey)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'SERVICE_UNAVAILABLE',
      );
      expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );
  it.each(['letter', 'journey'] as const)(
    'retains missing selected %s service behavior when the other service exists',
    async (kind) => {
      await recompose({ [kind]: false });
      const response = await post(kind === 'letter' ? letter : journey).expect(
        404,
      );
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'PAGE_NOT_FOUND',
      );
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );
  it.each(['letter', 'journey'] as const)(
    'accepts %s with independent optional password and limiter absent',
    async (kind) => {
      await recompose({
        password: false,
        limiter: false,
        ...(kind === 'letter' ? { journey: false } : { letter: false }),
      });
      await post(kind === 'letter' ? letter : journey).expect(201);
      expect(ports[kind].submit).toHaveBeenCalledWith(
        expect.objectContaining({ observedPasswordVersion: undefined }),
      );
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expect(ports.limiter.consumeVisitorSubmission).not.toHaveBeenCalled();
    },
  );
  it.each(['letter', 'journey'] as const)(
    'rejects absent %s scope before password and limits',
    async (kind) => {
      ports[kind].findPublicPageScope.mockRejectedValue(
        new PageJourneySubmissionNotFoundError(),
      );
      const response = await post(kind === 'letter' ? letter : journey).expect(
        404,
      );
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'PAGE_NOT_FOUND',
      );
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expect(ports.limiter.consumeVisitorSubmission).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );
  it.each(['letter', 'journey'] as const)(
    'rejects locked %s before limits or writes',
    async (kind) => {
      ports.password.findPublicProtection.mockResolvedValue({
        pageId,
        passwordVersion: 'version-7',
      });
      ports.password.verifyUnlockToken.mockResolvedValue(false);
      const response = await post(kind === 'letter' ? letter : journey).expect(
        401,
      );
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'PAGE_LOCKED',
      );
      expect(ports.password.verifyUnlockToken).toHaveBeenCalledWith(
        pageId,
        'version-7',
        null,
      );
      expect(ports.limiter.consumeVisitorSubmission).not.toHaveBeenCalled();
      expectNoWrites();
    },
  );
  it('decodes only the scoped journey unlock token and forwards the observed password version', async () => {
    ports.password.findPublicProtection.mockResolvedValue({
      pageId,
      passwordVersion: 'version-7',
    });
    await post()
      .set(
        'Cookie',
        `${cookie}; letterly_unlock_other=wrong; ${unlockCookieName(pageId)}=proof%2Ftoken`,
      )
      .expect(201);
    expect(ports.password.verifyUnlockToken).toHaveBeenCalledWith(
      pageId,
      'version-7',
      'proof/token',
    );
    expect(ports.journey.submit).toHaveBeenCalledWith(
      expect.objectContaining({ observedPasswordVersion: 'version-7' }),
    );
  });
  it.each([
    [new PageJourneySubmissionNotFoundError(), 404, 'PAGE_NOT_FOUND'],
    [new PageJourneySubmissionCapabilityError(), 422, 'UNSUPPORTED_CAPABILITY'],
    [new PageJourneySubmissionInvalidBranchError(), 422, 'INVALID_BRANCH'],
    [
      new PageJourneySubmissionVersionConflictError(),
      409,
      'JOURNEY_VERSION_STALE',
    ],
    [new PageJourneySubmissionDuplicateError(), 409, 'DUPLICATE_SUBMISSION'],
    [
      new PageJourneySubmissionIdempotencyConflictError(),
      409,
      'IDEMPOTENCY_CONFLICT',
    ],
  ] as const)('preserves journey error %s', async (error, status, code) => {
    ports.journey.submit.mockRejectedValue(error);
    const response = await post().expect(status);
    expect(apiErrorEnvelopeSchema.parse(response.body)).toMatchObject({
      statusCode: status,
      code,
    });
    expect(apiErrorEnvelopeSchema.parse(response.body).requestId).toEqual(
      expect.any(String),
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it.each([
    [new RateLimitExceededError(37), 429, 'RATE_LIMITED'],
    [new RateLimitUnavailableError(), 503, 'RATE_LIMIT_UNAVAILABLE'],
  ] as const)(
    'preserves submission rate failure %s',
    async (error, status, code) => {
      ports.limiter.consumeVisitorSubmission.mockRejectedValue(error);
      const response = await post().expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
      if (status === 429) expect(response.headers['retry-after']).toBe('37');
      expectNoWrites();
    },
  );
  it('maps password configuration failures before persistence', async () => {
    ports.password.findPublicProtection.mockRejectedValue(
      new PagePasswordConfigurationError(),
    );
    const response = await post().expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'PASSWORD_CONFIGURATION',
    );
    expectNoWrites();
  });
  it.each([
    { ...journey, publishedGraphVersion: 0 },
    { ...journey, answers: [], idempotencyKey: undefined },
    {
      ...journey,
      answers: Array.from({ length: 13 }, () => journey.answers[0]),
    },
    { ...journey, outcomeKey: '' },
    { ...letter, idempotencyKey: '' },
  ])('rejects invalid input before service calls for %j', async (body) => {
    const response = await post(body).expect(422);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'VALIDATION_FAILED',
    );
    expect(ports.letter.findPublicPageScope).not.toHaveBeenCalled();
    expect(ports.journey.findPublicPageScope).not.toHaveBeenCalled();
    expectNoWrites();
  });
  it('strips unknown input and output fields at the transport boundary', async () => {
    ports.journey.submit.mockResolvedValue({
      accepted: true,
      privateData: 'hidden',
    } as { accepted: true });
    const response = await post({
      ...journey,
      creatorId: 'untrusted',
      privateData: 'untrusted',
    }).expect(201);
    expect(response.body).toEqual({ accepted: true });
    expect(ports.journey.submit.mock.calls[0]?.[0]).not.toHaveProperty(
      'creatorId',
    );
    expect(ports.journey.submit.mock.calls[0]?.[0]).not.toHaveProperty(
      'privateData',
    );
  });
  it('returns a safe server error when the service violates the response contract', async () => {
    ports.journey.submit.mockResolvedValue({ accepted: false } as unknown as {
      accepted: true;
    });
    const response = await post().expect(500);
    expect(apiErrorEnvelopeSchema.parse(response.body).message).toBe(
      'An unexpected error occurred',
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('redacts unexpected persistence failures', async () => {
    ports.journey.submit.mockRejectedValue(
      new Error('private persistence content'),
    );
    const response = await post().expect(500);
    expect(apiErrorEnvelopeSchema.parse(response.body).message).toBe(
      'An unexpected error occurred',
    );
    expect(JSON.stringify(response.body)).not.toContain(
      'private persistence content',
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
