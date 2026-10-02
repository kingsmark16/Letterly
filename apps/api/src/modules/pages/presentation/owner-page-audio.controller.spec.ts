import type { Response } from 'express';
import { PassThrough, Readable } from 'node:stream';
jest.mock('../../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));
import { ApiException } from '../../../infrastructure/http/api-exception';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';
import {
  AudioStorageError,
  PageAudioService,
} from '../application/page-audio.service';
import { OwnerPageAudioController } from './owner-page-audio.controller';
import { pipeAudioResponse } from './page-audio-http';
const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const imageId = '11111111-1111-4111-8111-111111111111';
const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as unknown as AuthenticatedRequest;
function failingAudioBody(): Readable {
  let pushed = false;
  const body = new Readable({
    read() {
      if (pushed) return;
      pushed = true;
      this.push(Buffer.from('audio'));
      queueMicrotask(() => this.destroy(new Error('R2 stream failed')));
    },
  });
  return body;
}

describe('Owner audio controller', () => {
  it('destroys an already started response without attempting a JSON error', async () => {
    const response = new PassThrough();
    Object.defineProperty(response, 'headersSent', { value: true });
    const destroy = jest.spyOn(response, 'destroy');
    await expect(
      pipeAudioResponse(failingAudioBody(), response as unknown as Response),
    ).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledWith(expect.any(Error));
    expect(response.destroyed).toBe(true);
  });

  it('raises a safe storage error when streaming fails before headers are sent', async () => {
    const response = new PassThrough();
    Object.defineProperty(response, 'headersSent', { value: false });
    await expect(
      pipeAudioResponse(failingAudioBody(), response as unknown as Response),
    ).rejects.toBeInstanceOf(AudioStorageError);
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
    const controller = new OwnerPageAudioController(audioService, undefined, {
      consumeCreatorAudioUpload,
    } as unknown as RateLimitService);

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

  it('AC-6 retries an owner audio upload with a fresh upload record', async () => {
    const retryUpload = jest.fn().mockResolvedValue({
      audioId: '22222222-2222-4222-8222-222222222222',
      uploadUrl: 'https://uploads.example.test/retry-audio',
      requiredHeaders: {
        contentType: 'audio/mpeg',
        sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      },
      uploadExpiresAt: '2026-08-11T01:00:00.000Z',
      state: 'UPLOADING',
    });
    const consumeCreatorAudioUpload = jest.fn();
    const controller = new OwnerPageAudioController(
      { retryUpload } as unknown as PageAudioService,
      undefined,
      { consumeCreatorAudioUpload } as unknown as RateLimitService,
    );

    await expect(
      controller.retryAudioUpload(
        ownerRequest,
        { pageId, audioId: imageId },
        {
          contentType: 'audio/mpeg',
          byteSize: 1024,
          sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
          title: 'Our song',
          rightsConfirmed: true,
        },
      ),
    ).resolves.toMatchObject({
      audioId: '22222222-2222-4222-8222-222222222222',
      state: 'UPLOADING',
    });

    expect(consumeCreatorAudioUpload).toHaveBeenCalledWith(creatorId);
    expect(retryUpload).toHaveBeenCalledWith(
      expect.objectContaining({ creatorId, pageId, audioId: imageId }),
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
    const controller = new OwnerPageAudioController(
      audioService,
      undefined,
      undefined,
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

  it('maps an owner audio source failure after streaming starts', async () => {
    const getOwnerAudio = jest.fn().mockResolvedValue({
      body: failingAudioBody(),
      contentType: 'audio/mpeg',
      contentLength: 5,
      contentRange: null,
      totalLength: 5,
    });
    const controller = new OwnerPageAudioController(
      { getOwnerAudio } as unknown as PageAudioService,
      undefined,
      undefined,
    );
    const response = Object.assign(new PassThrough(), {
      setHeader: jest.fn(),
      status: jest.fn(),
    });
    response.status.mockReturnValue(response);

    const error = await controller
      .getOwnerAudio(
        { ...ownerRequest, headers: {} } as unknown as AuthenticatedRequest,
        { pageId },
        response as unknown as Response,
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 503,
      code: 'STORAGE_UNAVAILABLE',
    });
  });
});
