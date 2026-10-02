import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  audioIdParamsSchema,
  audioLinkRequestSchema,
  audioUploadRequestSchema,
  audioUploadResponseSchema,
  ownerPageAudioSchema,
  pageAudioLinkResponseSchema,
  pageIdParamsSchema,
  type AudioUploadRequest,
  type PageIdParams,
} from '@letterly/contracts/pages';
import type { Response } from 'express';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import { PageAudioLinkService } from '../application/page-audio-link.service';
import {
  AudioPageNotFoundError,
  AudioStorageError,
  PageAudioService,
} from '../application/page-audio.service';
import { mapAudioError } from './page-audio-error.mapper';
import { parseAudioRange, pipeAudioResponse } from './page-audio-http';

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageAudioController {
  constructor(
    @Optional()
    @Inject(PageAudioService)
    private readonly pageAudioService?: PageAudioService,
    @Optional()
    @Inject(PageAudioLinkService)
    private readonly pageAudioLinkService?: PageAudioLinkService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

  @Post(':pageId/audio/uploads')
  @HttpCode(HttpStatus.OK)
  async prepareAudioUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
    @Body(new ZodValidationPipe(audioUploadRequestSchema))
    body: AudioUploadRequest,
  ) {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      await this.rateLimitService?.consumeCreatorAudioUpload(
        request.authSession.user.id,
      );
      return audioUploadResponseSchema.parse(
        await this.pageAudioService.prepareUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          contentType: body.contentType,
          title: body.title,
          byteSize: body.byteSize,
          sha256: body.sha256,
          durationMilliseconds: body.durationMilliseconds,
        }),
      );
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Post(':pageId/audio/links')
  @HttpCode(HttpStatus.OK)
  async addAudioLink(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
    @Body(new ZodValidationPipe(audioLinkRequestSchema)) body: { url: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      if (!this.pageAudioLinkService) throw new AudioStorageError();
      await this.rateLimitService?.consumeCreatorAudioUpload(
        request.authSession.user.id,
      );
      const result = await this.pageAudioLinkService.addOwnerLink({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        url: body.url,
      });
      response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
      return pageAudioLinkResponseSchema.parse({
        audioLink: result.audioLink,
      });
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Get(':pageId/audio/metadata')
  @Header('Cache-Control', 'private, no-store')
  async getOwnerAudioMetadata(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
  ) {
    try {
      if (!this.pageAudioLinkService) throw new AudioStorageError();
      await this.rateLimitService?.consumeCreatorAudioUpload(
        request.authSession.user.id,
      );
      const audioLink = await this.pageAudioLinkService.getOwnerLink({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
      if (!audioLink) throw new AudioPageNotFoundError();
      return pageAudioLinkResponseSchema.parse({ audioLink });
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Post(':pageId/audio/:audioId/complete')
  @HttpCode(HttpStatus.OK)
  async completeAudioUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(audioIdParamsSchema))
    params: { pageId: string; audioId: string },
  ) {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      const audio = await this.pageAudioService.completeUpload({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        audioId: params.audioId,
      });
      return ownerPageAudioSchema.parse({
        audioId: audio.id,
        state: audio.state,
        mediaUrl: null,
        title: audio.displayTitle,
        sourceMimeType: audio.sourceMimeType,
        sourceByteSize: audio.sourceByteSize,
        durationMilliseconds: audio.durationMilliseconds,
        failureCode: audio.failureCode,
      });
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Post(':pageId/audio/:audioId/retry')
  @HttpCode(HttpStatus.OK)
  async retryAudioUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(audioIdParamsSchema))
    params: { pageId: string; audioId: string },
    @Body(new ZodValidationPipe(audioUploadRequestSchema))
    body: AudioUploadRequest,
  ) {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      await this.rateLimitService?.consumeCreatorAudioUpload(
        request.authSession.user.id,
      );
      return audioUploadResponseSchema.parse(
        await this.pageAudioService.retryUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          audioId: params.audioId,
          contentType: body.contentType,
          title: body.title,
          byteSize: body.byteSize,
          sha256: body.sha256,
          durationMilliseconds: body.durationMilliseconds,
        }),
      );
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Delete(':pageId/audio')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAudio(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
  ): Promise<void> {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      await this.pageAudioService.removeCurrentAudio({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Get(':pageId/audio')
  @Header('Cache-Control', 'private, no-store')
  async getOwnerAudio(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      const range = parseAudioRange(request.headers.range);
      const stream = await this.pageAudioService.getOwnerAudio({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        ...range,
      });
      response.setHeader('Content-Type', stream.contentType ?? 'audio/mpeg');
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Disposition', 'inline');
      if (stream.contentLength !== undefined)
        response.setHeader('Content-Length', stream.contentLength);
      if (stream.contentRange) {
        response.status(HttpStatus.PARTIAL_CONTENT);
        response.setHeader('Content-Range', stream.contentRange);
      }
      await pipeAudioResponse(stream.body, response);
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }
}
