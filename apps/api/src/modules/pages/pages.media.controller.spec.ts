import type { Request, Response } from 'express';
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
