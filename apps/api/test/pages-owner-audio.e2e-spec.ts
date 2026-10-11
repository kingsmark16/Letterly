import { firstMockCallOrder } from './support/required-test-value';
import { jest } from '@jest/globals';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import { audioUploadResponseSchema } from '@letterly/contracts/pages';
import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiException } from '../src/infrastructure/http/api-exception';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import {
  RateLimitExceededError,
  RateLimitService,
} from '../src/infrastructure/http/rate-limit.service';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../src/modules/auth/better-auth-session.guard';
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
  MEDIA_STORAGE,
  MediaStorageRangeNotSatisfiableError,
  type MediaStorage,
} from '../src/modules/pages/application/media-storage';
import {
  YOUTUBE_METADATA_PROVIDER,
  YOUTUBE_METADATA_CACHE,
  type YouTubeMetadataProvider,
  type YouTubeMetadataCache,
} from '../src/modules/pages/application/youtube-metadata';
import {
  pageAudioServiceProvider,
  pageAudioLinkServiceProvider,
} from '../src/modules/pages/pages.module';
import { OwnerPageAudioController } from '../src/modules/pages/presentation/owner-page-audio.controller';

const pageId = '11111111-1111-4111-8111-111111111111';
const audioId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';
const owner = { creatorId, pageId };
const baseUrl = `/api/v1/pages/${pageId}/audio`;
const upload = {
  contentType: 'audio/mpeg' as const,
  title: 'Our song',
  byteSize: 1024,
  sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  durationMilliseconds: 120000,
  rightsConfirmed: true,
};
const audio: PageAudioRecord = {
  id: audioId,
  pageId,
  state: 'READY',
  sourceStorageKey: 'private/audio',
  sourceMimeType: 'audio/mpeg',
  displayTitle: 'Our song',
  sourceByteSize: 1024,
  sourceSha256: upload.sha256,
  durationMilliseconds: 120000,
  rightsConfirmedAt: new Date('2026-10-03T01:00:00Z'),
  rightsStatementVersion: '2026-09-08',
  failureCode: null,
  processingLeaseExpiresAt: null,
  uploadExpiresAt: new Date('2026-10-03T02:00:00Z'),
  expiresAt: null,
};
const link = {
  id: audioId,
  pageId,
  provider: 'YOUTUBE' as const,
  videoId: 'dQw4w9WgXcQ',
};
const linkBody = { url: `https://youtu.be/${link.videoId}` };
const emptySlot = {
  audioCapability: 'optional' as const,
  currentAudioId: null,
  currentAudioLink: null,
  hasActiveUpload: false,
};
const routes = [
  {
    name: 'upload',
    method: 'post',
    path: `${baseUrl}/uploads`,
    body: upload,
    port: 'audio',
    operation: 'prepareAudio',
  },
  {
    name: 'link',
    method: 'post',
    path: `${baseUrl}/links`,
    body: linkBody,
    port: 'links',
    operation: 'getOwnerAudioSlot',
  },
  {
    name: 'metadata',
    method: 'get',
    path: `${baseUrl}/metadata`,
    body: {},
    port: 'links',
    operation: 'getOwnerAudioSlot',
  },
  {
    name: 'complete',
    method: 'post',
    path: `${baseUrl}/${audioId}/complete`,
    body: {},
    port: 'audio',
    operation: 'claimAudio',
  },
  {
    name: 'retry',
    method: 'post',
    path: `${baseUrl}/${audioId}/retry`,
    body: upload,
    port: 'audio',
    operation: 'retryAudio',
  },
  {
    name: 'delete',
    method: 'delete',
    path: baseUrl,
    body: {},
    port: 'audio',
    operation: 'removeCurrentAudio',
  },
  {
    name: 'read',
    method: 'get',
    path: baseUrl,
    body: {},
    port: 'audio',
    operation: 'getOwnerAudio',
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
    audio: {
      prepareAudio: jest
        .fn<PageAudioRepository['prepareAudio']>()
        .mockResolvedValue({ type: 'created', audio }),
      retryAudio: jest
        .fn<PageAudioRepository['retryAudio']>()
        .mockImplementation((input) =>
          Promise.resolve({
            type: 'created' as const,
            audio: {
              ...audio,
              id: input.newAudioId,
              sourceStorageKey: input.sourceStorageKey,
            },
          }),
        ),
      claimAudio: jest
        .fn<PageAudioRepository['claimAudio']>()
        .mockResolvedValue({ type: 'ready', audio }),
      removeCurrentAudio: jest
        .fn<PageAudioRepository['removeCurrentAudio']>()
        .mockResolvedValue({ type: 'removed' }),
      getOwnerAudio: jest
        .fn<PageAudioRepository['getOwnerAudio']>()
        .mockResolvedValue(audio),
    },
    links: {
      getOwnerAudioSlot: jest
        .fn<PageAudioLinkRepository['getOwnerAudioSlot']>()
        .mockResolvedValue({ type: 'found', slot: emptySlot }),
      attachAudioLink: jest
        .fn<PageAudioLinkRepository['attachAudioLink']>()
        .mockResolvedValue({ type: 'created', link }),
    },
    storage: {
      createUploadUrl: jest
        .fn<MediaStorage['createUploadUrl']>()
        .mockResolvedValue({
          key: 'private/audio',
          uploadUrl: 'https://uploads.example.test/signed',
          requiredHeaders: {
            contentType: upload.contentType,
            sha256: upload.sha256,
          },
          expiresAt: audio.uploadExpiresAt,
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
    provider: {
      lookup: jest.fn<YouTubeMetadataProvider['lookup']>().mockResolvedValue({
        type: 'available',
        title: 'Our song',
        durationSeconds: 120,
      }),
    },
    cache: {
      get: jest.fn<YouTubeMetadataCache['get']>().mockResolvedValue(null),
      set: jest.fn<YouTubeMetadataCache['set']>().mockResolvedValue(undefined),
      isQuotaCooldownActive: jest
        .fn<YouTubeMetadataCache['isQuotaCooldownActive']>()
        .mockResolvedValue(false),
    },
    limiter: {
      consumeCreatorAudioUpload: jest
        .fn<RateLimitService['consumeCreatorAudioUpload']>()
        .mockResolvedValue(undefined),
    },
  };
}
describe('Owner audio HTTP boundary', () => {
  let app: INestApplication<App>;
  let ports: ReturnType<typeof createPorts>;
  async function compose(
    withServices = true,
    enabled = true,
    withLimiter = true,
  ) {
    const module = await Test.createTestingModule({
      controllers: [OwnerPageAudioController],
      providers: [
        ...(withServices
          ? [
              pageAudioServiceProvider,
              pageAudioLinkServiceProvider,
              { provide: PAGE_AUDIO_REPOSITORY, useValue: ports.audio },
              { provide: PAGE_AUDIO_LINK_REPOSITORY, useValue: ports.links },
              { provide: MEDIA_STORAGE, useValue: ports.storage },
              { provide: YOUTUBE_METADATA_PROVIDER, useValue: ports.provider },
              { provide: YOUTUBE_METADATA_CACHE, useValue: ports.cache },
              { provide: YOUTUBE_LINKS_ENABLED, useValue: enabled },
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
  function operation(route: (typeof routes)[number]) {
    return route.port === 'links'
      ? ports.links[route.operation]
      : ports.audio[route.operation];
  }

  it('authorizes upload with session identity, normalized title, rights version, and limiter ordering', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/uploads`)
      .send({ ...upload, title: ' Our song ', creatorId: 'untrusted' })
      .expect(200);
    const result = audioUploadResponseSchema.parse(response.body);
    expect(result).toMatchObject({
      state: 'UPLOADING',
      uploadExpiresAt: audio.uploadExpiresAt.toISOString(),
    });
    expect(ports.audio.prepareAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        ...owner,
        audioId: result.audioId,
        sourceMimeType: upload.contentType,
        sourceByteSize: upload.byteSize,
        sourceSha256: upload.sha256,
        displayTitle: 'Our song',
        durationMilliseconds: 120000,
        rightsStatementVersion: '2026-09-08',
      }),
    );
    expect(ports.limiter.consumeCreatorAudioUpload.mock.calls).toEqual([
      [creatorId],
    ]);
    expect(
      firstMockCallOrder(ports.limiter.consumeCreatorAudioUpload),
    ).toBeLessThan(firstMockCallOrder(ports.audio.prepareAudio));
  });
  it('retries with old identity and fresh audio ID', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/${audioId}/retry`)
      .send(upload)
      .expect(200);
    const result = audioUploadResponseSchema.parse(response.body);
    expect(result.audioId).not.toBe(audioId);
    expect(ports.audio.retryAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        ...owner,
        audioId,
        newAudioId: result.audioId,
        displayTitle: upload.title,
      }),
    );
    expect(ports.limiter.consumeCreatorAudioUpload).toHaveBeenCalledWith(
      creatorId,
    );
  });
  it('completes a ready record with a safe owner projection', async () => {
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/${audioId}/complete`)
      .expect(200);
    expect(response.body).toEqual({
      audioId,
      state: 'READY',
      mediaUrl: null,
      title: upload.title,
      sourceMimeType: upload.contentType,
      sourceByteSize: upload.byteSize,
      durationMilliseconds: 120000,
      failureCode: null,
    });
    expect(ports.audio.claimAudio).toHaveBeenCalledWith(
      expect.objectContaining({ ...owner, audioId }),
    );
    expect(ports.limiter.consumeCreatorAudioUpload).not.toHaveBeenCalled();
  });
  it.each(['created', 'existing'] as const)(
    'preserves %s link attachment status and ownership',
    async (type) => {
      ports.links.attachAudioLink.mockResolvedValue({ type, link });
      const response = await request(app.getHttpServer())
        .post(`${baseUrl}/links`)
        .send(linkBody)
        .expect(type === 'created' ? 201 : 200);
      expect(response.body).toMatchObject({
        audioLink: {
          id: audioId,
          provider: 'YOUTUBE',
          videoId: link.videoId,
          displayTitle: 'Our song',
          durationSeconds: 120,
        },
      });
      expect(ports.links.attachAudioLink).toHaveBeenCalledWith(
        expect.objectContaining({ ...owner, videoId: link.videoId }),
      );
      expect(
        firstMockCallOrder(ports.limiter.consumeCreatorAudioUpload),
      ).toBeLessThan(firstMockCallOrder(ports.links.getOwnerAudioSlot));
    },
  );
  it('reads existing link metadata privately with the existing read limiter', async () => {
    ports.links.getOwnerAudioSlot.mockResolvedValue({
      type: 'found',
      slot: { ...emptySlot, currentAudioLink: link },
    });
    const response = await request(app.getHttpServer())
      .get(`${baseUrl}/metadata`)
      .expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(ports.links.getOwnerAudioSlot.mock.calls).toEqual([[owner]]);
    expect(ports.limiter.consumeCreatorAudioUpload.mock.calls).toEqual([
      [creatorId],
    ]);
  });
  it('removes owned audio with an empty 204 response', async () => {
    const response = await request(app.getHttpServer())
      .delete(baseUrl)
      .expect(204);
    expect(response.text).toBe('');
    expect(ports.audio.removeCurrentAudio.mock.calls).toEqual([[owner]]);
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
    'streams exact private bytes for range $range',
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
      const pending = request(app.getHttpServer()).get(baseUrl);
      if (range) pending.set('Range', range);
      const response = await pending.expect(status);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.headers['content-type']).toBe('audio/mpeg');
      expect(response.headers['accept-ranges']).toBe('bytes');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-disposition']).toBe('inline');
      expect(response.headers['content-length']).toBe('5');
      expect(response.headers['content-range']).toBe(contentRange);
      expect(response.body).toEqual(Buffer.from('audio'));
      expect(ports.audio.getOwnerAudio.mock.calls).toEqual([[owner]]);
      expect(ports.storage.getObjectRange.mock.calls).toEqual([
        [{ key: audio.sourceStorageKey, start, end }],
      ]);
    },
  );
  it.each(routes)('requires authentication for $name', async (route) => {
    authenticated = false;
    await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(401);
    expect(operation(route)).not.toHaveBeenCalled();
  });
  it.each(routes)(
    'fails safely without optional services for $name',
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
      expect(operation(route)).not.toHaveBeenCalled();
    },
  );
  it.each(routes)('maps missing owned resources for $name', async (route) => {
    ports.audio.prepareAudio.mockResolvedValue({ type: 'not_found' });
    ports.audio.retryAudio.mockResolvedValue({ type: 'not_found' });
    ports.audio.claimAudio.mockResolvedValue({ type: 'not_found' });
    ports.audio.removeCurrentAudio.mockResolvedValue({ type: 'not_found' });
    ports.audio.getOwnerAudio.mockResolvedValue(null);
    ports.links.getOwnerAudioSlot.mockResolvedValue({ type: 'not_found' });
    const response = await request(app.getHttpServer())
      [route.method](route.path)
      .send(route.body)
      .expect(404);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'PAGE_NOT_FOUND',
    );
    expect(ports.storage.createUploadUrl).not.toHaveBeenCalled();
    expect(ports.storage.getObjectRange).not.toHaveBeenCalled();
  });
  it.each(routes)('validates page UUID before $name', async (route) => {
    await request(app.getHttpServer())
      [route.method](route.path.replace(pageId, 'invalid'))
      .send(route.body)
      .expect(422);
    expect(operation(route)).not.toHaveBeenCalled();
  });
  it.each([
    'bytes=-4',
    'bytes=4-1',
    'bytes=0-1,3-4',
    'bytes=9007199254740992-',
    'invalid',
  ])('rejects unsupported range %s before storage', async (range) => {
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .set('Range', range)
      .expect(416);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'BAD_REQUEST',
    );
    expect(ports.audio.getOwnerAudio).not.toHaveBeenCalled();
  });
  it.each([
    { ...upload, rightsConfirmed: false },
    { ...upload, byteSize: 26214401 },
    { ...upload, contentType: 'audio/wav' },
    { ...upload, sha256: 'invalid' },
    { ...upload, title: ' ' },
    { ...upload, durationMilliseconds: 0 },
  ])('validates upload contract %j before limiting', async (body) => {
    await request(app.getHttpServer())
      .post(`${baseUrl}/uploads`)
      .send(body)
      .expect(422);
    expect(ports.audio.prepareAudio).not.toHaveBeenCalled();
    expect(ports.limiter.consumeCreatorAudioUpload).not.toHaveBeenCalled();
  });
  it.each(['uploads', `${audioId}/retry`, 'links', 'metadata'])(
    'keeps limiter rejection ahead of %s work',
    async (path) => {
      ports.limiter.consumeCreatorAudioUpload.mockRejectedValue(
        new RateLimitExceededError(12),
      );
      const pending =
        path === 'metadata'
          ? request(app.getHttpServer()).get(`${baseUrl}/${path}`)
          : request(app.getHttpServer())
              .post(`${baseUrl}/${path}`)
              .send(path === 'links' ? linkBody : upload);
      const response = await pending.expect(429);
      expect(apiErrorEnvelopeSchema.parse(response.body).details).toEqual({
        retryAfterSeconds: 12,
      });
      expect(response.headers['retry-after']).toBe('12');
      expect(ports.audio.prepareAudio).not.toHaveBeenCalled();
      expect(ports.audio.retryAudio).not.toHaveBeenCalled();
      expect(ports.links.getOwnerAudioSlot).not.toHaveBeenCalled();
    },
  );
  it('retains optional limiter injection', async () => {
    await app.close();
    app = await compose(true, true, false);
    await request(app.getHttpServer())
      .post(`${baseUrl}/uploads`)
      .send(upload)
      .expect(200);
  });
  it('keeps disabled link creation separate from existing link metadata access', async () => {
    await app.close();
    app = await compose(true, false);
    const response = await request(app.getHttpServer())
      .post(`${baseUrl}/links`)
      .send(linkBody)
      .expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'AUDIO_LINKS_DISABLED',
    );
    ports.links.getOwnerAudioSlot.mockResolvedValue({
      type: 'found',
      slot: { ...emptySlot, currentAudioLink: link },
    });
    await request(app.getHttpServer()).get(`${baseUrl}/metadata`).expect(200);
  });
  it('maps missing link metadata to not found', async () => {
    await request(app.getHttpServer()).get(`${baseUrl}/metadata`).expect(404);
  });
  it('rejects malformed audio UUIDs before completion', async () => {
    await request(app.getHttpServer())
      .post(`${baseUrl}/invalid/complete`)
      .expect(422);
    expect(ports.audio.claimAudio).not.toHaveBeenCalled();
  });
  it('maps storage range rejection to safe 416', async () => {
    ports.storage.getObjectRange.mockRejectedValue(
      new MediaStorageRangeNotSatisfiableError(),
    );
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .set('Range', 'bytes=10-')
      .expect(416);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'AUDIO_RANGE_NOT_SATISFIABLE',
    );
  });
  it('redacts storage and persistence failures', async () => {
    ports.storage.getObjectRange.mockRejectedValue(
      new Error('private audio key credentials'),
    );
    const response = await request(app.getHttpServer())
      .get(baseUrl)
      .expect(503);
    expect(apiErrorEnvelopeSchema.parse(response.body).code).toBe(
      'STORAGE_UNAVAILABLE',
    );
    expect(JSON.stringify(response.body)).not.toContain('private audio key');
    ports.audio.removeCurrentAudio.mockRejectedValue(
      new Error('private database credentials'),
    );
    const deletion = await request(app.getHttpServer())
      .delete(baseUrl)
      .expect(500);
    expect(apiErrorEnvelopeSchema.parse(deletion.body).code).toBe(
      'INTERNAL_SERVER_ERROR',
    );
    expect(JSON.stringify(deletion.body)).not.toContain('private database');
  });
});
