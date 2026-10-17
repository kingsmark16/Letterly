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
    OAUTH_PROXY_PRODUCTION_URL: undefined,
    OAUTH_PROXY_SECRET: undefined,
    REDIS_URL: undefined,
    TRUSTED_PROXY_IPS: ['127.0.0.1'],
  })),
}));

jest.mock('@letterly/database', () => ({
  getPrismaClient: jest.fn(() => ({})),
}));

jest.mock('better-auth', () => ({
  betterAuth: jest.fn((options: unknown) => options),
}));

jest.mock('better-auth/adapters/prisma', () => ({
  prismaAdapter: jest.fn(() => ({})),
}));

jest.mock('better-auth/plugins', () => ({
  oAuthProxy: jest.fn(() => ({ id: 'oauth-proxy' })),
}));

jest.mock('../../../infrastructure/http/rate-limit.service', () => ({
  createBetterAuthRateLimitStorage: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    consume: jest.fn(),
  })),
}));

import { loadConfig } from '@letterly/config';
import { createBetterAuthOptions } from './better-auth';

describe('Better Auth configuration', () => {
  it('trusts local development aliases when the web origin uses a LAN address', () => {
    const options = createBetterAuthOptions({
      ...loadConfig(),
      NODE_ENV: 'development',
      APP_ORIGIN: 'http://192.168.1.141:3000',
      BETTER_AUTH_URL: 'https://oauth.example.com',
    });

    expect(options.trustedOrigins).toEqual([
      'http://192.168.1.141:3000',
      'https://oauth.example.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('keeps local development aliases out of production trusted origins', () => {
    const options = createBetterAuthOptions({
      ...loadConfig(),
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://letterly.example.com',
      BETTER_AUTH_URL: 'https://letterly.example.com',
    });

    expect(options.trustedOrigins).toEqual(['https://letterly.example.com']);
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

  it('applies authentication rate limits and secure proxy settings', () => {
    const options = createBetterAuthOptions(loadConfig());

    expect(options.rateLimit).toMatchObject({
      enabled: true,
      window: 10,
      max: 100,
      customRules: {
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

  it('keeps Better Auth diagnostic logging to an allowlisted event shape', () => {
    const options = createBetterAuthOptions(loadConfig());
    const log = options.logger?.log;

    if (!log) {
      throw new Error('Expected a Better Auth logger');
    }

    const loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    log('error', 'provider response contains identity and token details', {
      email: 'creator@example.com',
      token: 'secret-token',
    });

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
});
