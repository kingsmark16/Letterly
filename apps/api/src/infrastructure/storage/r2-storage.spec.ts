import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { R2Storage } from './r2-storage';

const environment = {
  NODE_ENV: 'test',
  BETTER_AUTH_URL: 'http://localhost:3000',
  BETTER_AUTH_SECRET: 'a'.repeat(32),
  R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
  R2_BUCKET: 'letterly-test',
  R2_ACCESS_KEY_ID: 'access-key-id',
  R2_SECRET_ACCESS_KEY: 'secret-access-key',
} as const;

const originalEnvironment = new Map<string, string | undefined>();

describe('R2Storage', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(environment)) {
      originalEnvironment.set(key, process.env[key]);
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(environment)) {
      const value = originalEnvironment.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    originalEnvironment.clear();
  });

  it('AC-2 signs the checksum as a required upload header', async () => {
    const checksum = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const storage = new R2Storage();

    const response = await storage.createUploadUrl({
      contentType: 'image/png',
      expiresInSeconds: 3600,
      key: 'pages/page-id/sources/image-id',
      sha256: checksum,
    });

    const signedUrl = new URL(response.uploadUrl);
    const signedHeaders = signedUrl.searchParams.get('X-Amz-SignedHeaders');

    expect(signedHeaders?.split(';')).toEqual([
      'host',
      'x-amz-checksum-sha256',
    ]);
    expect(signedUrl.hostname).toBe('account-id.r2.cloudflarestorage.com');
    expect(signedUrl.pathname).toBe(
      '/letterly-test/pages/page-id/sources/image-id',
    );
    expect(signedUrl.searchParams.has('x-amz-checksum-sha256')).toBe(false);
    expect(response.requiredHeaders.sha256).toBe(checksum);
  });

  it('retries a transient timeout while reading an uploaded object', async () => {
    const timeout = Object.assign(new Error('read timed out'), {
      code: 'ETIMEDOUT',
      name: 'TimeoutError',
    });
    const send = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce({
        Body: {
          transformToByteArray: () =>
            Promise.resolve(new Uint8Array([1, 2, 3])),
        },
        ContentType: 'image/png',
        ContentLength: 3,
        ChecksumSHA256: 'checksum',
      });
    const storage = new R2Storage();
    Reflect.set(storage, 'client', { send });
    Reflect.set(storage, 'bucket', 'letterly-test');

    await expect(storage.getObject('pages/page-id/source')).resolves.toEqual({
      body: Buffer.from([1, 2, 3]),
      contentType: 'image/png',
      contentLength: 3,
      checksumSha256: 'checksum',
    });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('retries a transient timeout while storing a sanitized image', async () => {
    const timeout = Object.assign(new Error('write timed out'), {
      code: 'ETIMEDOUT',
      name: 'TimeoutError',
    });
    const send = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce({});
    const storage = new R2Storage();
    Reflect.set(storage, 'client', { send });
    Reflect.set(storage, 'bucket', 'letterly-test');

    await expect(
      storage.putObject({
        body: Buffer.from('webp'),
        contentType: 'image/webp',
        key: 'pages/page-id/images/image-id.webp',
      }),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('retries a transient timeout while deleting a source image', async () => {
    const timeout = Object.assign(new Error('delete timed out'), {
      code: 'ETIMEDOUT',
      name: 'TimeoutError',
    });
    const send = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(timeout)
      .mockResolvedValueOnce({});
    const storage = new R2Storage();
    Reflect.set(storage, 'client', { send });
    Reflect.set(storage, 'bucket', 'letterly-test');

    await expect(
      storage.deleteObject('pages/page-id/sources/image-id'),
    ).resolves.toBeUndefined();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('AC-14 does not retry a permanent provider rejection', async () => {
    const rejection = Object.assign(new Error('access denied'), {
      name: 'AccessDenied',
      $metadata: { httpStatusCode: 403 },
    });
    const send = jest.fn<() => Promise<unknown>>().mockRejectedValue(rejection);
    const storage = new R2Storage();
    Reflect.set(storage, 'client', { send });
    Reflect.set(storage, 'bucket', 'letterly-test');

    await expect(storage.getObject('pages/page-id/source')).rejects.toBe(
      rejection,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});
