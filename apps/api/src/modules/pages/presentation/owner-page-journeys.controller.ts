import {
  pageJourneyOwnerResponseSchema,
  pageJourneySaveRequestSchema,
  type PageJourneySaveRequest,
} from '@letterly/contracts/page-journeys';
import {
  pageIdParamsSchema,
  type PageIdParams,
} from '@letterly/contracts/pages';
import type { PageJourneyGraph } from '@letterly/templates';
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
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import {
  PageJourneyInvalidStateError,
  PageJourneyNotFoundError,
  PageJourneyService,
  PageJourneyStaleVersionError,
  PageJourneyTemplateUnavailableError,
  PageJourneyValidationError,
} from '../application/page-journeys.service';

function mapJourneyError(error: unknown): unknown {
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
  if (error instanceof PageJourneyNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof PageJourneyTemplateUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This page does not support a journey',
    });
  }
  if (error instanceof PageJourneyStaleVersionError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'STALE_VERSION',
      message: 'This page changed elsewhere',
      details: { currentContentVersion: error.currentContentVersion },
    });
  }
  if (error instanceof PageJourneyInvalidStateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'INVALID_STATE',
      message: 'This page cannot change its journey in its current state',
    });
  }
  if (error instanceof PageJourneyValidationError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The journey graph is invalid',
      details: {
        issues: error.issues.map((issue) => ({
          path: issue.path.map(String),
          code: issue.message,
        })),
      },
    });
  }
  return error;
}

function toJourneyOwnerResponse(state: {
  draft: {
    revisionNumber: number;
    graph: PageJourneyGraph;
  };
  publishedGraphVersion: number | null;
  contentVersion: number;
}) {
  const graph = state.draft.graph;
  return pageJourneyOwnerResponseSchema.parse({
    draft: {
      ...graph,
      revisionNumber: state.draft.revisionNumber,
    },
    publishedGraphVersion: state.publishedGraphVersion,
    contentVersion: state.contentVersion,
    validation: {
      valid: true,
      issues: [],
    },
  });
}

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageJourneysController {
  constructor(
    @Optional()
    @Inject(PageJourneyService)
    private readonly pageJourneyService?: PageJourneyService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

  @Get(':pageId/choose-your-heart')
  @Header('Cache-Control', 'private, no-store')
  async getChooseYourHeartJourney(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ) {
    try {
      if (!this.pageJourneyService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Journey service unavailable',
        });
      }
      const state = await this.pageJourneyService.getOwned({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
      if (state.template.registryKey !== 'confession.choose-your-heart') {
        throw new PageJourneyTemplateUnavailableError();
      }
      return toJourneyOwnerResponse(state);
    } catch (error: unknown) {
      throw mapJourneyError(error);
    }
  }

  @Put(':pageId/choose-your-heart')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  async saveChooseYourHeartJourney(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(pageJourneySaveRequestSchema))
    body: PageJourneySaveRequest,
  ) {
    try {
      if (!this.pageJourneyService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Journey service unavailable',
        });
      }
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const current = await this.pageJourneyService.getOwned({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
      if (current.template.registryKey !== 'confession.choose-your-heart') {
        throw new PageJourneyTemplateUnavailableError();
      }
      const state = await this.pageJourneyService.save({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        expectedContentVersion: body.expectedContentVersion,
        graph: body,
      });
      return toJourneyOwnerResponse(state);
    } catch (error: unknown) {
      throw mapJourneyError(error);
    }
  }
}
