import { mapSubmissionError } from './presentation/page-submission-error.mapper';
import { mapPasswordError } from './presentation/page-password-error.mapper';
import {
  pageViewDurationRequestSchema,
  pageViewStartResponseSchema,
  type PageViewDurationRequest,
} from '@letterly/contracts/analytics';
import {
  publicPageJourneyMetricEventSchema,
  type PublicPageJourneyMetricEvent,
} from '@letterly/contracts/metrics';
import {
  pageJourneyPublicPageProjectionSchema,
  type PageJourneyPublicPageProjection,
} from '@letterly/contracts/page-journeys';
import type {
  AudioUploadRequest,
  ImageIdParams,
  ImageUploadRequest,
  PageIdParams,
} from '@letterly/contracts/pages';
import {
  audioIdParamsSchema,
  audioLinkRequestSchema,
  audioUploadRequestSchema,
  audioUploadResponseSchema,
  imageIdParamsSchema,
  imageOperationResponseSchema,
  imageUploadRequestSchema,
  imageUploadResponseSchema,
  ownerPageAudioSchema,
  ownerPageImageSchema,
  pageAudioLinkResponseSchema,
  pageIdParamsSchema,
  publicPageSlugParamsSchema,
  publicPageUnlockRequestSchema,
  publicPageUnlockResponseSchema,
  publicSecretLetterResponseSchema,
  type PublicPageUnlockRequest,
  type PublicSecretLetterProjection,
} from '@letterly/contracts/pages';
import {
  publicReportRequestSchema,
  publicReportResponseSchema,
  type PublicReportRequest,
} from '@letterly/contracts/reports';
import {
  publicSubmissionRequestSchema,
  visitorSubmissionResponseSchema,
  type PublicSubmissionRequest,
} from '@letterly/contracts/submissions';
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
import type { Request, Response } from 'express';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { ApiException } from '../../infrastructure/http/api-exception';
import {
  BROWSER_COOKIE_NAME,
  browserCookieOptions,
  createBrowserToken,
  hashBrowserToken,
  readBrowserToken,
} from '../../infrastructure/http/browser-token';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../infrastructure/http/rate-limit.service';
import {
  readUnlockToken,
  unlockCookieName,
  unlockCookieOptions,
} from '../../infrastructure/http/unlock-cookie';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import {
  PageAnalyticsNotFoundError,
  PageAnalyticsService,
} from './application/page-analytics.service';
import {
  AudioLinkCreationDisabledError,
  AudioLinkLookupUnavailableError,
  AudioLinkUnavailableError,
  PageAudioLinkService,
  YOUTUBE_LINKS_ENABLED,
} from './application/page-audio-link.service';
import {
  AudioCapabilityUnavailableError,
  AudioNotReadyError,
  AudioPageNotFoundError,
  AudioProcessingError,
  AudioRangeNotSatisfiableError,
  AudioRetryUnavailableError,
  AudioSourceOccupiedError,
  AudioStorageError,
  AudioUploadActiveError,
  PageAudioService,
} from './application/page-audio.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './application/page-journey-metrics';
import { PageJourneySubmissionService } from './application/page-journey-submissions.service';
import {
  MediaImageAttachedError,
  MediaImageLimitError,
  MediaImageNotReadyError,
  MediaImageProcessingError,
  MediaImageProcessingFailedError,
  MediaImageRetryUnavailableError,
  MediaPageNotFoundError,
  MediaRateLimitError,
  MediaStorageError,
  PageMediaService,
} from './application/page-media.service';
import {
  PagePasswordConfigurationError,
  PagePasswordNotFoundError,
  PagePasswordService,
} from './application/page-password.service';
import { PageReportsService } from './application/page-reports.service';
import {
  PageSubmissionsService,
  SubmissionPageNotFoundError,
} from './application/page-submissions.service';
import {
  APP_ORIGIN,
  PageNotFoundError,
  PageService,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from './application/page.service';
import { YouTubeLinkInvalidError } from './application/youtube-url';

const publicImageParamsSchema = publicPageSlugParamsSchema.extend({
  imageId: z.string().uuid(),
});
const publicAudioParamsSchema = publicPageSlugParamsSchema;

function parseAudioRange(
  rangeHeader: string | undefined,
): { start: number; end?: number } | undefined {
  if (!rangeHeader) return undefined;

  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) {
    throw new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'BAD_REQUEST',
      message: 'The requested audio range is not supported',
    });
  }

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (
    !Number.isSafeInteger(start) ||
    (end !== undefined && (!Number.isSafeInteger(end) || end < start))
  ) {
    throw new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'BAD_REQUEST',
      message: 'The requested audio range is not supported',
    });
  }

  return { start, end };
}

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class PagesController {
  constructor(
    @Inject(PageService) private readonly pageService: PageService,
    @Optional()
    @Inject(APP_ORIGIN)
    private readonly appOrigin = 'http://localhost:3000',
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(PageMediaService)
    private readonly pageMediaService?: PageMediaService,
    @Optional()
    @Inject(PageJourneySubmissionService)
    private readonly pageJourneySubmissionService?: PageJourneySubmissionService,
    @Optional()
    @Inject(PageAudioService)
    private readonly pageAudioService?: PageAudioService,
    @Optional()
    @Inject(PageAudioLinkService)
    private readonly pageAudioLinkService?: PageAudioLinkService,
    @Optional()
    @Inject(YOUTUBE_LINKS_ENABLED)
    private readonly youtubeLinksEnabled = false,
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

  @Post(':pageId/images/uploads')
  @HttpCode(HttpStatus.OK)
  async prepareImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(imageUploadRequestSchema))
    body: ImageUploadRequest,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      await this.rateLimitService?.consumeCreatorImageUpload(
        request.authSession.user.id,
      );
      return imageUploadResponseSchema.parse(
        await this.pageMediaService.prepareUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          ...body,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Get(':pageId/images')
  @Header('Cache-Control', 'private, no-store')
  async listImages(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return z.array(ownerPageImageSchema).parse(
        await this.pageMediaService.listOwnerImages({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Post(':pageId/images/:imageId/complete')
  @HttpCode(HttpStatus.OK)
  async completeImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return imageOperationResponseSchema.parse(
        await this.pageMediaService.completeUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          imageId: params.imageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Post(':pageId/images/:imageId/retry')
  @HttpCode(HttpStatus.OK)
  async retryImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return imageUploadResponseSchema.parse(
        await this.pageMediaService.retryUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          imageId: params.imageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Delete(':pageId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ): Promise<void> {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      await this.pageMediaService.removeUpload({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        imageId: params.imageId,
      });
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Get(':pageId/images/:imageId')
  @Header('Cache-Control', 'no-store')
  async getOwnerImage(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      const body = await this.pageMediaService.getOwnerMedia({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        imageId: params.imageId,
      });
      response.setHeader('Content-Type', 'image/webp');
      response.setHeader('Cache-Control', 'no-store');
      response.send(body);
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }
}

@Controller('api/v1/public/pages')
export class PublicPagesController {
  constructor(
    @Inject(PageService) private readonly pageService: PageService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
    @Optional()
    @Inject(PageMediaService)
    private readonly pageMediaService?: PageMediaService,
    @Optional()
    @Inject(PageSubmissionsService)
    private readonly pageSubmissionsService?: PageSubmissionsService,
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(PageReportsService)
    private readonly pageReportsService?: PageReportsService,
    @Optional()
    @Inject(PageJourneySubmissionService)
    private readonly pageJourneySubmissionService?: PageJourneySubmissionService,
    @Optional()
    @Inject(PAGE_JOURNEY_METRICS)
    private readonly pageJourneyMetrics?: PageJourneyMetrics,
    @Optional()
    @Inject(PageAudioService)
    private readonly pageAudioService?: PageAudioService,
    @Optional()
    @Inject(PageAudioLinkService)
    private readonly pageAudioLinkService?: PageAudioLinkService,
    @Optional()
    @Inject(PageAnalyticsService)
    private readonly pageAnalyticsService?: PageAnalyticsService,
  ) {}

  @Post(':slug/visit')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async recordVisit(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
  ): Promise<{ viewId: string }> {
    if (!this.pageAnalyticsService || !this.visitorIdentitySecret) {
      throw new ApiException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Visit service unavailable',
      });
    }
    const browserToken = readBrowserToken(request);
    if (!browserToken) {
      throw new ApiException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'COOKIE_REQUIRED',
        message: 'A browser cookie is required',
      });
    }
    try {
      await this.rateLimitService?.consumePublic(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      const projection = await this.pageService.getPublicPage(
        params.slug,
        (pageId) => readUnlockToken(request, pageId),
      );
      if ('state' in projection) throw new PageAnalyticsNotFoundError();
      const pageId = await this.pageAnalyticsService.findPublicPageId(
        params.slug,
      );
      const viewId = await this.pageAnalyticsService.recordVisit(
        pageId,
        hashBrowserToken(pageId, browserToken, this.visitorIdentitySecret),
      );
      return pageViewStartResponseSchema.parse({ viewId });
    } catch (error: unknown) {
      if (
        error instanceof PageAnalyticsNotFoundError ||
        error instanceof PageNotFoundError
      ) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'This letter is not available',
        });
      }
      if (error instanceof RateLimitExceededError) {
        throw new ApiException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { retryAfterSeconds: error.retryAfterSeconds },
        });
      }
      if (error instanceof RateLimitUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'RATE_LIMIT_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      if (
        error instanceof PublicPageReadUnavailableError ||
        error instanceof TemplateDefinitionUnavailableError
      ) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      throw error;
    }
  }

  @Post(':slug/visit/time')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  async recordVisitTime(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Body(new ZodValidationPipe(pageViewDurationRequestSchema))
    body: PageViewDurationRequest,
    @Req() request: Request,
  ): Promise<void> {
    if (!this.pageAnalyticsService || !this.visitorIdentitySecret) {
      throw new ApiException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Visit service unavailable',
      });
    }
    const browserToken = readBrowserToken(request);
    if (!browserToken) {
      throw new ApiException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        code: 'COOKIE_REQUIRED',
        message: 'A browser cookie is required',
      });
    }
    try {
      await this.rateLimitService?.consumePublic(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      const projection = await this.pageService.getPublicPage(
        params.slug,
        (pageId) => readUnlockToken(request, pageId),
      );
      if ('state' in projection) throw new PageAnalyticsNotFoundError();
      const pageId = await this.pageAnalyticsService.findPublicPageId(
        params.slug,
      );
      await this.pageAnalyticsService.recordDuration(
        pageId,
        hashBrowserToken(pageId, browserToken, this.visitorIdentitySecret),
        body.viewId,
        body.activeSeconds,
      );
    } catch (error: unknown) {
      if (
        error instanceof PageAnalyticsNotFoundError ||
        error instanceof PageNotFoundError
      ) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'This letter is not available',
        });
      }
      if (error instanceof RateLimitExceededError) {
        throw new ApiException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { retryAfterSeconds: error.retryAfterSeconds },
        });
      }
      if (error instanceof RateLimitUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'RATE_LIMIT_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      if (
        error instanceof PublicPageReadUnavailableError ||
        error instanceof TemplateDefinitionUnavailableError
      ) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      throw error;
    }
  }

  @Post(':slug/metrics')
  @HttpCode(HttpStatus.NO_CONTENT)
  async recordJourneyMetric(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Body(new ZodValidationPipe(publicPageJourneyMetricEventSchema))
    body: PublicPageJourneyMetricEvent,
  ): Promise<void> {
    try {
      if (!this.pageJourneyMetrics) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Metrics service unavailable',
        });
      }
      await this.rateLimitService?.consumePublic(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );

      const projection = await this.pageService.getPublicPage(
        params.slug,
        (pageId) => readUnlockToken(request, pageId),
      );
      if ('state' in projection) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'This letter is not available',
        });
      }
      if (
        body.templateKey !== 'choose-your-heart' ||
        projection.template.key !== 'choose-your-heart'
      ) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'UNSUPPORTED_CAPABILITY',
          message: 'This template does not support journey metrics',
        });
      }
      this.pageJourneyMetrics.record(body);
    } catch (error: unknown) {
      if (error instanceof RateLimitExceededError) {
        throw new ApiException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { retryAfterSeconds: error.retryAfterSeconds },
        });
      }
      if (error instanceof RateLimitUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'RATE_LIMIT_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'This letter is not available',
        });
      }
      if (error instanceof PublicPageReadUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }
      throw error;
    }
  }

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  async get(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PublicSecretLetterProjection | PageJourneyPublicPageProjection> {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!readBrowserToken(request) && typeof response.cookie === 'function') {
      response.cookie(
        BROWSER_COOKIE_NAME,
        createBrowserToken(),
        browserCookieOptions(process.env.NODE_ENV === 'production'),
      );
    }

    try {
      await this.rateLimitService?.consumePublic(
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      const projection = await this.pageService.getPublicPage(
        params.slug,
        (pageId) => readUnlockToken(request, pageId),
      );
      if ('state' in projection) {
        return projection;
      }
      if (
        'template' in projection &&
        projection.template.key === 'choose-your-heart'
      ) {
        return pageJourneyPublicPageProjectionSchema.parse(projection);
      }
      return 'response' in projection && projection.response !== undefined
        ? publicSecretLetterResponseSchema.parse(projection)
        : projection;
    } catch (error: unknown) {
      if (error instanceof RateLimitExceededError) {
        throw new ApiException({
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          details: { retryAfterSeconds: error.retryAfterSeconds },
        });
      }

      if (error instanceof RateLimitUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'RATE_LIMIT_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }

      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'This letter is not available',
        });
      }

      if (error instanceof PublicPageReadUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }

      if (error instanceof TemplateDefinitionUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
          message: 'Template definition unavailable',
        });
      }

      throw error;
    }
  }

  @Post(':slug/unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodValidationPipe(publicPageUnlockRequestSchema))
    body: PublicPageUnlockRequest,
  ) {
    try {
      if (!this.pagePasswordService) {
        throw new PagePasswordConfigurationError();
      }

      const protection = await this.pagePasswordService.findPublicProtection(
        params.slug,
      );
      if (!protection) {
        throw new PagePasswordNotFoundError();
      }

      await this.rateLimitService?.consumeVisitorUnlock(
        protection.pageId,
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      const result = await this.pagePasswordService.unlock(
        params.slug,
        body.password,
      );
      response.cookie(
        unlockCookieName(result.pageId),
        result.token,
        unlockCookieOptions(process.env.NODE_ENV === 'production'),
      );
      return publicPageUnlockResponseSchema.parse({ unlocked: true });
    } catch (error: unknown) {
      throw mapPasswordError(error);
    }
  }

  @Post(':slug/reports')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  async report(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Body(new ZodValidationPipe(publicReportRequestSchema))
    body: PublicReportRequest,
  ) {
    try {
      if (!this.pageReportsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Report service unavailable',
        });
      }
      const pageId = await this.pageReportsService.findPublicPageScope(
        params.slug,
      );
      const browserToken = readBrowserToken(request);
      const identity =
        browserToken && this.visitorIdentitySecret
          ? hashBrowserToken(pageId, browserToken, this.visitorIdentitySecret)
          : resolveVisitorIdentity(request, this.visitorIdentitySecret);
      await this.rateLimitService?.consumePublicReport(pageId, identity);
      return publicReportResponseSchema.parse(
        await this.pageReportsService.create({
          slug: params.slug,
          reason: body.reason,
          message: body.message,
        }),
      );
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }

  @Post(':slug/submissions')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  async submit(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Body(new ZodValidationPipe(publicSubmissionRequestSchema))
    body: PublicSubmissionRequest,
  ) {
    try {
      if (
        (!this.pageSubmissionsService && !this.pageJourneySubmissionService) ||
        !this.visitorIdentitySecret
      ) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      const browserToken = readBrowserToken(request);
      if (!browserToken) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'COOKIE_REQUIRED',
          message: 'A browser cookie is required to submit a response',
        });
      }

      const normalizedSlug = params.slug.trim().toLowerCase();
      const isJourneySubmission = 'publishedGraphVersion' in body;
      const rawIdempotencyHeader =
        typeof request.header === 'function'
          ? request.header('Idempotency-Key')
          : request.headers['idempotency-key'];
      const headerIdempotencyKey = (
        Array.isArray(rawIdempotencyHeader)
          ? rawIdempotencyHeader[0]
          : rawIdempotencyHeader
      )?.trim();
      if (isJourneySubmission && !headerIdempotencyKey) {
        throw new ApiException({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'BAD_REQUEST',
          message: 'An Idempotency-Key header is required',
        });
      }
      const idempotencyKey = isJourneySubmission
        ? headerIdempotencyKey
        : body.idempotencyKey;
      const pageScope = isJourneySubmission
        ? await this.pageJourneySubmissionService?.findPublicPageScope(
            normalizedSlug,
          )
        : await this.pageSubmissionsService?.findPublicPageScope(
            normalizedSlug,
          );
      if (!pageScope) {
        throw new SubmissionPageNotFoundError();
      }
      let observedPasswordVersion: string | null | undefined;
      if (this.pagePasswordService) {
        const protection =
          await this.pagePasswordService.findPublicProtection(normalizedSlug);
        observedPasswordVersion = protection?.passwordVersion ?? null;
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
              message: 'Unlock this letter before submitting a response',
            });
          }
        }
      }
      const browserTokenHash = hashBrowserToken(
        pageScope,
        browserToken,
        this.visitorIdentitySecret,
      );
      await this.rateLimitService?.consumeVisitorSubmission(
        pageScope,
        browserTokenHash,
      );

      if (isJourneySubmission) {
        if (!this.pageJourneySubmissionService) {
          throw new ApiException({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Journey response service unavailable',
          });
        }
        return visitorSubmissionResponseSchema.parse(
          await this.pageJourneySubmissionService.submit({
            slug: normalizedSlug,
            browserTokenHash,
            idempotencyKey: idempotencyKey as string,
            publishedGraphVersion: body.publishedGraphVersion,
            answers: body.answers,
            outcomeKey: body.outcomeKey,
            visitorMessage: body.visitorMessage,
            observedPasswordVersion,
          }),
        );
      }

      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }
      return visitorSubmissionResponseSchema.parse(
        await this.pageSubmissionsService.submit({
          slug: normalizedSlug,
          browserTokenHash,
          idempotencyKey: body.idempotencyKey,
          answers: body.answers,
          visitorMessage: body.visitorMessage
            ? { message: body.visitorMessage }
            : undefined,
          observedPasswordVersion,
        }),
      );
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }

  @Get(':slug/audio')
  @Header('Cache-Control', 'private, no-store')
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

function mapMediaError(error: unknown, publicRead = false): unknown {
  if (error instanceof ApiException) {
    return error;
  }
  if (error instanceof RateLimitExceededError) {
    return new ApiException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: { retryAfterSeconds: error.retryAfterSeconds },
    });
  }

  if (error instanceof RateLimitUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }

  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }

  if (error instanceof MediaPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: publicRead ? 'This letter is not available' : 'Page not found',
    });
  }

  if (error instanceof MediaImageLimitError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_LIMIT_REACHED',
      message: 'The letter image limit has been reached',
    });
  }

  if (error instanceof MediaImageProcessingError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_PROCESSING',
      message: 'The image is already processing',
    });
  }

  if (error instanceof MediaImageNotReadyError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_NOT_READY',
      message: 'The image is not ready',
    });
  }

  if (error instanceof MediaImageAttachedError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_ATTACHED',
      message: 'Attached images are changed through page save',
    });
  }

  if (error instanceof MediaImageRetryUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_RETRY_UNAVAILABLE',
      message: 'The image cannot be retried',
    });
  }

  if (error instanceof MediaImageProcessingFailedError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_PROCESSING_FAILED',
      message: 'The image could not be processed',
    });
  }

  if (error instanceof MediaRateLimitError) {
    return new ApiException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many image operations',
    });
  }

  if (error instanceof MediaStorageError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Image storage is temporarily unavailable',
    });
  }

  if (publicRead) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }

  return error;
}

async function pipeAudioResponse(
  body: NodeJS.ReadableStream,
  response: Response,
): Promise<void> {
  try {
    await pipeline(body, response);
  } catch (error: unknown) {
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : undefined);
      return;
    }
    throw new AudioStorageError();
  }
}

function mapAudioError(error: unknown): unknown {
  if (error instanceof ApiException) return error;
  if (error instanceof RateLimitExceededError) {
    return new ApiException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: { retryAfterSeconds: error.retryAfterSeconds },
    });
  }
  if (error instanceof RateLimitUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }
  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }
  if (error instanceof AudioPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof AudioCapabilityUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support audio',
    });
  }
  if (error instanceof YouTubeLinkInvalidError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_LINK_INVALID',
      message: 'Paste a valid YouTube video link',
    });
  }
  if (error instanceof AudioLinkUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_LINK_UNAVAILABLE',
      message: 'This video is unavailable or cannot be embedded',
    });
  }
  if (error instanceof AudioLinkLookupUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'AUDIO_LINK_LOOKUP_UNAVAILABLE',
      message: 'YouTube could not be checked right now. Retry the link.',
    });
  }
  if (error instanceof AudioLinkCreationDisabledError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'AUDIO_LINKS_DISABLED',
      message: 'YouTube links are temporarily unavailable',
    });
  }
  if (error instanceof AudioSourceOccupiedError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_SOURCE_OCCUPIED',
      message: 'Remove the current song before adding another one',
    });
  }
  if (
    error instanceof AudioUploadActiveError ||
    error instanceof AudioProcessingError
  ) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_PROCESSING',
      message: 'Audio upload is still processing',
    });
  }
  if (error instanceof AudioNotReadyError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_VERIFICATION_FAILED',
      message: 'The audio file could not be verified',
    });
  }
  if (error instanceof AudioRetryUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_RETRY_UNAVAILABLE',
      message: 'This audio upload cannot be retried',
    });
  }
  if (error instanceof AudioRangeNotSatisfiableError) {
    return new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'AUDIO_RANGE_NOT_SATISFIABLE',
      message: 'The requested audio range is not satisfiable',
    });
  }
  if (error instanceof AudioStorageError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Media storage is temporarily unavailable',
    });
  }
  return error;
}
