import { jest } from '@jest/globals';
import { loadConfig, resolveHostedProcessingIdentity } from '@letterly/config';
import type { Prisma } from '@letterly/database';
import { ProcessingUnavailableError } from '../application/media-processing-control';
import { processingIdentity } from './media-processing-identity';

const productionBaseEnv: Record<string, string> = {
  NODE_ENV: 'production',
  APP_ORIGIN: 'https://letterly-staging.vercel.app',
  BETTER_AUTH_URL: 'https://letterly-staging.vercel.app',
  BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
  REDIS_URL: 'rediss://default:secret@redis.example.test:6379',
  R2_ENDPOINT: 'https://r2.example.test',
  R2_BUCKET: 'letterly-staging-media',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  PUBLIC_MEDIA_PROXY_SECRET: '0123456789abcdef0123456789abcdef',
  PAGE_PASSWORD_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  ADMIN_BOOTSTRAP_SECRET: '0123456789abcdef0123456789abcdef',
  ADMIN_CURSOR_SIGNING_SECRET: '0123456789abcdef0123456789abcdef',
  PUBLIC_SUPPORT_CONTACT_URL: 'https://support.example.test',
};

function createTx(now = new Date('2026-11-21T04:43:25.431Z')) {
  return {
    $queryRaw: jest
      .fn<() => Promise<Array<{ now: Date }>>>()
      .mockResolvedValue([{ now }]),
  } as unknown as Prisma.TransactionClient;
}

describe('hosted processing identity resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CONTAINER_APP_NAME;
    delete process.env.CONTAINER_APP_REVISION;
    delete process.env.CONTAINER_APP_REPLICA_NAME;
    delete process.env.ADC_INSTANCE_ID;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolves standard Azure Container Apps 3-tuple metadata', async () => {
    process.env = {
      ...productionBaseEnv,
      ADMIN_DELETION_ENABLED: 'true',
      CONTAINER_APP_NAME: 'letterly-api-production',
      CONTAINER_APP_REVISION: 'letterly-api-production--rev1',
      CONTAINER_APP_REPLICA_NAME: 'letterly-api-production--rev1-abc123',
    };

    expect(loadConfig().ADMIN_DELETION_ENABLED).toBe(true);
    await expect(processingIdentity(createTx())).resolves.toMatchObject({
      platform: 'AZURE_CONTAINER_APPS',
      appName: 'letterly-api-production',
      revisionName: 'letterly-api-production--rev1',
      replicaName: 'letterly-api-production--rev1-abc123',
      hostname: null,
      processId: null,
    });
  });

  it('resolves Azure Container Apps Express identity from CONTAINER_APP_NAME and ADC_INSTANCE_ID', async () => {
    process.env = {
      ...productionBaseEnv,
      ADMIN_DELETION_ENABLED: 'true',
      CONTAINER_APP_NAME: 'letterly-api-staging',
      ADC_INSTANCE_ID: '9f473c1d-9922-4bc2-bccb-30c809bb9a3c',
    };

    expect(loadConfig().ADMIN_DELETION_ENABLED).toBe(true);
    await expect(processingIdentity(createTx())).resolves.toMatchObject({
      platform: 'AZURE_CONTAINER_APPS',
      appName: 'letterly-api-staging',
      revisionName: 'letterly-api-staging--latest',
      replicaName:
        'letterly-api-staging--latest-9f473c1d-9922-4bc2-bccb-30c809bb9a3c',
      hostname: null,
      processId: null,
    });
  });

  it('uses explicit CONTAINER_APP_REVISION with ADC_INSTANCE_ID when present', () => {
    expect(
      resolveHostedProcessingIdentity({
        CONTAINER_APP_NAME: 'letterly-api-staging',
        CONTAINER_APP_REVISION: 'letterly-api-staging--v2',
        ADC_INSTANCE_ID: '9f473c1d-9922-4bc2-bccb-30c809bb9a3c',
      }),
    ).toEqual({
      status: 'azure',
      appName: 'letterly-api-staging',
      revisionName: 'letterly-api-staging--v2',
      replicaName:
        'letterly-api-staging--v2-9f473c1d-9922-4bc2-bccb-30c809bb9a3c',
    });
  });

  it.each([
    { CONTAINER_APP_NAME: 'letterly-api-staging' },
    { ADC_INSTANCE_ID: '9f473c1d-9922-4bc2-bccb-30c809bb9a3c' },
    {
      CONTAINER_APP_NAME: 'letterly-api-staging',
      CONTAINER_APP_REVISION: 'letterly-api-staging--latest',
    },
    {
      CONTAINER_APP_NAME: 'a'.repeat(180),
      ADC_INSTANCE_ID: 'b'.repeat(40),
    },
  ])(
    'fails closed for partial or oversized hosted identity: %j',
    async (partial) => {
      process.env = {
        ...productionBaseEnv,
        ADMIN_DELETION_ENABLED: 'true',
        ...partial,
      };

      expect(() => loadConfig()).toThrow(
        'Deletion activation requires complete hosted processing identity',
      );
      process.env.ADMIN_DELETION_ENABLED = 'false';
      await expect(processingIdentity(createTx())).rejects.toBeInstanceOf(
        ProcessingUnavailableError,
      );
    },
  );

  it('fails closed in production when hosted identity is completely absent', async () => {
    process.env = {
      ...productionBaseEnv,
      ADMIN_DELETION_ENABLED: 'true',
    };

    expect(() => loadConfig()).toThrow(
      'Deletion activation requires complete hosted processing identity',
    );
    process.env.ADMIN_DELETION_ENABLED = 'false';
    await expect(processingIdentity(createTx())).rejects.toBeInstanceOf(
      ProcessingUnavailableError,
    );
  });

  it('returns LOCAL identity outside production when Azure metadata is absent', async () => {
    process.env = {
      NODE_ENV: 'test',
      APP_ORIGIN: 'http://localhost:3000',
      BETTER_AUTH_URL: 'http://localhost:3001',
      BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
    };

    await expect(processingIdentity(createTx())).resolves.toMatchObject({
      platform: 'LOCAL',
      appName: null,
      revisionName: null,
      replicaName: null,
      processId: process.pid,
    });
  });
});
