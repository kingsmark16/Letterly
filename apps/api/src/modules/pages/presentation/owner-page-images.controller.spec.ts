import type { Response } from 'express';
import type { ImageUploadRequest } from '@letterly/contracts/pages';
jest.mock('../../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { PageMediaService } from '../application/page-media.service';
import { OwnerPageImagesController } from './owner-page-images.controller';
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

describe('Owner image controller', () => {
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
    const controller = new OwnerPageImagesController(
      mediaService as unknown as PageMediaService,
      rateLimitService,
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

  it('AC-7 sends an owner image as binary response bytes', async () => {
    const mediaService = createMediaService();
    const body = Buffer.from('owner-webp');
    mediaService.getOwnerMedia.mockResolvedValue(body);
    const controller = new OwnerPageImagesController(
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
});
