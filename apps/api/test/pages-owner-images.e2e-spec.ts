import { firstMockCallOrder } from './support/required-test-value';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { imageUploadResponseSchema } from '@letterly/contracts/pages';
import { jest } from '@jest/globals';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../src/infrastructure/http/rate-limit.service';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRepository,
  type PageMediaRecord,
} from '../src/modules/pages/application/page-media.repository';
import {
  MEDIA_STORAGE,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import { IMAGE_PROCESSOR } from '../src/modules/pages/application/image-processor';
import { PAGE_MEDIA_FAILURE_LOGGER } from '../src/modules/pages/application/page-media-failure-logger';
import { pageMediaServiceProvider } from '../src/modules/pages/pages.module';
import { OwnerPageImagesController } from '../src/modules/pages/presentation/owner-page-images.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';
const owner = { creatorId, pageId, imageId };
const baseUrl = `/api/v1/pages/${pageId}/images`;
const upload = {
  contentType: 'image/png',
  byteSize: 1024,
  sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
};
const image: PageMediaRecord = {
  id: imageId,
  pageId,
  state: 'READY',
  attachedAt: null,
  storageKey: 'private/output.webp',
  sourceStorageKey: null,
  sourceMimeType: 'image/png',
  sourceByteSize: 1024,
  sourceSha256: upload.sha256,
  outputByteSize: 4,
  outputSha256: 'output-checksum',
  width: 640,
  height: 480,
  sortOrder: null,
  caption: null,
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: new Date('2026-10-03T01:00:00Z'),
  expiresAt: null,
};
const projection = {
  imageId,
  state: 'READY' as const,
  attached: false,
  sortOrder: null,
  mediaUrl: `${baseUrl}/${imageId}`,
  caption: null,
  failureCode: null,
  expiresAt: null,
};
const routes = [
  {
    name: 'upload',
    method: 'post',
    path: `${baseUrl}/uploads`,
    body: upload,
    operation: 'prepareImage',
  },
  {
    name: 'list',
    method: 'get',
    path: baseUrl,
    body: {},
    operation: 'listOwnerImages',
  },
  {
    name: 'complete',
    method: 'post',
    path: `${baseUrl}/${imageId}/complete`,
    body: {},
    operation: 'claimImage',
  },
  {
    name: 'retry',
    method: 'post',
    path: `${baseUrl}/${imageId}/retry`,
    body: {},
    operation: 'retryImage',
  },
  {
    name: 'delete',
    method: 'delete',
    path: `${baseUrl}/${imageId}`,
    body: {},
    operation: 'removeImage',
  },
  {
    name: 'read',
    method: 'get',
    path: `${baseUrl}/${imageId}`,
    body: {},
    operation: 'getOwnerImage',
  },
] as const;
let authenticated = true;
class FixtureSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!authenticated)
      throw new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    const incoming = context.switchToHttp().getRequest<AuthenticatedRequest>();
    incoming.authSession = {
      user: { id: creatorId },
    } as AuthenticatedRequest['authSession'];
    return true;
  }
}
function createPorts() {
  return {
    repository: {
      prepareImage: jest
        .fn<PageMediaRepository['prepareImage']>()
        .mockResolvedValue({ type: 'created', image }),
      listOwnerImages: jest
        .fn<PageMediaRepository['listOwnerImages']>()
        .mockResolvedValue([projection]),
      claimImage: jest
        .fn<PageMediaRepository['claimImage']>()
        .mockResolvedValue({ type: 'ready', image }),
      retryImage: jest
        .fn<PageMediaRepository['retryImage']>()
        .mockResolvedValue({ type: 'retried', image }),
      removeImage: jest
        .fn<PageMediaRepository['removeImage']>()
        .mockResolvedValue({ type: 'removed' }),
      getOwnerImage: jest
        .fn<PageMediaRepository['getOwnerImage']>()
        .mockResolvedValue(image),
      markImageFailed: jest
        .fn<PageMediaRepository['markImageFailed']>()
        .mockResolvedValue(undefined),
    },
    storage: {
      createUploadUrl: jest
        .fn<MediaStorage['createUploadUrl']>()
        .mockResolvedValue({
          key: 'private/source',
          uploadUrl: 'https://uploads.example.test/signed',
          requiredHeaders: {
            contentType: upload.contentType,
            sha256: upload.sha256,
          },
          expiresAt: image.uploadExpiresAt,
        }),
      getObject: jest.fn<MediaStorage['getObject']>().mockResolvedValue({
        body: Buffer.from('webp'),
        contentType: 'image/webp',
        contentLength: 4,
        checksumSha256: undefined,
      }),
    },
    limiter: {
      consumeCreatorImageUpload: jest
        .fn<RateLimitService['consumeCreatorImageUpload']>()
        .mockResolvedValue(undefined),
    },
  };
}
describe('Owner image HTTP boundary', () => {
  let app: INestApplication<App>;
  let ports: ReturnType<typeof createPorts>;
  async function compose(withService = true, withLimiter = true) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPageImagesController],
      providers: [
        ...(withService
          ? [
              pageMediaServiceProvider,
              { provide: PAGE_MEDIA_REPOSITORY, useValue: ports.repository },
              { provide: MEDIA_STORAGE, useValue: ports.storage },
              { provide: IMAGE_PROCESSOR, useValue: {} },
              { provide: PAGE_MEDIA_FAILURE_LOGGER, useValue: {} },
            ]
          : []),
        ...(withLimiter
          ? [{ provide: RateLimitService, useValue: ports.limiter }]
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
    ports = createPorts();
    app = await compose();
  });
  afterEach(async () => {
    await app.close();
  });

  it('authorizes uploads with session identity, replacement, bounded expiry, and limiter before storage', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/uploads`)
      .send({ ...upload, replaceImageId: imageId, creatorId: 'untrusted' })
      .expect(200);
    expect(response.body).toMatchObject({
      state: 'UPLOADING',
      uploadExpiresAt: image.uploadExpiresAt.toISOString(),
      requiredHeaders: {
        contentType: upload.contentType,
        sha256: upload.sha256,
      },
    });
    expect(imageUploadResponseSchema.parse(response.body).imageId).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(ports.repository.prepareImage).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorId,
        pageId,
        ...upload,
        replaceImageId: imageId,
        imageId: imageUploadResponseSchema.parse(response.body).imageId,
      }),
    );
    expect(ports.limiter.consumeCreatorImageUpload.mock.calls).toEqual([
      [creatorId],
    ]);
    expect(
      firstMockCallOrder(ports.limiter.consumeCreatorImageUpload),
    ).toBeLessThan(firstMockCallOrder(ports.repository.prepareImage));
    expect(ports.storage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: upload.contentType,
        sha256: upload.sha256,
        expiresInSeconds: 3600,
      }),
    );
    expect(JSON.stringify(response.body)).not.toContain('sourceStorageKey');
  });
  it('lists validated private projections with session ownership', async () => {
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}?creatorId=untrusted`)
      .expect(200);
    expect(response.body).toEqual([projection]);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(ports.repository.listOwnerImages.mock.calls).toEqual([
      [{ creatorId, pageId }],
    ]);
  });
  it('completes an already ready upload with its safe operation projection', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/${imageId}/complete`)
      .expect(200);
    expect(response.body).toEqual({
      imageId,
      state: 'READY',
      mediaUrl: projection.mediaUrl,
      outputByteSize: 4,
      width: 640,
      height: 480,
      failureCode: null,
    });
    expect(ports.repository.claimImage).toHaveBeenCalledWith(
      expect.objectContaining(owner),
    );
    expect(ports.storage.getObject).not.toHaveBeenCalled();
  });
  it('retries using owned persisted type and checksum', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/${imageId}/retry`)
      .expect(200);
    expect(response.body).toMatchObject({ imageId, state: 'UPLOADING' });
    expect(ports.repository.retryImage).toHaveBeenCalledWith(
      expect.objectContaining(owner),
    );
    expect(ports.storage.createUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: image.sourceMimeType,
        sha256: image.sourceSha256,
      }),
    );
    expect(ports.limiter.consumeCreatorImageUpload).not.toHaveBeenCalled();
  });
  it('removes an owned upload with an empty 204 response', async () => {
    const response = await request(app.getHttpServer())
      .delete(`${baseUrl}/${imageId}`)
      .expect(204);
    expect(response.text).toBe('');
    expect(ports.repository.removeImage.mock.calls).toEqual([[owner]]);
  });
  it('delivers exact WebP bytes with no-store and owned storage lookup', async () => {
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}/${imageId}`)
      .expect(200);
    expect(response.headers['content-type']).toMatch(/^image\/webp/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body).toEqual(Buffer.from('webp'));
    expect(ports.repository.getOwnerImage.mock.calls).toEqual([[owner]]);
    expect(ports.storage.getObject.mock.calls).toEqual([[image.storageKey]]);
  });
  it.each(routes)('requires authentication for $name', async (route) => {
    authenticated = false;
    await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(401);
    expect(ports.repository[route.operation]).not.toHaveBeenCalled();
  });
  it.each(routes)(
    'fails safely without optional image service for $name',
    async (route) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        [route.method](route.path)
        .send(route.body)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'STORAGE_UNAVAILABLE',
      );
      expect(ports.repository[route.operation]).not.toHaveBeenCalled();
    },
  );
  it.each(routes)('maps missing owner resources for $name', async (route) => {
    ports.repository.prepareImage.mockResolvedValue({ type: 'not_found' });
    ports.repository.listOwnerImages.mockResolvedValue(null);
    ports.repository.claimImage.mockResolvedValue({ type: 'not_found' });
    ports.repository.retryImage.mockResolvedValue({ type: 'not_found' });
    ports.repository.removeImage.mockResolvedValue({ type: 'not_found' });
    ports.repository.getOwnerImage.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(404);
    expect(response.body).toMatchObject({
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
    expect(ports.storage.getObject).not.toHaveBeenCalled();
    expect(ports.storage.createUploadUrl).not.toHaveBeenCalled();
  });
  it.each([
    { ...upload, byteSize: 10485761 },
    { ...upload, byteSize: 0 },
    { ...upload, contentType: 'image/svg+xml' },
    { ...upload, sha256: 'invalid' },
    { ...upload, replaceImageId: 'invalid' },
  ])(
    'rejects invalid upload input %j before limiter or persistence',
    async (body) => {
      await request(app.getHttpServer())
        .post(`${baseUrl}/uploads`)
        .send(body)
        .expect(422);
      expect(ports.repository.prepareImage).not.toHaveBeenCalled();
      expect(ports.limiter.consumeCreatorImageUpload).not.toHaveBeenCalled();
    },
  );
  it.each(routes)('validates page UUID before $name', async (route) => {
    await request(app.getHttpServer())
      [route.method](route.path.replace(pageId, 'invalid'))
      .send(route.body)
      .expect(422);
    expect(ports.repository[route.operation]).not.toHaveBeenCalled();
  });
  it.each(routes.filter((route) => route.path.includes(imageId)))(
    'validates image UUID before $name',
    async (route) => {
      await request(app.getHttpServer())
        [route.method](route.path.replace(imageId, 'invalid'))
        .send(route.body)
        .expect(422);
      expect(ports.repository[route.operation]).not.toHaveBeenCalled();
    },
  );
  it.each([
    {
      error: new RateLimitExceededError(12),
      status: 429,
      code: 'RATE_LIMITED',
    },
    {
      error: new RateLimitUnavailableError(),
      status: 503,
      code: 'RATE_LIMIT_UNAVAILABLE',
    },
  ])(
    'maps $code before upload persistence',
    async ({ error, status, code }) => {
      ports.limiter.consumeCreatorImageUpload.mockRejectedValue(error);
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/uploads`)
        .send(upload)
        .expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
      if (status === 429)
        expect(apiErrorEnvelopeSchema.parse(response.body).details).toEqual({
          retryAfterSeconds: 12,
        });
      expect(ports.repository.prepareImage).not.toHaveBeenCalled();
    },
  );
  it('retains optional limiter behavior', async () => {
    await app.close();
    app = await compose(true, false);
    await request(app.getHttpServer())
      .post(`${baseUrl}/uploads`)
      .send(upload)
      .expect(200);
    expect(ports.repository.prepareImage).toHaveBeenCalled();
  });
  it.each([
    {
      operation: 'prepare',
      result: 'limit',
      path: `${baseUrl}/uploads`,
      status: 422,
      code: 'IMAGE_LIMIT_REACHED',
    },
    {
      operation: 'complete',
      result: 'processing',
      path: `${baseUrl}/${imageId}/complete`,
      status: 409,
      code: 'IMAGE_PROCESSING',
    },
    {
      operation: 'complete',
      result: 'not_ready',
      path: `${baseUrl}/${imageId}/complete`,
      status: 409,
      code: 'IMAGE_NOT_READY',
    },
    {
      operation: 'retry',
      result: 'attached',
      path: `${baseUrl}/${imageId}/retry`,
      status: 409,
      code: 'IMAGE_ATTACHED',
    },
    {
      operation: 'retry',
      result: 'unavailable',
      path: `${baseUrl}/${imageId}/retry`,
      status: 422,
      code: 'IMAGE_RETRY_UNAVAILABLE',
    },
    {
      operation: 'delete',
      result: 'attached',
      path: `${baseUrl}/${imageId}`,
      status: 409,
      code: 'IMAGE_ATTACHED',
    },
    {
      operation: 'delete',
      result: 'processing',
      path: `${baseUrl}/${imageId}`,
      status: 409,
      code: 'IMAGE_PROCESSING',
    },
  ] as const)(
    'preserves $code for $operation',
    async ({ operation, result, path, status, code }) => {
      if (operation === 'prepare')
        ports.repository.prepareImage.mockResolvedValue({ type: 'limit' });
      if (
        operation === 'complete' &&
        (result === 'processing' || result === 'not_ready')
      )
        ports.repository.claimImage.mockResolvedValue({ type: result });
      if (
        operation === 'retry' &&
        (result === 'attached' || result === 'unavailable')
      )
        ports.repository.retryImage.mockResolvedValue({ type: result });
      if (
        operation === 'delete' &&
        (result === 'attached' || result === 'processing')
      )
        ports.repository.removeImage.mockResolvedValue({ type: result });
      const response =
        operation === 'delete'
          ? await request(app.getHttpServer()).delete(path).expect(status)
          : await request(app.getHttpServer())
              .post(path)
              .send(upload)
              .expect(status);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(code);
    },
  );
  it('maps private storage failures without exposing keys or provider messages', async () => {
    ports.storage.getObject.mockRejectedValue(
      new Error('private/output.webp credentials'),
    );
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}/${imageId}`)
      .expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'STORAGE_UNAVAILABLE',
    );
    expect(JSON.stringify(response.body)).not.toContain('private/output.webp');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('redacts unexpected persistence failures', async () => {
    ports.repository.listOwnerImages.mockRejectedValue(
      new Error('private database credentials'),
    );
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain(
      'private database credentials',
    );
    expect(response.headers['cache-control']).toBe('private, no-store');
  });
});
