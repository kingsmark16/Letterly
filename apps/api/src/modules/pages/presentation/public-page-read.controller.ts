import {
  pageJourneyPublicPageProjectionSchema,
  type PageJourneyPublicPageProjection,
} from '@letterly/contracts/page-journeys';
import {
  publicPageSlugParamsSchema,
  publicSecretLetterResponseSchema,
  type PublicSecretLetterProjection,
} from '@letterly/contracts/pages';
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
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  ApiOperationSummary,
  ApiVisitorCookie,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  BROWSER_COOKIE_NAME,
  browserCookieOptions,
  createBrowserToken,
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
  PageNotFoundError,
  PageService,
  PublicPageReadUnavailableError,
  TemplateDefinitionUnavailableError,
} from '../application/page.service';

const publicPageResponseSchema = z.union([
  publicSecretLetterResponseSchema,
  pageJourneyPublicPageProjectionSchema,
]);

@ApiTags('Public Pages')
@Controller('api/v1/public/pages')
export class PublicPageReadController {
  constructor(
    @Inject(PageService) private readonly pageService: PageService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
  ) {}

  @Get(':slug')
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @ApiOperationSummary('Read a public page by its slug')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiVisitorCookie(
    'Optional letterly_browser visitor cookie. Password protected pages also use the page scoped letterly_unlock cookie set by the unlock operation.',
  )
  @ApiZodResponse(
    publicPageResponseSchema,
    200,
    'A safe public page projection. Locked pages return metadata without private page content; a visitor cookie is set when needed.',
  )
  @ApiZodErrorResponses(400, 404, 422, 429, 500, 503)
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
}
