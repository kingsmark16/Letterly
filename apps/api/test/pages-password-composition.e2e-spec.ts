import {
  firstMockCallOrder,
  requiredTestValue,
} from './support/required-test-value';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import { createDecipheriv, createHash, createHmac } from 'node:crypto';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PAGE_PASSWORD_ENCRYPTION_KEY,
  PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
  PagePasswordConfigurationError,
  PagePasswordService,
} from '../src/modules/pages/application/page-password.service';
import {
  PAGE_PASSWORD_REPOSITORY,
  type PagePasswordRepository,
} from '../src/modules/pages/application/page-password.repository';
import {
  UNLOCK_PROOF_STORE,
  type UnlockProofStore,
} from '../src/modules/pages/application/unlock-proof.store';
import { pagePasswordServiceProvider } from '../src/modules/pages/pages.module';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { z } from 'zod';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import { PublicPageUnlockController } from '../src/modules/pages/presentation/public-page-unlock.controller';
import { OwnerPagePasswordController } from '../src/modules/pages/presentation/owner-page-password.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const encryptionKey = 'composition-test-key-that-is-long-enough';

function createDependencies() {
  return {
    repository: {
      setOwnedPassword: jest
        .fn<PagePasswordRepository['setOwnedPassword']>()
        .mockResolvedValue('updated'),
      findPublishedPassword:
        jest.fn<PagePasswordRepository['findPublishedPassword']>(),
    },
    store: {
      set: jest.fn<UnlockProofStore['set']>().mockResolvedValue(undefined),
      get: jest.fn<UnlockProofStore['get']>(),
      revoke: jest
        .fn<UnlockProofStore['revoke']>()
        .mockResolvedValue(undefined),
    },
  };
}

describe('Password service factory composition', () => {
  let module: TestingModule | undefined;

  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  it.each([undefined, 'configured-version'])(
    'uses token overrides, encrypts with the supplied key, and retains the version default: %s',
    async (keyVersion) => {
      const { repository, store } = createDependencies();
      const builder = Test.createTestingModule({
        providers: [
          pagePasswordServiceProvider,
          { provide: PAGE_PASSWORD_REPOSITORY, useValue: {} },
          { provide: UNLOCK_PROOF_STORE, useValue: store },
          { provide: PAGE_PASSWORD_ENCRYPTION_KEY, useValue: 'original-key' },
          ...(keyVersion === undefined
            ? []
            : [
                {
                  provide: PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
                  useValue: keyVersion,
                },
              ]),
        ],
      })
        .overrideProvider(PAGE_PASSWORD_REPOSITORY)
        .useValue(repository)
        .overrideProvider(PAGE_PASSWORD_ENCRYPTION_KEY)
        .useValue(encryptionKey);
      module = await builder.compile();
      const service = module.get(PagePasswordService);
      expect(module.get(PagePasswordService)).toBe(service);
      await service.setPassword({
        creatorId: 'creator',
        pageId,
        password: 'secret',
      });
      const encrypted = repository.setOwnedPassword.mock.calls[0]?.[0].password;
      if (!encrypted) throw new Error('Expected an encrypted password');
      expect(encrypted.keyVersion).toBe(keyVersion ?? '1');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        createHash('sha256').update(encryptionKey, 'utf8').digest(),
        Buffer.from(encrypted.iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64url'));
      expect(
        Buffer.concat([
          decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')),
          decipher.final(),
        ]).toString('utf8'),
      ).toBe('secret');
      repository.findPublishedPassword.mockResolvedValue({
        pageId,
        password: encrypted,
      });
      const unlocked = await service.unlock('letter42', 'secret');
      expect(unlocked.pageId).toBe(pageId);
      expect(store.set.mock.calls[0]?.[2]).toBe(24 * 60 * 60);
      expect(store.revoke.mock.calls).toEqual([[pageId, 24 * 60 * 60]]);
    },
  );

  it('resolves without optional configuration and fails safely when encryption is needed', async () => {
    const { repository, store } = createDependencies();
    module = await Test.createTestingModule({
      providers: [
        pagePasswordServiceProvider,
        { provide: PAGE_PASSWORD_REPOSITORY, useValue: repository },
        { provide: UNLOCK_PROOF_STORE, useValue: store },
      ],
    }).compile();
    const service = module.get(PagePasswordService);
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: 'secret' }),
    ).rejects.toEqual(new PagePasswordConfigurationError());
    expect(repository.setOwnedPassword.mock.calls).toHaveLength(0);
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: null }),
    ).resolves.toEqual({ passwordProtected: false });
    expect(store.revoke.mock.calls).toEqual([[pageId, 24 * 60 * 60]]);
  });

  it('retains service token overrides without constructing missing dependencies', async () => {
    const replacement = {
      verifyUnlockToken: jest
        .fn<PagePasswordService['verifyUnlockToken']>()
        .mockResolvedValue(false),
    };
    module = await Test.createTestingModule({
      providers: [pagePasswordServiceProvider],
    })
      .overrideProvider(PagePasswordService)
      .useValue(replacement)
      .compile();
    expect(module.get(PagePasswordService)).toBe(replacement);
    await expect(
      module.get(PagePasswordService).verifyUnlockToken(pageId, '1', 'token'),
    ).resolves.toBe(false);
  });

  it.each([PAGE_PASSWORD_REPOSITORY, UNLOCK_PROOF_STORE])(
    'rejects composition when a required dependency is absent: %s',
    async (missingToken) => {
      const { repository, store } = createDependencies();
      await expect(
        Test.createTestingModule({
          providers: [
            pagePasswordServiceProvider,
            ...(missingToken === PAGE_PASSWORD_REPOSITORY
              ? []
              : [{ provide: PAGE_PASSWORD_REPOSITORY, useValue: repository }]),
            ...(missingToken === UNLOCK_PROOF_STORE
              ? []
              : [{ provide: UNLOCK_PROOF_STORE, useValue: store }]),
          ],
        }).compile(),
      ).rejects.toThrow('dependencies');
    },
  );
});

const creatorId = 'fixture-creator';
const ownerUrl = `/api/v1/pages/${pageId}/password`;
const unlockUrl = '/api/v1/public/pages/Letter42/unlock';
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

describe('Owner password and public unlock HTTP boundaries', () => {
  let app: INestApplication<App>;
  let dependencies: ReturnType<typeof createDependencies>;
  const consumeCreator = jest.fn<RateLimitService['consumeCreator']>();
  const consumeVisitorUnlock =
    jest.fn<RateLimitService['consumeVisitorUnlock']>();

  async function compose(
    withService = true,
    withKey = true,
    withRateLimit = true,
    withIdentity = true,
  ) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPagePasswordController, PublicPageUnlockController],
      providers: [
        ...(withIdentity
          ? [
              {
                provide: VISITOR_IDENTITY_SECRET,
                useValue: 'fixture-password-identity-secret',
              },
            ]
          : []),
        ...(withService
          ? [
              pagePasswordServiceProvider,
              {
                provide: PAGE_PASSWORD_REPOSITORY,
                useValue: dependencies.repository,
              },
              { provide: UNLOCK_PROOF_STORE, useValue: dependencies.store },
            ]
          : []),
        ...(withKey
          ? [{ provide: PAGE_PASSWORD_ENCRYPTION_KEY, useValue: encryptionKey }]
          : []),
        ...(withRateLimit
          ? [
              {
                provide: RateLimitService,
                useValue: { consumeCreator, consumeVisitorUnlock },
              },
            ]
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
    dependencies = createDependencies();
    consumeCreator.mockReset().mockResolvedValue(undefined);
    consumeVisitorUnlock.mockReset().mockResolvedValue(undefined);
    app = await compose();
  });

  afterEach(async () => {
    await app.close();
  });

  async function preparePublishedPassword() {
    await app
      .get(PagePasswordService)
      .setPassword({ creatorId, pageId, password: 'secret' });
    const encrypted =
      dependencies.repository.setOwnedPassword.mock.calls[0]?.[0].password;
    if (!encrypted) throw new Error('Expected fixture encrypted password');
    dependencies.repository.findPublishedPassword.mockResolvedValue({
      pageId,
      password: encrypted,
    });
    dependencies.repository.setOwnedPassword.mockClear();
    dependencies.store.revoke.mockClear();
    return { pageId, password: encrypted };
  }

  it.each(['secret', null])(
    'sets or clears through authenticated ownership: %s',
    async (password) => {
      const response = await request(app.getHttpServer())
        .patch(ownerUrl)
        .send({ password, creatorId: 'untrusted' })
        .expect(200);
      expect(response.body).toEqual({ passwordProtected: password !== null });
      expect(consumeCreator.mock.calls).toEqual([[creatorId]]);
      const input = dependencies.repository.setOwnedPassword.mock.calls[0]?.[0];
      expect(input).toMatchObject({ creatorId, pageId });
      if (password === null) expect(input?.password).toBeNull();
      else expect(input?.password).toMatchObject({ keyVersion: '1' });
      expect(firstMockCallOrder(consumeCreator)).toBeLessThan(
        firstMockCallOrder(dependencies.repository.setOwnedPassword),
      );
      expect(dependencies.store.revoke.mock.calls).toEqual([
        [pageId, 24 * 60 * 60],
      ]);
      expect(response.headers['set-cookie']).toBeUndefined();
    },
  );

  it('requires authentication before a password mutation', async () => {
    authenticated = false;
    await request(app.getHttpServer())
      .patch(ownerUrl)
      .send({ password: 'secret' })
      .expect(401);
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(dependencies.repository.setOwnedPassword).not.toHaveBeenCalled();
  });

  it.each([
    { path: '/api/v1/pages/invalid/password', body: { password: 'secret' } },
    { path: ownerUrl, body: { password: '' } },
    { path: ownerUrl, body: {} },
  ])('validates before side effects: $path $body', async ({ path, body }) => {
    await request(app.getHttpServer()).patch(path).send(body).expect(422);
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(dependencies.repository.setOwnedPassword).not.toHaveBeenCalled();
  });

  it('retains the safe missing owner error without revoking proofs', async () => {
    dependencies.repository.setOwnedPassword.mockResolvedValue('not_found');
    const response = await request(app.getHttpServer())
      .patch(ownerUrl)
      .send({ password: null })
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
    expect(dependencies.store.revoke).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: new RateLimitExceededError(17),
      status: 429,
      code: 'RATE_LIMITED',
    },
    {
      error: new RateLimitUnavailableError(),
      status: 503,
      code: 'RATE_LIMIT_UNAVAILABLE',
    },
  ])(
    'retains owner limit mapping $code before persistence',
    async ({ error, status, code }) => {
      consumeCreator.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .patch(ownerUrl)
        .send({ password: null })
        .expect(status);
      expect(response.body).toMatchObject({ code });
      if (status === 429)
        expect(response.body).toMatchObject({
          details: { retryAfterSeconds: 17 },
        });
      expect(dependencies.repository.setOwnedPassword).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'retains safe configuration failure with service present: %s',
    async (withService) => {
      await app.close();
      app = await compose(withService, false);
      const response = await request(app.getHttpServer())
        .patch(ownerUrl)
        .send({ password: 'secret' })
        .expect(503);
      expect(response.body).toMatchObject({ code: 'PASSWORD_CONFIGURATION' });
      expect(dependencies.repository.setOwnedPassword).not.toHaveBeenCalled();
      if (!withService) expect(consumeCreator).not.toHaveBeenCalled();
    },
  );

  it('retains optional rate limit injection', async () => {
    await app.close();
    app = await compose(true, true, false);
    await request(app.getHttpServer())
      .patch(ownerUrl)
      .send({ password: null })
      .expect(200);
    expect(dependencies.repository.setOwnedPassword).toHaveBeenCalledTimes(1);
  });

  it('returns a safe configuration error when proof revocation fails after persistence', async () => {
    dependencies.store.revoke.mockRejectedValue(
      new Error('private proof store failure'),
    );
    const response = await request(app.getHttpServer())
      .patch(ownerUrl)
      .send({ password: null })
      .expect(503);
    expect(response.body).toMatchObject({ code: 'PASSWORD_CONFIGURATION' });
    expect(dependencies.repository.setOwnedPassword).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(response.body)).not.toContain(
      'private proof store failure',
    );
  });

  it('keeps unexpected owner repository failures private', async () => {
    dependencies.repository.setOwnedPassword.mockRejectedValue(
      new Error('private persistence failure'),
    );
    const response = await request(app.getHttpServer())
      .patch(ownerUrl)
      .send({ password: null })
      .expect(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(JSON.stringify(response.body)).not.toContain(
      'private persistence failure',
    );
  });

  it('unlocks anonymously through the shared mapper and sets only a page scoped HttpOnly cookie', async () => {
    await preparePublishedPassword();
    authenticated = false;
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(200);
    expect(response.body).toEqual({ unlocked: true });
    expect(dependencies.repository.findPublishedPassword.mock.calls).toEqual([
      ['letter42'],
      ['letter42'],
    ]);
    expect(consumeCreator).not.toHaveBeenCalled();
    expect(consumeVisitorUnlock.mock.calls[0]?.[0]).toBe(pageId);
    expect(dependencies.store.set).toHaveBeenCalledTimes(1);
    const cookies = z.array(z.string()).parse(response.headers['set-cookie']);
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain(`letterly_unlock_${pageId}=`);
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('Max-Age=86400');
  });

  it('retains invalid password mapping without issuing a cookie or proof', async () => {
    await preparePublishedPassword();
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'wrong' })
      .expect(401);
    expect(response.body).toMatchObject({
      code: 'INVALID_PASSWORD',
      message: 'The password is incorrect',
    });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(dependencies.store.set).not.toHaveBeenCalled();
  });

  it('retains public page not found mapping before unlock limits', async () => {
    dependencies.repository.findPublishedPassword.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(404);
    expect(response.body).toMatchObject({ code: 'PAGE_NOT_FOUND' });
    expect(consumeVisitorUnlock).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it.each([
    {
      error: new RateLimitExceededError(37),
      status: 429,
      code: 'RATE_LIMITED',
    },
    {
      error: new RateLimitUnavailableError(),
      status: 503,
      code: 'RATE_LIMIT_UNAVAILABLE',
    },
  ])(
    'retains public limit error $code without issuing a proof or cookie',
    async ({ error, status, code }) => {
      await preparePublishedPassword();
      consumeVisitorUnlock.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .post(unlockUrl)
        .send({ password: 'secret' })
        .expect(status);
      expect(response.body).toMatchObject({ code });
      if (status === 429)
        expect(response.body).toMatchObject({
          details: { retryAfterSeconds: 37 },
        });
      expect(
        dependencies.repository.findPublishedPassword,
      ).toHaveBeenCalledTimes(1);
      expect(dependencies.store.set).not.toHaveBeenCalled();
      expect(response.headers['set-cookie']).toBeUndefined();
    },
  );

  it('retains public optional service configuration errors', async () => {
    await app.close();
    app = await compose(false);
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(503);
    expect(response.body).toMatchObject({ code: 'PASSWORD_CONFIGURATION' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('uses signed visitor identity for the trusted page unlock limit before password verification', async () => {
    await preparePublishedPassword();
    const payload = createVisitorIdentityPayload(
      '203.0.113.24',
      Math.floor(Date.now() / 1000),
    );
    const signature = createHmac('sha256', 'fixture-password-identity-secret')
      .update(payload)
      .digest('base64url');
    await request(app.getHttpServer())
      .post(unlockUrl)
      .set(visitorIdentityHeader, `${payload}.${signature}`)
      .send({ password: 'secret', pageId: 'untrusted' })
      .expect(200);
    expect(consumeVisitorUnlock).toHaveBeenCalledWith(pageId, '203.0.113.24');
    expect(
      firstMockCallOrder(dependencies.repository.findPublishedPassword),
    ).toBeLessThan(firstMockCallOrder(consumeVisitorUnlock));
    expect(firstMockCallOrder(consumeVisitorUnlock)).toBeLessThan(
      requiredTestValue(
        dependencies.repository.findPublishedPassword.mock
          .invocationCallOrder[1],
        'Expected the second password lookup after rate limiting',
      ),
    );
    expect(firstMockCallOrder(consumeVisitorUnlock)).toBeLessThan(
      firstMockCallOrder(dependencies.store.set),
    );
  });

  it('falls back to transport IP for invalid signed identity', async () => {
    await preparePublishedPassword();
    await request(app.getHttpServer())
      .post(unlockUrl)
      .set(visitorIdentityHeader, 'invalid-signature')
      .send({ password: 'secret' })
      .expect(200);
    expect(consumeVisitorUnlock).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^(::ffff:)?127\.0\.0\.1$/),
    );
  });

  it('keeps the identity secret optional for public unlock', async () => {
    await app.close();
    app = await compose(true, true, true, false);
    await preparePublishedPassword();
    await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(200);
    expect(consumeVisitorUnlock).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^(::ffff:)?127\.0\.0\.1$/),
    );
  });

  it('keeps the unlock limiter optional without adding a browser cookie requirement', async () => {
    await app.close();
    app = await compose(true, true, false);
    await preparePublishedPassword();
    await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(200);
    expect(consumeVisitorUnlock).not.toHaveBeenCalled();
    expect(dependencies.store.set).toHaveBeenCalledTimes(1);
  });

  it.each(['development', 'production'])(
    'retains unlock cookie attributes in %s',
    async (environment) => {
      await preparePublishedPassword();
      const previousEnvironment = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = environment;
        const response = await request(app.getHttpServer())
          .post(unlockUrl)
          .send({ password: 'secret' })
          .expect(200);
        const cookies = z
          .array(z.string())
          .parse(response.headers['set-cookie']);
        expect(cookies).toHaveLength(1);
        expect(cookies[0]).toContain(`letterly_unlock_${pageId}=`);
        expect(cookies[0]).toContain('HttpOnly');
        expect(cookies[0]).toContain('SameSite=Lax');
        expect(cookies[0]).toContain('Path=/');
        expect(cookies[0]).toContain('Max-Age=86400');
        expect(cookies[0]?.includes('; Secure')).toBe(
          environment === 'production',
        );
        expect(response.body).toEqual({ unlocked: true });
      } finally {
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
      }
    },
  );

  it.each([
    {},
    { password: '' },
    { password: 123 },
    { password: 'a'.repeat(257) },
  ])(
    'rejects invalid unlock input %j before lookup or proof issuance',
    async (body) => {
      const response = await request(app.getHttpServer())
        .post(unlockUrl)
        .send(body)
        .expect(422);
      expect(response.body).toMatchObject({ code: 'VALIDATION_FAILED' });
      expect(
        dependencies.repository.findPublishedPassword,
      ).not.toHaveBeenCalled();
      expect(consumeVisitorUnlock).not.toHaveBeenCalled();
      expect(dependencies.store.set).not.toHaveBeenCalled();
      expect(response.headers['set-cookie']).toBeUndefined();
    },
  );

  it('rejects an overlong slug before protection lookup', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/public/pages/${'a'.repeat(201)}/unlock`)
      .send({ password: 'secret' })
      .expect(422);
    expect(
      dependencies.repository.findPublishedPassword,
    ).not.toHaveBeenCalled();
    expect(consumeVisitorUnlock).not.toHaveBeenCalled();
    expect(dependencies.store.set).not.toHaveBeenCalled();
  });

  it('rejects a page disappearing between protection lookup and unlock without issuing a cookie', async () => {
    const publishedPassword = await preparePublishedPassword();
    dependencies.repository.findPublishedPassword
      .mockResolvedValueOnce(publishedPassword)
      .mockResolvedValueOnce(null);
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(404);
    expect(response.body).toMatchObject({ code: 'PAGE_NOT_FOUND' });
    expect(consumeVisitorUnlock).toHaveBeenCalledTimes(1);
    expect(dependencies.store.set).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('keeps unexpected public repository errors private and issues no proof', async () => {
    dependencies.repository.findPublishedPassword.mockRejectedValue(
      new Error('private password record'),
    );
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(500);
    expect(response.body).toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
    expect(response.text).not.toContain('private password record');
    expect(consumeVisitorUnlock).not.toHaveBeenCalled();
    expect(dependencies.store.set).not.toHaveBeenCalled();
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('maps proof store failure to safe configuration error without issuing a cookie', async () => {
    await preparePublishedPassword();
    dependencies.store.set.mockRejectedValue(
      new Error('private proof provider'),
    );
    const response = await request(app.getHttpServer())
      .post(unlockUrl)
      .send({ password: 'secret' })
      .expect(503);
    expect(response.body).toMatchObject({ code: 'PASSWORD_CONFIGURATION' });
    expect(response.text).not.toContain('private proof provider');
    expect(response.headers['set-cookie']).toBeUndefined();
  });
});
