import { firstMockCallOrder } from './support/required-test-value';
import { jest } from '@jest/globals';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { createHmac } from 'node:crypto';
import {
  createVisitorIdentityPayload,
  visitorIdentityHeader,
} from '@letterly/contracts/visitor-identity';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
  RateLimitService,
} from '../src/infrastructure/http/rate-limit.service';
import { unlockCookieName } from '../src/infrastructure/http/unlock-cookie';
import { VISITOR_IDENTITY_SECRET } from '../src/infrastructure/http/visitor-identity';
import {
  PAGE_MEDIA_REPOSITORY,
  type PageMediaRecord,
  type PageMediaRepository,
} from '../src/modules/pages/application/page-media.repository';
import {
  PAGE_AUDIO_REPOSITORY,
  type PageAudioRecord,
  type PageAudioRepository,
} from '../src/modules/pages/application/page-audio.repository';
import {
  PAGE_AUDIO_LINK_REPOSITORY,
  type PageAudioLinkRepository,
} from '../src/modules/pages/application/page-audio-link.repository';
import { YOUTUBE_LINKS_ENABLED } from '../src/modules/pages/application/page-audio-link.service';
import {
  PagePasswordService,
  PagePasswordConfigurationError,
} from '../src/modules/pages/application/page-password.service';
import { IMAGE_PROCESSOR } from '../src/modules/pages/application/image-processor';
import { PAGE_MEDIA_FAILURE_LOGGER } from '../src/modules/pages/application/page-media-failure-logger';
import {
  MEDIA_STORAGE,
  MediaStorageRangeNotSatisfiableError,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import {
  YOUTUBE_METADATA_PROVIDER,
  YOUTUBE_METADATA_CACHE,
  type YouTubeMetadataCache,
} from '../src/modules/pages/application/youtube-metadata';
import {
  pageMediaServiceProvider,
  pageAudioServiceProvider,
  pageAudioLinkServiceProvider,
} from '../src/modules/pages/pages.module';
import { PublicPageMediaController } from '../src/modules/pages/presentation/public-page-media.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const imageId = '22222222-2222-4222-8222-222222222222';
const slug = 'my-letter';
const identitySecret = 'fixture-visitor-identity-secret';
const baseUrl = `/api/v1/public/pages/${slug}`;
const expires = new Date('2026-10-03T02:00:00Z');
const image: PageMediaRecord = {
  id: imageId,
  pageId,
  state: 'READY',
  attachedAt: expires,
  storageKey: 'private/image.webp',
  sourceStorageKey: null,
  sourceMimeType: 'image/png',
  sourceByteSize: 1024,
  sourceSha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  outputByteSize: 4,
  outputSha256: 'output-checksum',
  width: 640,
  height: 480,
  sortOrder: 0,
  caption: null,
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: expires,
  expiresAt: null,
};
const audio: PageAudioRecord = {
  id: imageId,
  pageId,
  state: 'READY',
  sourceStorageKey: 'private/audio',
  sourceMimeType: 'audio/mpeg',
  displayTitle: 'Our song',
  sourceByteSize: 5,
  sourceSha256: image.sourceSha256,
  durationMilliseconds: 120000,
  rightsConfirmedAt: expires,
  rightsStatementVersion: '2026-09-08',
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: expires,
  expiresAt: null,
};
const link = {
  id: imageId,
  pageId,
  provider: 'YOUTUBE' as const,
  videoId: 'dQw4w9WgXcQ',
};
const routes = [
  { name: 'image', path: `${baseUrl}/images/${imageId}`, cache: 'no-store' },
  { name: 'audio', path: `${baseUrl}/audio`, cache: 'private, no-store' },
  {
    name: 'metadata',
    path: `${baseUrl}/audio/metadata`,
    cache: 'private, no-store',
  },
] as const;
function createPorts() {
  return {
    images: {
      getPublicImage: jest
        .fn<PageMediaRepository['getPublicImage']>()
        .mockResolvedValue(image),
    },
    audio: {
      getPublicAudio: jest
        .fn<PageAudioRepository['getPublicAudio']>()
        .mockResolvedValue(audio),
    },
    links: {
      getPublicAudioLink: jest
        .fn<PageAudioLinkRepository['getPublicAudioLink']>()
        .mockResolvedValue(link),
    },
    storage: {
      getObject: jest.fn<MediaStorage['getObject']>().mockResolvedValue({
        body: Buffer.from('webp'),
        contentType: 'image/webp',
        contentLength: 4,
        checksumSha256: undefined,
      }),
      getObjectRange: jest
        .fn<MediaStorage['getObjectRange']>()
        .mockImplementation(() =>
          Promise.resolve({
            body: Readable.from(Buffer.from('audio')),
            contentType: 'audio/mpeg',
            contentLength: 5,
            contentRange: undefined,
            totalLength: 5,
          }),
        ),
    },
    cache: {
      get: jest.fn<YouTubeMetadataCache['get']>().mockResolvedValue({
        type: 'available',
        metadata: {
          videoId: link.videoId,
          title: 'Our song',
          durationSeconds: 120,
          fetchedAt: expires.toISOString(),
          expiresAt: expires.toISOString(),
        },
      }),
    },
    password: {
      findPublicProtection: jest
        .fn<PagePasswordService['findPublicProtection']>()
        .mockResolvedValue(null),
      verifyUnlockToken: jest
        .fn<PagePasswordService['verifyUnlockToken']>()
        .mockResolvedValue(false),
    },
    limiter: {
      consumePublicMedia: jest
        .fn<RateLimitService['consumePublicMedia']>()
        .mockResolvedValue(undefined),
    },
  };
}
describe('Public media HTTP boundary', () => {
  let app: INestApplication<App>;
  let ports: ReturnType<typeof createPorts>;
  async function compose(
    withMedia = true,
    withPassword = true,
    withLimiter = true,
  ) {
    const module = await Test.createTestingModule({
      controllers: [PublicPageMediaController],
      providers: [
        { provide: VISITOR_IDENTITY_SECRET, useValue: identitySecret },
        ...(withMedia
          ? [
              pageMediaServiceProvider,
              pageAudioServiceProvider,
              pageAudioLinkServiceProvider,
              { provide: PAGE_MEDIA_REPOSITORY, useValue: ports.images },
              { provide: PAGE_AUDIO_REPOSITORY, useValue: ports.audio },
              { provide: PAGE_AUDIO_LINK_REPOSITORY, useValue: ports.links },
              { provide: MEDIA_STORAGE, useValue: ports.storage },
              { provide: IMAGE_PROCESSOR, useValue: {} },
              { provide: PAGE_MEDIA_FAILURE_LOGGER, useValue: {} },
              { provide: YOUTUBE_METADATA_PROVIDER, useValue: {} },
              { provide: YOUTUBE_METADATA_CACHE, useValue: ports.cache },
              { provide: YOUTUBE_LINKS_ENABLED, useValue: false },
            ]
          : []),
        ...(withPassword
          ? [{ provide: PagePasswordService, useValue: ports.password }]
          : []),
        ...(withLimiter
          ? [{ provide: RateLimitService, useValue: ports.limiter }]
          : []),
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
  function expectNoContentReads() {
    expect(ports.images.getPublicImage).not.toHaveBeenCalled();
    expect(ports.audio.getPublicAudio).not.toHaveBeenCalled();
    expect(ports.links.getPublicAudioLink).not.toHaveBeenCalled();
    expect(ports.storage.getObject).not.toHaveBeenCalled();
    expect(ports.storage.getObjectRange).not.toHaveBeenCalled();
  }
  it('delivers exact anonymous WebP bytes with privacy and indexing headers', async () => {
    const response = await request(app.getHttpServer())
      .get(routes[0].path)
      .expect(200);
    expect(response.body).toEqual(Buffer.from('webp'));
    expect(response.headers['content-type']).toMatch(/^image\/webp/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    expect(ports.images.getPublicImage.mock.calls).toEqual([
      [{ slug, imageId }],
    ]);
    expect(ports.storage.getObject.mock.calls).toEqual([[image.storageKey]]);
    expect(firstMockCallOrder(ports.limiter.consumePublicMedia)).toBeLessThan(
      firstMockCallOrder(ports.password.findPublicProtection),
    );
    expect(
      firstMockCallOrder(ports.password.findPublicProtection),
    ).toBeLessThan(firstMockCallOrder(ports.images.getPublicImage));
  });
  it.each([
    {
      range: undefined,
      start: undefined,
      end: undefined,
      status: 200,
      contentRange: undefined,
    },
    {
      range: 'bytes=0-4',
      start: 0,
      end: 4,
      status: 206,
      contentRange: 'bytes 0-4/5',
    },
    {
      range: 'bytes=0-',
      start: 0,
      end: undefined,
      status: 206,
      contentRange: 'bytes 0-4/5',
    },
  ])(
    'delivers exact audio bytes for range $range',
    async ({ range, start, end, status, contentRange }) => {
      ports.storage.getObjectRange.mockImplementation(() =>
        Promise.resolve({
          body: Readable.from(Buffer.from('audio')),
          contentType: undefined,
          contentLength: 5,
          contentRange,
          totalLength: 5,
        }),
      );
      const pending = request(app.getHttpServer()).get(routes[1].path);
      if (range) pending.set('Range', range);
      const response = await pending.expect(status);
      expect(response.body).toEqual(Buffer.from('audio'));
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.headers['content-type']).toBe('audio/mpeg');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['content-length']).toBe('5');
      expect(response.headers['content-range']).toBe(contentRange);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-disposition']).toBe('inline');
      expect(ports.audio.getPublicAudio.mock.calls).toEqual([[{ slug }]]);
      expect(ports.storage.getObjectRange.mock.calls).toEqual([
        [{ key: audio.sourceStorageKey, start, end }],
      ]);
    },
  );
  it('projects safe metadata despite disabled new link creation', async () => {
    const response = await request(app.getHttpServer())
      .get(routes[2].path)
      .expect(200);
    expect(response.body).toEqual({
      audioLink: {
        id: imageId,
        provider: 'YOUTUBE',
        videoId: link.videoId,
        displayTitle: 'Our song',
        durationSeconds: 120,
        metadataExpiresAt: expires.toISOString(),
      },
    });
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(ports.links.getPublicAudioLink.mock.calls).toEqual([[{ slug }]]);
    expect(ports.storage.getObject).not.toHaveBeenCalled();
  });
  it.each(routes)(
    'uses verified visitor identity for $name limits',
    async (route) => {
      const address = '203.0.113.10';
      const payload = createVisitorIdentityPayload(
        address,
        Math.floor(Date.now() / 1000),
      );
      const signature = createHmac('sha256', identitySecret)
        .update(payload)
        .digest('base64url');
      await request(app.getHttpServer())
        .get(route.path)
        .set(visitorIdentityHeader, `${payload}.${signature}`)
        .expect(200);
      expect(ports.limiter.consumePublicMedia.mock.calls).toEqual([[address]]);
    },
  );
  it.each(routes)(
    'blocks locked $name without accessing content',
    async (route) => {
      ports.password.findPublicProtection.mockResolvedValue({
        pageId,
        passwordVersion: 'v1',
      });
      const response = await request(app.getHttpServer())
        .get(route.path)
        .expect(401);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'PAGE_LOCKED',
      );
      expect(response.headers['cache-control']).toBe(route.cache);
      expect(ports.password.verifyUnlockToken.mock.calls).toEqual([
        [pageId, 'v1', null],
      ]);
      expectNoContentReads();
    },
  );
  it.each(routes)(
    'passes only the trusted page scoped cookie to unlock $name',
    async (route) => {
      ports.password.findPublicProtection.mockResolvedValue({
        pageId,
        passwordVersion: 'v1',
      });
      ports.password.verifyUnlockToken.mockResolvedValue(true);
      await request(app.getHttpServer())
        .get(route.path)
        .set(
          'Cookie',
          `${unlockCookieName(imageId)}=wrong; ${unlockCookieName(pageId)}=proof%20token`,
        )
        .expect(200);
      expect(ports.password.verifyUnlockToken.mock.calls).toEqual([
        [pageId, 'v1', 'proof token'],
      ]);
      expect(firstMockCallOrder(ports.limiter.consumePublicMedia)).toBeLessThan(
        firstMockCallOrder(ports.password.verifyUnlockToken),
      );
    },
  );
  it.each(routes)(
    'retains missing optional services behavior for $name',
    async (route) => {
      await app.close();
      app = await compose(false);
      const response = await request(app.getHttpServer())
        .get(route.path)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'STORAGE_UNAVAILABLE',
      );
      expect(ports.limiter.consumePublicMedia).not.toHaveBeenCalled();
      expectNoContentReads();
    },
  );
  it.each(routes)('maps missing published media for $name', async (route) => {
    ports.images.getPublicImage.mockResolvedValue(null);
    ports.audio.getPublicAudio.mockResolvedValue(null);
    ports.links.getPublicAudioLink.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get(route.path)
      .expect(404);
    const error = apiErrorEnvelopeSchema.parse(response.body);
    expect(error.code).toBe('PAGE_NOT_FOUND');
    expect(error.message).toBe(
      route.name === 'image'
        ? 'This letter is not available'
        : 'Page not found',
    );
    expect(response.headers['cache-control']).toBe(route.cache);
  });
  it.each(routes)(
    'maps password configuration failure safely for $name',
    async (route) => {
      ports.password.findPublicProtection.mockRejectedValue(
        new PagePasswordConfigurationError(),
      );
      const response = await request(app.getHttpServer())
        .get(route.path)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'PASSWORD_CONFIGURATION',
      );
      expectNoContentReads();
    },
  );
  it.each(routes)(
    'rejects excessive requests before password and content for $name',
    async (route) => {
      ports.limiter.consumePublicMedia.mockRejectedValue(
        new RateLimitExceededError(12),
      );
      const response = await request(app.getHttpServer())
        .get(route.path)
        .expect(429);
      expect(apiErrorEnvelopeSchema.parse(response.body).details).toEqual({
        retryAfterSeconds: 12,
      });
      expect(response.headers['retry-after']).toBe('12');
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expectNoContentReads();
    },
  );
  it.each(routes)(
    'fails safely when visitor limits are unavailable for $name',
    async (route) => {
      ports.limiter.consumePublicMedia.mockRejectedValue(
        new RateLimitUnavailableError(),
      );
      const response = await request(app.getHttpServer())
        .get(route.path)
        .expect(503);
      expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
        'RATE_LIMIT_UNAVAILABLE',
      );
      expectNoContentReads();
    },
  );
  it.each(routes)(
    'retains optional password and limiter injection for $name',
    async (route) => {
      await app.close();
      app = await compose(true, false, false);
      await request(app.getHttpServer()).get(route.path).expect(200);
      expect(ports.password.findPublicProtection).not.toHaveBeenCalled();
      expect(ports.limiter.consumePublicMedia).not.toHaveBeenCalled();
    },
  );
  it('validates the image UUID before limits and storage', async () => {
    await request(app.getHttpServer())
      .get(`${baseUrl}/images/invalid`)
      .expect(422);
    expect(ports.limiter.consumePublicMedia).not.toHaveBeenCalled();
    expectNoContentReads();
  });
  it.each([
    'bytes=-4',
    'bytes=4-1',
    'bytes=0-1,3-4',
    'bytes=9007199254740992-',
  ])('rejects unsupported audio range %s', async (range) => {
    const response = await request(app.getHttpServer())
      .get(routes[1].path)
      .set('Range', range)
      .expect(416);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'BAD_REQUEST',
    );
    expect(ports.audio.getPublicAudio).not.toHaveBeenCalled();
  });
  it('maps unsatisfiable storage range to safe 416', async () => {
    ports.storage.getObjectRange.mockRejectedValue(
      new MediaStorageRangeNotSatisfiableError(),
    );
    const response = await request(app.getHttpServer())
      .get(routes[1].path)
      .set('Range', 'bytes=10-')
      .expect(416);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'AUDIO_RANGE_NOT_SATISFIABLE',
    );
  });
  it('preserves generic public image errors and no indexing on unexpected failure', async () => {
    ports.images.getPublicImage.mockRejectedValue(
      new Error('private image key credentials'),
    );
    const response = await request(app.getHttpServer())
      .get(routes[0].path)
      .expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'SERVICE_UNAVAILABLE',
    );
    expect(response.headers['x-robots-tag']).toBe(
      'noindex, nofollow, noarchive',
    );
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('private image');
  });
});
