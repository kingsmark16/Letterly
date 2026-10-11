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
import { publicPageSlugParamsSchema } from '@letterly/contracts/pages';
import {
  publicReportRequestSchema,
  publicReportResponseSchema,
  type PublicReportRequest,
} from '@letterly/contracts/reports';
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
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
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import { PageReportsService } from '../application/page-reports.service';
import { mapSubmissionError } from './page-submission-error.mapper';

@ApiTags('Public Pages')
@Controller('api/v1/public/pages')
export class PublicPageReportsController {
  constructor(
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
    @Optional()
    @Inject(PageReportsService)
    private readonly pageReportsService?: PageReportsService,
  ) {}

  @Post(':slug/reports')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @Header('X-Robots-Tag', 'noindex, nofollow, noarchive')
  @ApiOperationSummary('Report a public page')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiZodBody(publicReportRequestSchema)
  @ApiVisitorCookie('Optional letterly_browser visitor cookie.')
  @ApiZodResponse(
    publicReportResponseSchema,
    201,
    'The report was accepted for review.',
  )
  @ApiZodErrorResponses(400, 404, 413, 422, 429, 500, 503)
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
