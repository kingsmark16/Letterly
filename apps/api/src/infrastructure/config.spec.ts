import { loadConfig } from '@letterly/config';

const productionEnvironment = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://letterly.example',
  PORT: '3001',
  BETTER_AUTH_URL: 'https://letterly.example',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'Letterly <hello@letterly.example>',
  REDIS_URL: 'rediss://:redis-test-password@redis.letterly.example:6380',
} as const;

const productionMediaEnvironment = {
  ...productionEnvironment,
  R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
  R2_BUCKET: 'letterly-production',
  R2_ACCESS_KEY_ID: 'access-key-id',
  R2_SECRET_ACCESS_KEY: 'secret-access-key',
  PUBLIC_MEDIA_PROXY_SECRET: 'b'.repeat(32),
  PAGE_PASSWORD_ENCRYPTION_KEY: 'c'.repeat(32),
  ADMIN_BOOTSTRAP_SECRET: 'd'.repeat(32),
  ADMIN_CURSOR_SIGNING_SECRET: 'e'.repeat(32),
  PUBLIC_SUPPORT_CONTACT_URL: 'https://letterly.example/support',
} as const;

describe('application configuration', () => {
  it('requires R2 and visitor signing secrets in production', () => {
    expect(() => loadConfig(productionEnvironment)).toThrow('R2_ENDPOINT');
    expect(() =>
      loadConfig({
        ...productionEnvironment,
        R2_ENDPOINT: productionMediaEnvironment.R2_ENDPOINT,
        R2_BUCKET: productionMediaEnvironment.R2_BUCKET,
        R2_ACCESS_KEY_ID: productionMediaEnvironment.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: productionMediaEnvironment.R2_SECRET_ACCESS_KEY,
      }),
    ).toThrow('PUBLIC_MEDIA_PROXY_SECRET');
    expect(() => loadConfig(productionMediaEnvironment)).not.toThrow();
  });

  it('treats an empty optional visitor signing secret as unset outside production', () => {
    expect(() =>
      loadConfig({
        ...productionEnvironment,
        NODE_ENV: 'development',
        PUBLIC_MEDIA_PROXY_SECRET: '',
      }),
    ).not.toThrow();
  });

  it('requires page password encryption material in production', () => {
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        PAGE_PASSWORD_ENCRYPTION_KEY: undefined,
      }),
    ).toThrow('PAGE_PASSWORD_ENCRYPTION_KEY');
  });

  it('requires a Resend key and verified sender in production', () => {
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        RESEND_API_KEY: undefined,
      }),
    ).toThrow('RESEND_API_KEY');
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        RESEND_FROM_EMAIL: undefined,
      }),
    ).toThrow('RESEND_FROM_EMAIL');
  });

  it('requires an https app origin in production', () => {
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        APP_ORIGIN: 'http://letterly.example',
      }),
    ).toThrow(
      'APP_ORIGIN must be a credential-free https origin in production',
    );
  });

  it('rejects credentials embedded in the production app origin', () => {
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        APP_ORIGIN: 'https://user:secret@letterly.example',
      }),
    ).toThrow(
      'APP_ORIGIN must be a credential-free https origin in production',
    );
  });

  it('defaults the monitoring environment to the application environment', () => {
    expect(
      loadConfig({
        ...productionEnvironment,
        NODE_ENV: 'test',
      }).SENTRY_ENVIRONMENT,
    ).toBe('test');
  });

  it('parses and validates the configured trusted proxy addresses', () => {
    expect(
      loadConfig({
        ...productionMediaEnvironment,
        TRUSTED_PROXY_IPS: '203.0.113.10, 10.0.0.0/24',
      }).TRUSTED_PROXY_IPS,
    ).toEqual(['203.0.113.10', '10.0.0.0/24']);
    expect(() =>
      loadConfig({
        ...productionMediaEnvironment,
        TRUSTED_PROXY_IPS: 'not-an-ip',
      }),
    ).toThrow('TRUSTED_PROXY_IPS');
  });
});
