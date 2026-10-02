import { mapSubmissionError } from './presentation/page-submission-error.mapper';
import { mapPasswordError } from './presentation/page-password-error.mapper';
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
  PagePasswordConfigurationError,
  PagePasswordNotFoundError,
  PagePasswordService,
} from './application/page-password.service';
import { PageReportsService } from './application/page-reports.service';
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
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(PageReportsService)
    private readonly pageReportsService?: PageReportsService,
  ) {}

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
}
