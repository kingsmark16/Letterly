import type { BetterAuthOptions } from 'better-auth';
import { Logger } from '@nestjs/common';

jest.mock('@letterly/config', () => ({
  loadConfig: jest.fn(() => ({
    NODE_ENV: 'test',
    APP_ORIGIN: 'http://localhost:3000',
    BETTER_AUTH_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    GOOGLE_CLIENT_ID: 'google-client-id',
    GOOGLE_CLIENT_SECRET: 'google-client-secret',
    FACEBOOK_CLIENT_ID: 'facebook-client-id',
    FACEBOOK_CLIENT_SECRET: 'facebook-client-secret',
    REDIS_URL: undefined,
    TRUSTED_PROXY_IPS: ['127.0.0.1'],
  })),
}));

jest.mock('@letterly/database', () => ({
  getPrismaClient: jest.fn(() => ({})),
}));

jest.mock('better-auth', () => ({
  APIError: {
    from: jest.fn((_status: string, body: { message: string }) => {
      return new Error(body.message);
    }),
  },
  betterAuth: jest.fn((options: unknown) => options),
}));

jest.mock('better-auth/api', () => ({
  createAuthMiddleware: jest.fn(
    (handler: (context: unknown) => unknown) => handler,
  ),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(() => ({})),
}));

jest.mock('../../../infrastructure/http/rate-limit.service', () => ({
  createBetterAuthRateLimitStorage: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    consume: jest.fn(),
  })),
}));

import { loadConfig } from '@letterly/config';
import {
  AUTH_PUBLIC_MESSAGES,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_RATE_LIMITS,
  type AuthMailPort,
} from '@letterly/contracts';
import type { PrismaClient } from '@letterly/database';
import {
  AUTH_EMAIL_VERIFICATION_EXPIRY_SECONDS,
  AUTH_PASSWORD_RESET_EXPIRY_SECONDS,
  createBetterAuthOptions,
} from './better-auth';

type BeforeMiddleware = NonNullable<
  NonNullable<BetterAuthOptions['hooks']>['before']
>;

type MockDatabase = {
  user: { findUnique: jest.Mock };
  account: { findFirst: jest.Mock };
  verification: { findFirst: jest.Mock };
};

function createDatabase(
  overrides: Partial<MockDatabase> = {},
): MockDatabase & PrismaClient {
  return {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      ...overrides.user,
    },
    account: {
      findFirst: jest.fn().mockResolvedValue(null),
      ...overrides.account,
    },
    verification: {
      findFirst: jest.fn().mockResolvedValue(null),
      ...overrides.verification,
    },
  } as unknown as MockDatabase & PrismaClient;
}

function createMail(): { mail: AuthMailPort; send: jest.Mock } {
  const send = jest.fn().mockResolvedValue({
    ok: true,
    messageId: 'mail-123',
  });

  return { mail: { send }, send };
}

function createAuthUser(id: string, email: string) {
  return {
    id,
    email,
    name: 'Letterly Creator',
    emailVerified: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function getBefore(options: BetterAuthOptions): BeforeMiddleware {
  const before = options.hooks?.before;
  if (!before) {
    throw new Error('Expected a Better Auth validation hook');
  }

  return before;
}

describe('Better Auth configuration', () => {
  it('enables credential auth with an explicit password policy and safe sign-up mode', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
      autoSignIn: false,
    });
  });

  it('keeps both existing social provider configurations available', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.socialProviders).toEqual({
      google: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
      },
      facebook: {
        clientId: 'facebook-client-id',
        clientSecret: 'facebook-client-secret',
      },
    });
  });

  it('applies credential-specific atomic rate-limit rules and secure proxy settings', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.rateLimit).toMatchObject({
      enabled: true,
      window: 10,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/sign-out': { window: 60, max: 10 },
      },
    });
    expect(options.rateLimit?.customStorage).toBeDefined();
    expect(options.advanced).toMatchObject({
      ipAddress: {
        ipAddressHeaders: ['x-letterly-client-ip'],
        ipv6Subnet: 64,
        trustedProxies: ['127.0.0.1'],
      },
      useSecureCookies: false,
    });
  });

  it('defers authentication email work and normalizes unverified sign-in status', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const backgroundHandler = options.advanced?.backgroundTasks?.handler;
    const responsePlugin = options.plugins?.[0];

    expect(backgroundHandler).toEqual(expect.any(Function));
    expect(responsePlugin?.onResponse).toEqual(expect.any(Function));

    if (!responsePlugin?.onResponse) {
      throw new Error('Expected safe auth response plugin');
    }

    const normalized = await responsePlugin.onResponse(
      new Response(
        JSON.stringify({
          code: 'AUTHENTICATION_FAILED',
          message: AUTH_PUBLIC_MESSAGES.signInFailure,
        }),
        { status: 403 },
      ),
      {} as Parameters<NonNullable<typeof responsePlugin.onResponse>>[1],
    );

    expect(normalized?.response.status).toBe(401);

    const unrelated = await responsePlugin.onResponse(
      new Response(JSON.stringify({ code: 'CSRF_ERROR' }), { status: 403 }),
      {} as Parameters<NonNullable<typeof responsePlugin.onResponse>>[1],
    );

    expect(unrelated).toBeUndefined();
  });

  it('does not wait for verification delivery in the resend callback', async () => {
    let resolveSend:
      ((value: Awaited<ReturnType<AuthMailPort['send']>>) => void) | undefined;
    const pendingSend = new Promise<Awaited<ReturnType<AuthMailPort['send']>>>(
      (resolve) => {
        resolveSend = resolve;
      },
    );
    const send = jest
      .fn<ReturnType<AuthMailPort['send']>, Parameters<AuthMailPort['send']>>()
      .mockReturnValue(pendingSend);
    const options = createBetterAuthOptions(loadConfig(), {
      database: createDatabase(),
      mail: { send },
    });
    const callback = options.emailVerification?.sendVerificationEmail;

    if (!callback) {
      throw new Error('Expected verification email callback');
    }

    const callbackResult = callback(
      {
        user: createAuthUser('user-123', 'creator@example.com'),
        url: 'https://letterly.example/verify-email?token=secret-token',
        token: 'secret-token',
      },
      new Request('https://letterly.example/api/auth/send-verification-email'),
    );
    const callbackCompleted = await Promise.race([
      Promise.resolve(callbackResult).then(() => true),
      new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 50);
      }),
    ]);

    resolveSend?.({ ok: true, messageId: 'mail-123' });
    await pendingSend;

    expect(callbackCompleted).toBe(true);
  });

  it('normalizes valid credential input before Better Auth persists or looks it up', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const before = options.hooks?.before;

    if (!before) {
      throw new Error('Expected a Better Auth validation hook');
    }

    const context = {
      path: '/sign-up/email',
      body: {
        name: '  Letterly Creator  ',
        email: '  CREATOR@Example.COM ',
        password: 'a secure passphrase',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(context);

    expect(context.body).toMatchObject({
      name: 'Letterly Creator',
      email: 'creator@example.com',
    });
    expect(context.body).toEqual({
      name: 'Letterly Creator',
      email: 'creator@example.com',
      password: 'a secure passphrase',
      callbackURL: 'http://localhost:3000/verify-email',
    });
  });

  it('keeps Better Auth diagnostic logging to an allowlisted event shape', () => {
    const options = createBetterAuthOptions(loadConfig());
    const log = options.logger?.log;

    if (!log) {
      throw new Error('Expected a Better Auth logger');
    }

    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    log(
      'error',
      'duplicate email creator@example.com provider response secret-token',
      {
        email: 'creator@example.com',
        token: 'secret-token',
      },
    );

    expect(loggerError).toHaveBeenCalledWith({
      operation: 'better_auth',
      outcome: 'failed',
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain(
      'creator@example.com',
    );
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain(
      'secret-token',
    );
    loggerError.mockRestore();
  });

  it('returns a generic validation error without echoing a password', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const before = options.hooks?.before;

    if (!before) {
      throw new Error('Expected a Better Auth validation hook');
    }

    const context = {
      path: '/sign-up/email',
      body: {
        name: 'Letterly Creator',
        email: 'not-an-email',
        password: 'a secure passphrase',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await expect(Promise.resolve().then(() => before(context))).rejects.toThrow(
      'Invalid authentication details',
    );
  });

  it('requires verification and keeps verification and reset lifetimes explicit', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: AUTH_EMAIL_VERIFICATION_EXPIRY_SECONDS,
    });
    expect(options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: AUTH_PASSWORD_RESET_EXPIRY_SECONDS,
      revokeSessionsOnPasswordReset: true,
      autoSignIn: false,
    });
  });

  it('configures every credential route with its approved per-IP policy', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.rateLimit?.customRules).toEqual({
      '/sign-in/email': {
        window: AUTH_RATE_LIMITS.signIn.windowSeconds,
        max: AUTH_RATE_LIMITS.signIn.max,
      },
      '/sign-up/email': {
        window: AUTH_RATE_LIMITS.signUp.windowSeconds,
        max: AUTH_RATE_LIMITS.signUp.max,
      },
      '/sign-out': {
        window: AUTH_RATE_LIMITS.signOut.windowSeconds,
        max: AUTH_RATE_LIMITS.signOut.max,
      },
      '/send-verification-email': {
        window: AUTH_RATE_LIMITS.verificationResend.windowSeconds,
        max: AUTH_RATE_LIMITS.verificationResend.max,
      },
      '/verify-email': {
        window: AUTH_RATE_LIMITS.verificationLinkRequest.windowSeconds,
        max: AUTH_RATE_LIMITS.verificationLinkRequest.max,
      },
      '/request-password-reset': {
        window: AUTH_RATE_LIMITS.passwordResetRequest.windowSeconds,
        max: AUTH_RATE_LIMITS.passwordResetRequest.max,
      },
      '/reset-password': {
        window: AUTH_RATE_LIMITS.passwordResetSubmission.windowSeconds,
        max: AUTH_RATE_LIMITS.passwordResetSubmission.max,
      },
    });
  });

  it('replaces attacker supplied callback values with the fixed verification route', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const before = getBefore(options);
    const context = {
      path: '/sign-up/email',
      body: {
        name: 'Letterly Creator',
        email: 'creator@example.com',
        password: 'secure',
        callbackURL: 'https://evil.example/steal',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(context);

    expect(
      (context.body as unknown as Record<string, unknown>).callbackURL,
    ).toBe('http://localhost:3000/verify-email');
  });

  it('removes sign-in redirect overrides and fixes verification resend callbacks', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const before = getBefore(options);
    const signInContext = {
      path: '/sign-in/email',
      body: {
        email: 'creator@example.com',
        password: 'secure',
        callbackURL: 'https://evil.example/steal',
        redirectTo: 'https://evil.example/also-steal',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];
    const resendContext = {
      path: '/send-verification-email',
      body: {
        email: 'creator@example.com',
        callbackURL: 'https://evil.example/steal',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(signInContext);
    await before(resendContext);

    expect(
      signInContext.body as unknown as Record<string, unknown>,
    ).not.toHaveProperty('callbackURL');
    expect(
      signInContext.body as unknown as Record<string, unknown>,
    ).not.toHaveProperty('redirectTo');
    expect(
      (resendContext.body as unknown as Record<string, unknown>).callbackURL,
    ).toBe('http://localhost:3000/verify-email');
  });

  it('fixes verification and reset link destinations even when query callbacks are external', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const before = getBefore(options);
    const verificationContext = {
      path: '/verify-email',
      query: { callbackURL: 'https://evil.example/steal' },
    } as unknown as Parameters<BeforeMiddleware>[0];
    const resetContext = {
      path: '/reset-password/:token',
      query: { callbackURL: 'https://evil.example/steal' },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(verificationContext);
    await before(resetContext);

    expect(
      (verificationContext.query as unknown as Record<string, unknown>)
        .callbackURL,
    ).toBe('http://localhost:3000/verify-email');
    expect(
      (resetContext.query as unknown as Record<string, unknown>).callbackURL,
    ).toBe('http://localhost:3000/reset-password');
  });

  it('keeps a credential reset request generic while suppressing OAuth-only delivery', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'oauth-user' })
      .mockResolvedValueOnce({ accounts: [] });
    const database = createDatabase({ user: { findUnique } });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const before = getBefore(options);
    const context = {
      path: '/request-password-reset',
      body: {
        email: 'oauth@example.com',
        redirectTo: 'https://evil.example/steal',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(context);

    const body = context.body as unknown as Record<string, unknown>;
    expect(body.email).toBe('no-credential-reset@invalid.letterly');
    expect(body.redirectTo).toBe('http://localhost:3000/reset-password');
    expect(body.email).not.toBe('oauth@example.com');
  });

  it('preserves an eligible credential email and fixed reset callback', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'credential-user' })
      .mockResolvedValueOnce({ accounts: [{ id: 'credential-account' }] });
    const database = createDatabase({ user: { findUnique } });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const before = getBefore(options);
    const context = {
      path: '/request-password-reset',
      body: {
        email: 'creator@example.com',
        redirectTo: 'https://evil.example/steal',
      },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(context);

    expect(context.body as unknown as Record<string, unknown>).toMatchObject({
      email: 'creator@example.com',
      redirectTo: 'http://localhost:3000/reset-password',
    });
  });

  it('rejects reset submission when the token is missing, expired, or not credential eligible', async () => {
    const verificationFindFirst = jest.fn().mockResolvedValue(null);
    const accountFindFirst = jest.fn();
    const database = createDatabase({
      verification: { findFirst: verificationFindFirst },
      account: { findFirst: accountFindFirst },
    });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const before = getBefore(options);
    const context = {
      path: '/reset-password',
      body: { newPassword: 'secure', token: 'expired-token' },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await expect(before(context)).rejects.toThrow(
      AUTH_PUBLIC_MESSAGES.invalidResetToken,
    );
    expect(accountFindFirst).not.toHaveBeenCalled();
  });

  it('accepts a live reset token only when it points to a credential account', async () => {
    const database = createDatabase({
      verification: {
        findFirst: jest.fn().mockResolvedValue({ value: 'credential-user' }),
      },
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'credential-account' }),
      },
    });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const before = getBefore(options);
    const context = {
      path: '/reset-password',
      body: { newPassword: 'secure', token: 'live-token' },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await before(context);

    expect(context.body as unknown as Record<string, unknown>).toMatchObject({
      newPassword: 'secure',
      token: 'live-token',
    });
  });

  it('fails closed with a generic error when reset persistence is unavailable', async () => {
    const database = createDatabase({
      verification: {
        findFirst: jest.fn().mockRejectedValue(new Error('database secret')),
      },
    });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const before = getBefore(options);
    const context = {
      path: '/reset-password',
      body: { newPassword: 'secure', token: 'live-token' },
    } as unknown as Parameters<BeforeMiddleware>[0];

    await expect(before(context)).rejects.toThrow(
      AUTH_PUBLIC_MESSAGES.genericFailure,
    );
  });

  it('blocks a reset-time credential account creation for an OAuth-only user', async () => {
    const database = createDatabase({
      account: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const guard = options.databaseHooks?.account?.create?.before;

    if (!guard) {
      throw new Error('Expected a reset credential guard');
    }

    await expect(
      guard(
        { providerId: 'credential', userId: 'oauth-user' } as Parameters<
          typeof guard
        >[0],
        { path: '/reset-password' } as Parameters<typeof guard>[1],
      ),
    ).resolves.toBe(false);
  });

  it('allows an existing credential account to pass the reset-time guard', async () => {
    const database = createDatabase({
      account: {
        findFirst: jest.fn().mockResolvedValue({ id: 'credential-account' }),
      },
    });
    const options = createBetterAuthOptions(loadConfig(), { database });
    const guard = options.databaseHooks?.account?.create?.before;

    if (!guard) {
      throw new Error('Expected a reset credential guard');
    }

    await expect(
      guard(
        { providerId: 'credential', userId: 'credential-user' } as Parameters<
          typeof guard
        >[0],
        { path: '/reset-password' } as Parameters<typeof guard>[1],
      ),
    ).resolves.toBe(true);
  });

  it('sends verification mail metadata without exposing the token to the mail logger', async () => {
    const { mail, send } = createMail();
    const options = createBetterAuthOptions(loadConfig(), {
      database: createDatabase(),
      mail,
    });
    const callback = options.emailVerification?.sendVerificationEmail;

    if (!callback) {
      throw new Error('Expected verification email callback');
    }

    await callback(
      {
        user: createAuthUser('user-123', 'creator@example.com'),
        url: 'https://letterly.example/verify-email?token=secret-token',
        token: 'secret-token',
      },
      new Request('https://letterly.example/api/auth/sign-up/email', {
        headers: { 'x-request-id': 'request-123' },
      }),
    );

    expect(send).toHaveBeenCalledWith({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
      requestId: 'request-123',
      route: '/api/auth/sign-up/email',
    });
  });

  it('does not send reset mail to an OAuth-only user but sends it to a credential user', async () => {
    const findUnique = jest.fn().mockResolvedValue({ accounts: [] });
    const { mail, send } = createMail();
    const options = createBetterAuthOptions(loadConfig(), {
      database: createDatabase({ user: { findUnique } }),
      mail,
    });
    const callback = options.emailAndPassword?.sendResetPassword;

    if (!callback) {
      throw new Error('Expected reset email callback');
    }

    await callback({
      user: createAuthUser('oauth-user', 'oauth@example.com'),
      url: 'https://letterly.example/reset-password?token=reset-token',
      token: 'reset-token',
    });
    expect(send).not.toHaveBeenCalled();

    findUnique.mockResolvedValue({ accounts: [{ id: 'credential-account' }] });
    await callback({
      user: createAuthUser('credential-user', 'creator@example.com'),
      url: 'https://letterly.example/reset-password?token=reset-token',
      token: 'reset-token',
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'password-reset',
        userId: 'credential-user',
        recipient: 'creator@example.com',
      }),
    );
  });

  it('maps auth failures to safe public messages while preserving redirects', async () => {
    const options = createBetterAuthOptions(loadConfig());
    const after = options.hooks?.after;

    if (!after) {
      throw new Error('Expected a Better Auth error hook');
    }

    const safeError = await after({
      path: '/sign-in/email',
      context: {
        returned: {
          statusCode: 401,
          body: { message: 'database secret and account state' },
        },
      },
    } as Parameters<typeof after>[0]);

    expect(safeError).toEqual(
      expect.objectContaining({ message: AUTH_PUBLIC_MESSAGES.signInFailure }),
    );
    expect(JSON.stringify(safeError)).not.toContain('database secret');

    const redirect = await after({
      path: '/sign-in/email',
      context: { returned: { statusCode: 302 } },
    } as Parameters<typeof after>[0]);

    expect(redirect).toBeUndefined();
  });
});
