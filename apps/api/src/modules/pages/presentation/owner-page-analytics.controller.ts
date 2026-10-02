import {
  pageAnalyticsQuerySchema,
  pageAnalyticsSchema,
  type PageAnalyticsQuery,
} from '@letterly/contracts/analytics';
import {
  pageIdParamsSchema,
  type PageIdParams,
} from '@letterly/contracts/pages';
import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import {
  PageAnalyticsNotFoundError,
  PageAnalyticsService,
} from '../application/page-analytics.service';

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageAnalyticsController {
  constructor(
    @Optional()
    @Inject(PageAnalyticsService)
    private readonly pageAnalyticsService?: PageAnalyticsService,
  ) {}

  @Get(':pageId/analytics')
  @Header('Cache-Control', 'private, no-store')
  async getAnalytics(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: PageIdParams,
    @Query(new ZodValidationPipe(pageAnalyticsQuerySchema))
    query: PageAnalyticsQuery,
  ) {
    if (!this.pageAnalyticsService) {
      throw new ApiException({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Analytics service unavailable',
      });
    }
    try {
      const analytics = await this.pageAnalyticsService.readOwned(
        params.pageId,
        request.authSession.user.id,
        query.days,
      );
      return pageAnalyticsSchema.parse(analytics);
    } catch (error: unknown) {
      if (error instanceof PageAnalyticsNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }
      throw error;
    }
  }
}
