import { createDecipheriv, createHash } from 'node:crypto';
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
import { PageService } from '../src/modules/pages/application/page.service';
import { PublicPagesController } from '../src/modules/pages/pages.controller';
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
  ) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPagePasswordController, PublicPagesController],
      providers: [
        { provide: PageService, useValue: {} },
        {
          provide: VISITOR_IDENTITY_SECRET,
          useValue: 'fixture-password-identity-secret',
        },
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
      expect(consumeCreator.mock.invocationCallOrder[0]).toBeLessThan(
        dependencies.repository.setOwnedPassword.mock.invocationCallOrder[0],
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
});
