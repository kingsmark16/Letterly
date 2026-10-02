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
import {
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
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import {
  PageAnalyticsNotFoundError,
  PageAnalyticsService,
} from './application/page-analytics.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './application/page-journey-metrics';
import { PageJourneySubmissionService } from './application/page-journey-submissions.service';
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
  PageNotFoundError,
  PageService,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from './application/page.service';

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
}
