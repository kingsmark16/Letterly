import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import {
  pageAudioLinkResponseSchema,
  publicPageSlugParamsSchema,
} from '@letterly/contracts/pages';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import {
  ApiFileResponse,
  ApiOperationSummary,
  ApiVisitorCookie,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import { readUnlockToken } from '../../../infrastructure/http/unlock-cookie';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import { PageAudioLinkService } from '../application/page-audio-link.service';
import {
  AudioPageNotFoundError,
  AudioStorageError,
  PageAudioService,
} from '../application/page-audio.service';
import {
  MediaStorageError,
  PageMediaService,
} from '../application/page-media.service';
import { PagePasswordService } from '../application/page-password.service';
import { mapAudioError } from './page-audio-error.mapper';
import { parseAudioRange, pipeAudioResponse } from './page-audio-http';
import { mapMediaError } from './page-media-error.mapper';

const publicImageParamsSchema = publicPageSlugParamsSchema.extend({
  imageId: z.string().uuid(),
});
const publicAudioParamsSchema = publicPageSlugParamsSchema;

@ApiTags('Public Page Media')
@Controller('api/v1/public/pages')
export class PublicPageMediaController {
  constructor(
    @Optional()
    @Inject(PageMediaService)
    private readonly pageMediaService?: PageMediaService,
    @Optional()
    @Inject(PageAudioService)
    private readonly pageAudioService?: PageAudioService,
    @Optional()
    @Inject(PageAudioLinkService)
    private readonly pageAudioLinkService?: PageAudioLinkService,
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
  ) {}

  @Get(':slug/audio')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperationSummary('Stream audio for a public page')
  @ApiZodParams(publicAudioParamsSchema)
  @ApiHeader({
    name: 'Range',
    required: false,
    description: 'Optional byte range for audio playback.',
  })
  @ApiVisitorCookie(
    'Password protected pages require their page scoped letterly_unlock cookie.',
  )
  @ApiFileResponse(['audio/mpeg', 'audio/mp4'], 'The audio media stream.', 200)
  @ApiFileResponse(
    ['audio/mpeg', 'audio/mp4'],
    'A partial audio media stream.',
    206,
  )
  @ApiZodErrorResponses(400, 401, 404, 416, 422, 429, 500, 503)
  async getAudio(
    @Param(new ZodValidationPipe(publicAudioParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (!this.pageAudioService) throw new AudioStorageError();
      await this.rateLimitService?.consumePublicMedia(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      if (this.pagePasswordService) {
        const protection = await this.pagePasswordService.findPublicProtection(
          params.slug,
        );
        if (
          protection &&
          !(await this.pagePasswordService.verifyUnlockToken(
            protection.pageId,
            protection.passwordVersion,
            readUnlockToken(request, protection.pageId),
          ))
        ) {
          throw new ApiException({
            statusCode: HttpStatus.UNAUTHORIZED,
            code: 'PAGE_LOCKED',
            message: 'Unlock this letter before playing its audio',
          });
        }
      }
      const range = parseAudioRange(request.headers.range);
      const stream = await this.pageAudioService.getPublicAudio({
        slug: params.slug,
        ...range,
      });
      response.setHeader('Content-Type', stream.contentType ?? 'audio/mpeg');
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Content-Disposition', 'inline');
      if (stream.contentLength !== undefined) {
        response.setHeader('Content-Length', stream.contentLength);
      }
      if (stream.contentRange) {
        response.status(HttpStatus.PARTIAL_CONTENT);
        response.setHeader('Content-Range', stream.contentRange);
      }
      await pipeAudioResponse(stream.body, response);
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Get(':slug/audio/metadata')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperationSummary('Get public audio link metadata')
  @ApiZodParams(publicAudioParamsSchema)
  @ApiVisitorCookie(
    'Password protected pages require their page scoped letterly_unlock cookie.',
  )
  @ApiZodResponse(
    pageAudioLinkResponseSchema,
    200,
    'The public audio link metadata.',
  )
  @ApiZodErrorResponses(401, 404, 422, 429, 500, 503)
  async getPublicAudioMetadata(
    @Param(new ZodValidationPipe(publicAudioParamsSchema))
    params: { slug: string },
    @Req() request: Request,
  ) {
    try {
      if (!this.pageAudioLinkService) throw new AudioStorageError();
      await this.rateLimitService?.consumePublicMedia(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      if (this.pagePasswordService) {
        const protection = await this.pagePasswordService.findPublicProtection(
          params.slug,
        );
        if (
          protection &&
          !(await this.pagePasswordService.verifyUnlockToken(
            protection.pageId,
            protection.passwordVersion,
            readUnlockToken(request, protection.pageId),
          ))
        ) {
          throw new ApiException({
            statusCode: HttpStatus.UNAUTHORIZED,
            code: 'PAGE_LOCKED',
            message: 'Unlock this letter before playing its audio',
          });
        }
      }
      const audioLink = await this.pageAudioLinkService.getPublicLink({
        slug: params.slug,
      });
      if (!audioLink) throw new AudioPageNotFoundError();
      return pageAudioLinkResponseSchema.parse({ audioLink });
    } catch (error: unknown) {
      throw mapAudioError(error);
    }
  }

  @Get(':slug/images/:imageId')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @ApiOperationSummary('Get image media for a public page')
  @ApiZodParams(publicImageParamsSchema)
  @ApiVisitorCookie(
    'Password protected pages require their page scoped letterly_unlock cookie.',
  )
  @ApiFileResponse('image/webp', 'The processed public image media.')
  @ApiZodErrorResponses(401, 404, 422, 429, 500, 503)
  async getImage(
    @Param(new ZodValidationPipe(publicImageParamsSchema))
    params: { slug: string; imageId: string },
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      await this.rateLimitService?.consumePublicMedia(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      if (this.pagePasswordService) {
        const protection = await this.pagePasswordService.findPublicProtection(
          params.slug,
        );
        if (protection) {
          const unlocked = await this.pagePasswordService.verifyUnlockToken(
            protection.pageId,
            protection.passwordVersion,
            readUnlockToken(request, protection.pageId),
          );
          if (!unlocked) {
            throw new ApiException({
              statusCode: HttpStatus.UNAUTHORIZED,
              code: 'PAGE_LOCKED',
              message: 'Unlock this letter before viewing its images',
            });
          }
        }
      }
      const body = await this.pageMediaService.getPublicMedia({
        slug: params.slug,
        imageId: params.imageId,
      });
      response.setHeader('Content-Type', 'image/webp');
      response.send(body);
    } catch (error: unknown) {
      throw mapMediaError(error, true);
    }
  }
}
