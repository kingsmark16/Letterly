import type { Request, Response } from 'express';
import { PassThrough, Readable } from 'node:stream';
import type { ImageUploadRequest } from '@letterly/contracts/pages';

jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

import { ApiException } from '../../infrastructure/http/api-exception';
import { RateLimitService } from '../../infrastructure/http/rate-limit.service';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { PageService } from './application/page.service';
import {
  MediaPageNotFoundError,
  PageMediaService,
} from './application/page-media.service';
import {
  AudioRangeNotSatisfiableError,
  PageAudioService,
} from './application/page-audio.service';
import { PagesController, PublicPagesController } from './pages.controller';

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const imageId = '11111111-1111-4111-8111-111111111111';

const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as unknown as AuthenticatedRequest;

function createMediaService(): jest.Mocked<
  Pick<
    PageMediaService,
    | 'prepareUpload'
    | 'listOwnerImages'
    | 'completeUpload'
    | 'retryUpload'
    | 'removeUpload'
    | 'getOwnerMedia'
    | 'getPublicMedia'
  >
> {
  return {
    prepareUpload: jest.fn(),
    listOwnerImages: jest.fn(),
    completeUpload: jest.fn(),
    retryUpload: jest.fn(),
    removeUpload: jest.fn(),
    getOwnerMedia: jest.fn(),
    getPublicMedia: jest.fn(),
  };
}

describe('Pages media controllers', () => {
  it('AC-2 prepares an upload for the authenticated owner', async () => {
    const mediaService = createMediaService();
    const consumeCreatorImageUpload = jest.fn();
    const rateLimitService = {
      consumeCreatorImageUpload,
    } as unknown as RateLimitService;
    mediaService.prepareUpload.mockResolvedValue({
      imageId,
      uploadUrl: 'https://uploads.example.test/signed',
      requiredHeaders: {
        contentType: 'image/png',
        sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      },
      uploadExpiresAt: '2026-08-11T01:00:00.000Z',
      state: 'UPLOADING',
    });
    const controller = new PagesController(
      {} as PageService,
      undefined,
      rateLimitService,
      mediaService as unknown as PageMediaService,
    );
    const body: ImageUploadRequest = {
      contentType: 'image/png',
      byteSize: 1024,
      sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    };

    await expect(
      controller.prepareImageUpload(ownerRequest, { pageId }, body),
    ).resolves.toMatchObject({ imageId, state: 'UPLOADING' });

    expect(consumeCreatorImageUpload.mock.calls).toEqual([[creatorId]]);
    expect(mediaService.prepareUpload.mock.calls).toEqual([
      [{ creatorId, pageId, ...body }],
    ]);
  });

  it('rate limits an owner audio upload before issuing a signed URL', async () => {
    const prepareUpload = jest.fn().mockResolvedValue({
      audioId: imageId,
      uploadUrl: 'https://uploads.example.test/signed-audio',
      requiredHeaders: {
        contentType: 'audio/mpeg',
        sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      },
      uploadExpiresAt: '2026-08-11T01:00:00.000Z',
      state: 'UPLOADING',
    });
    const audioService = { prepareUpload } as unknown as PageAudioService;
    const consumeCreatorAudioUpload = jest.fn();
    const controller = new PagesController(
      {} as PageService,
      undefined,
      { consumeCreatorAudioUpload } as unknown as RateLimitService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      audioService,
    );

    await controller.prepareAudioUpload(
      ownerRequest,
      { pageId },
      {
        contentType: 'audio/mpeg',
        byteSize: 1024,
        sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        title: 'Our song',
        rightsConfirmed: true,
      },
    );

    expect(consumeCreatorAudioUpload).toHaveBeenCalledWith(creatorId);
    expect(prepareUpload).toHaveBeenCalledWith(
      expect.objectContaining({ creatorId, pageId }),
    );
  });

  it('AC-9 streams a public image only through the public media service', async () => {
    const mediaService = createMediaService();
    const consumePublicMedia = jest.fn();
    const rateLimitService = {
      consumePublicMedia,
    } as unknown as RateLimitService;
    mediaService.getPublicMedia.mockResolvedValue(Buffer.from('webp'));
    const controller = new PublicPagesController(
      {} as PageService,
      rateLimitService,
      undefined,
      mediaService as unknown as PageMediaService,
    );
    const setHeader = jest.fn();
    const response = {
      setHeader,
      send: jest.fn(),
    } as unknown as Response;
    const request = {
      ip: '127.0.0.1',
      headers: {},
    } as unknown as Request;

    await expect(
      controller.getImage({ slug: 'my-letter', imageId }, request, response),
    ).resolves.toBeUndefined();

    expect(consumePublicMedia.mock.calls).toEqual([['127.0.0.1']]);
    expect(mediaService.getPublicMedia.mock.calls).toEqual([
      [{ slug: 'my-letter', imageId }],
    ]);
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.send).toHaveBeenCalledWith(Buffer.from('webp'));
  });

  it('streams a ready public audio track through the rate-limited range path', async () => {
    const consumePublicMedia = jest.fn();
    const rateLimitService = {
      consumePublicMedia,
    } as unknown as RateLimitService;
    const getPublicAudio = jest.fn().mockResolvedValue({
      body: Readable.from(Buffer.from('audio')),
      contentType: 'audio/mpeg',
      contentLength: 5,
      contentRange: 'bytes 0-4/5',
      totalLength: 5,
    });
    const audioService = { getPublicAudio } as unknown as PageAudioService;
    const controller = new PublicPagesController(
      {} as PageService,
      rateLimitService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      audioService,
    );
    const response = Object.assign(new PassThrough(), {
      setHeader: jest.fn(),
      status: jest.fn(),
    });
    response.status.mockReturnValue(response);

    await controller.getAudio(
      { slug: 'my-letter' },
      {
        ip: '127.0.0.1',
        headers: { range: 'bytes=0-4' },
      } as unknown as Request,
      response as unknown as Response,
    );

    expect(consumePublicMedia).toHaveBeenCalledWith('127.0.0.1');
    expect(getPublicAudio).toHaveBeenCalledWith({
      slug: 'my-letter',
      start: 0,
      end: 4,
    });
    expect(response.status).toHaveBeenCalledWith(206);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Range',
      'bytes 0-4/5',
    );
  });

  it('streams owner audio through the range path', async () => {
    const getOwnerAudio = jest.fn().mockResolvedValue({
      body: Readable.from(Buffer.from('audio')),
      contentType: 'audio/mpeg',
      contentLength: 5,
      contentRange: 'bytes 0-4/5',
      totalLength: 5,
    });
    const audioService = {
      getOwnerAudio,
    } as unknown as PageAudioService;
    const controller = new PagesController(
      {} as PageService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      audioService,
    );
    const response = Object.assign(new PassThrough(), {
      setHeader: jest.fn(),
      status: jest.fn(),
    });
    response.status.mockReturnValue(response);

    await controller.getOwnerAudio(
      {
        ...ownerRequest,
        headers: { range: 'bytes=0-4' },
      } as unknown as AuthenticatedRequest,
      { pageId },
      response as unknown as Response,
    );

    expect(getOwnerAudio).toHaveBeenCalledWith({
      creatorId,
      pageId,
      start: 0,
      end: 4,
    });
    expect(response.status).toHaveBeenCalledWith(206);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Range',
      'bytes 0-4/5',
    );
    expect(response.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
  });

  it('maps an invalid public audio range to 416', async () => {
    const getPublicAudio = jest
      .fn()
      .mockRejectedValue(new AudioRangeNotSatisfiableError());
    const controller = new PublicPagesController(
      {} as PageService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { getPublicAudio } as unknown as PageAudioService,
    );

    let error: unknown;
    try {
      await controller.getAudio(
        { slug: 'my-letter' },
        { headers: {} } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 416,
      code: 'AUDIO_RANGE_NOT_SATISFIABLE',
    });
  });

  it('AC-7 sends an owner image as binary response bytes', async () => {
    const mediaService = createMediaService();
    const body = Buffer.from('owner-webp');
    mediaService.getOwnerMedia.mockResolvedValue(body);
    const controller = new PagesController(
      {} as PageService,
      undefined,
      undefined,
      mediaService as unknown as PageMediaService,
    );
    const setHeader = jest.fn();
    const response = {
      setHeader,
      send: jest.fn(),
    } as unknown as Response;

    await expect(
      controller.getOwnerImage(ownerRequest, { pageId, imageId }, response),
    ).resolves.toBeUndefined();

    expect(mediaService.getOwnerMedia).toHaveBeenCalledWith({
      creatorId,
      pageId,
      imageId,
    });
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/webp');
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.send).toHaveBeenCalledWith(body);
  });

  it('AC-13 maps a missing public image to the generic page not found error', async () => {
    const mediaService = createMediaService();
    mediaService.getPublicMedia.mockRejectedValue(new MediaPageNotFoundError());
    const controller = new PublicPagesController(
      {} as PageService,
      undefined,
      undefined,
      mediaService as unknown as PageMediaService,
    );

    let error: unknown;
    try {
      await controller.getImage(
        { slug: 'my-letter', imageId },
        { ip: '127.0.0.1', headers: {} } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 404,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  });

  it('AC-14 maps an unexpected public image dependency failure to a safe 503', async () => {
    const mediaService = createMediaService();
    mediaService.getPublicMedia.mockRejectedValue(
      new Error('database timeout'),
    );
    const controller = new PublicPagesController(
      {} as PageService,
      undefined,
      undefined,
      mediaService as unknown as PageMediaService,
    );

    let error: unknown;
    try {
      await controller.getImage(
        { slug: 'my-letter', imageId },
        { ip: '127.0.0.1', headers: {} } as unknown as Request,
        { setHeader: jest.fn() } as unknown as Response,
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  });
});
