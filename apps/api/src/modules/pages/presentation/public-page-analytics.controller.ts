import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  pageViewDurationRequestSchema,
  pageViewStartResponseSchema,
  type PageViewDurationRequest,
} from '@letterly/contracts/analytics';
import {
  publicPageJourneyMetricEventSchema,
  type PublicPageJourneyMetricEvent,
} from '@letterly/contracts/metrics';
import { publicPageSlugParamsSchema } from '@letterly/contracts/pages';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  ApiNoContentResponse,
  ApiOperationSummary,
  ApiVisitorCookie,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  hashBrowserToken,
  readBrowserToken,
} from '../../../infrastructure/http/browser-token';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import { readUnlockToken } from '../../../infrastructure/http/unlock-cookie';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  PageAnalyticsNotFoundError,
  PageAnalyticsService,
} from '../application/page-analytics.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from '../application/page-journey-metrics';
import {
  PageNotFoundError,
  PageService,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from '../application/page.service';

@ApiTags('Public Page Activity')
@Controller('api/v1/public/pages')
export class PublicPageAnalyticsController {
  constructor(
    @Inject(PageService) private readonly pageService: PageService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
    @Optional()
    @Inject(PageAnalyticsService)
    private readonly pageAnalyticsService?: PageAnalyticsService,
    @Optional()
    @Inject(PAGE_JOURNEY_METRICS)
    private readonly pageJourneyMetrics?: PageJourneyMetrics,
  ) {}

  @Post(':slug/visit')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @ApiOperationSummary('Record a public page visit')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiVisitorCookie('Required letterly_browser visitor cookie.', true)
  @ApiZodResponse(pageViewStartResponseSchema, 200, 'The visit identifier.')
  @ApiZodErrorResponses(400, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Record active time for a public page visit')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiZodBody(pageViewDurationRequestSchema)
  @ApiVisitorCookie('Required letterly_browser visitor cookie.', true)
  @ApiNoContentResponse('Active time was recorded.')
  @ApiZodErrorResponses(400, 404, 413, 422, 429, 500, 503)
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
  @ApiOperationSummary('Record a Choose Your Heart journey metric')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiZodBody(publicPageJourneyMetricEventSchema)
  @ApiNoContentResponse('The journey metric was recorded.')
  @ApiZodErrorResponses(400, 404, 413, 422, 429, 500, 503)
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
}
