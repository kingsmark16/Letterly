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
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import {
  ApiBetterAuthSession,
  ApiFileResponse,
  ApiNoContentResponse,
  ApiOperationSummary,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
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

@ApiTags('Owner Page Media')
@ApiBetterAuthSession()
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
  @ApiOperationSummary('Prepare an audio upload for an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(audioUploadRequestSchema)
  @ApiZodResponse(
    audioUploadResponseSchema,
    200,
    'The signed audio upload instructions.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
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
  @ApiOperationSummary('Attach a verified YouTube audio link')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(audioLinkRequestSchema)
  @ApiZodResponse(pageAudioLinkResponseSchema, 200, 'The existing audio link.')
  @ApiZodResponse(
    pageAudioLinkResponseSchema,
    201,
    'The newly attached audio link.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
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
  @ApiOperationSummary('Get metadata for an owned page audio link')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodResponse(
    pageAudioLinkResponseSchema,
    200,
    'The current audio link metadata.',
  )
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Complete audio upload processing')
  @ApiZodParams(audioIdParamsSchema)
  @ApiZodResponse(
    ownerPageAudioSchema,
    200,
    'The completed audio upload state.',
  )
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
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
  @ApiOperationSummary('Retry an audio upload')
  @ApiZodParams(audioIdParamsSchema)
  @ApiZodBody(audioUploadRequestSchema)
  @ApiZodResponse(
    audioUploadResponseSchema,
    200,
    'The refreshed signed upload instructions.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
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
  @ApiOperationSummary('Remove audio from an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiNoContentResponse('The page audio was removed.')
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Stream audio for an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'Optional byte range for audio playback.',
  })
  @ApiFileResponse(['audio/mpeg', 'audio/mp4'], 'The audio media stream.', 200)
  @ApiFileResponse(
    ['audio/mpeg', 'audio/mp4'],
    'A partial audio media stream.',
    206,
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 416, 429, 500, 503)
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
