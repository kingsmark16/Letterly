import type {
  CreatePageRequest,
  PageListResponse,
  ListPagesQuery,
  PageIdParams,
  ImageIdParams,
  OwnerPageProjection,
  SavePageRequest,
  ImageUploadRequest,
} from '@letterly/contracts/pages';
import {
  createPageRequestSchema,
  imageIdParamsSchema,
  imageOperationResponseSchema,
  imageUploadRequestSchema,
  imageUploadResponseSchema,
  ownerPageImageSchema,
  listPagesQuerySchema,
  pageIdParamsSchema,
  savePageRequestSchema,
} from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Optional,
  UseGuards,
  Put,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import {
  changePublishedSlugRequestSchema,
  publicPageSlugParamsSchema,
  publishPageRequestSchema,
  type ChangePublishedSlugRequest,
  type PageLifecycleResponse,
  type PagePasswordRequest,
  type PublishPageRequest,
  type PublicPageUnlockRequest,
  type PublicSecretLetterProjection,
  type UnpublishPageRequest,
  unpublishPageRequestSchema,
  pagePasswordRequestSchema,
  pagePasswordResponseSchema,
  publicPageUnlockRequestSchema,
  publicPageUnlockResponseSchema,
  publicSecretLetterResponseSchema,
} from '@letterly/contracts/pages';
import {
  publicReportRequestSchema,
  publicReportResponseSchema,
  type PublicReportRequest,
} from '@letterly/contracts/reports';
import {
  createPageQuestionRequestSchema,
  deletePageQuestionRequestSchema,
  pageQuestionDeleteResponseSchema,
  pageQuestionMutationResponseSchema,
  pageQuestionListResponseSchema,
  pageQuestionReorderResponseSchema,
  questionIdParamsSchema,
  reorderPageQuestionsRequestSchema,
  updatePageQuestionRequestSchema,
  type CreatePageQuestionRequest,
  type DeletePageQuestionRequest,
  type QuestionIdParams,
  type ReorderPageQuestionsRequest,
  type UpdatePageQuestionRequest,
} from '@letterly/contracts/questions';
import {
  deleteSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  ownerSubmissionDetailSchema,
  ownerSubmissionListResponseSchema,
  submissionDeleteResponseSchema,
  submissionIdParamsSchema,
  submissionReadResponseSchema,
  visitorSubmissionResponseSchema,
  publicSubmissionRequestSchema,
  type PublicSubmissionRequest,
  type DeleteSubmissionRequest,
  type ListSubmissionsQuery,
  type SubmissionIdParams,
} from '@letterly/contracts/submissions';
import {
  pageJourneyOwnerResponseSchema,
  pageJourneyPublicPageProjectionSchema,
  pageJourneySaveRequestSchema,
  type PageJourneyPublicPageProjection,
  type PageJourneySaveRequest,
} from '@letterly/contracts/page-journeys';
import {
  publicPageJourneyMetricEventSchema,
  type PublicPageJourneyMetricEvent,
} from '@letterly/contracts/metrics';
import type { PageJourneyGraph } from '@letterly/templates';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { ApiException } from '../../infrastructure/http/api-exception';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../infrastructure/http/rate-limit.service';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../infrastructure/http/visitor-identity';
import {
  browserCookieOptions,
  BROWSER_COOKIE_NAME,
  createBrowserToken,
  hashBrowserToken,
  readBrowserToken,
} from '../../infrastructure/http/browser-token';
import {
  unlockCookieName,
  unlockCookieOptions,
} from '../../infrastructure/http/unlock-cookie';
import type { Request } from 'express';
import {
  PageService,
  APP_ORIGIN,
  ConfirmationRequiredError,
  ImageLimitReachedError,
  InvalidImageError,
  InvalidPageStateError,
  InvalidSlugError,
  PageNotFoundError,
  PublicPageReadUnavailableError,
  SlugAllocationFailedError,
  SlugAlreadyTakenError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateResponseCapabilityUnavailableError,
  TemplateRequirementError,
  TemplateUnavailableError,
} from './application/page.service';
import {
  PageJourneyInvalidStateError,
  PageJourneyNotFoundError,
  PageJourneyService,
  PageJourneyStaleVersionError,
  PageJourneyTemplateUnavailableError,
  PageJourneyValidationError,
} from './application/page-journeys.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './application/page-journey-metrics';
import {
  PageJourneySubmissionCapabilityError,
  PageJourneySubmissionDuplicateError,
  PageJourneySubmissionIdempotencyConflictError,
  PageJourneySubmissionInvalidBranchError,
  PageJourneySubmissionNotFoundError,
  PageJourneySubmissionService,
  PageJourneySubmissionVersionConflictError,
} from './application/page-journey-submissions.service';
import {
  InvalidQuestionBranchError,
  InvalidQuestionOrderError,
  PageQuestionCapabilityUnavailableError,
  PageQuestionInvalidStateError,
  PageQuestionKeyTakenError,
  PageQuestionNotFoundError,
  PageQuestionService,
  PageQuestionStaleVersionError,
  QuestionResponseImpactError,
} from './application/page-questions.service';
import {
  DuplicateSubmissionError,
  InvalidSubmissionBranchError,
  SubmissionCapabilityUnavailableError,
  PageSubmissionsService,
  SubmissionConfirmationRequiredError,
  SubmissionIdempotencyConflictError,
  SubmissionNotFoundError,
  SubmissionPageNotFoundError,
} from './application/page-submissions.service';
import {
  InvalidPagePasswordError,
  PagePasswordConfigurationError,
  PagePasswordNotFoundError,
  PagePasswordService,
} from './application/page-password.service';
import {
  PageReportsService,
  PublicReportPageNotFoundError,
  PublicReportUnavailableError,
} from './application/page-reports.service';
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
import type { PageCursor } from './domain/page.types';
import {
  toPageListResponse,
  toPageLifecycleResponse,
  toOwnerPageProjection,
  toPageCursorPayload,
} from './presentation/page-response.mapper';

const pageCursorPayloadSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

const publicImageParamsSchema = publicPageSlugParamsSchema.extend({
  imageId: z.string().uuid(),
});

const submissionCursorPayloadSchema = z.object({
  version: z.literal(1),
  submittedAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

function mapQuestionError(error: unknown): unknown {
  if (error instanceof ApiException) {
    return error;
  }
  if (error instanceof PageQuestionNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof PageQuestionInvalidStateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'INVALID_STATE',
      message: 'This page cannot change questions in its current state',
    });
  }
  if (error instanceof PageQuestionCapabilityUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support questions',
    });
  }
  if (error instanceof PageQuestionStaleVersionError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'STALE_VERSION',
      message: 'This page changed elsewhere',
      details: {
        currentContentVersion: error.currentContentVersion,
      },
    });
  }
  if (error instanceof InvalidQuestionBranchError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The question branch is invalid',
    });
  }
  if (error instanceof InvalidQuestionOrderError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_ORDER',
      message: 'The question order is invalid',
    });
  }
  if (error instanceof PageQuestionKeyTakenError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'QUESTION_KEY_TAKEN',
      message: 'That question key is already in use',
    });
  }
  if (error instanceof QuestionResponseImpactError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'RESPONSE_IMPACT',
      message: 'Confirm deletion of affected responses to continue',
      details: {
        affectedResponseCount: error.affectedResponseCount,
        confirmResponseDeletion: true,
      },
    });
  }
  return error;
}

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

function mapSubmissionError(error: unknown): unknown {
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
  if (
    error instanceof SubmissionPageNotFoundError ||
    error instanceof SubmissionNotFoundError
  ) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof InvalidSubmissionBranchError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The response does not follow the question path',
    });
  }
  if (error instanceof SubmissionCapabilityUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support this response',
    });
  }
  if (error instanceof DuplicateSubmissionError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_SUBMISSION',
      message: 'This browser has already submitted a response',
    });
  }
  if (error instanceof SubmissionIdempotencyConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'That idempotency key was already used for another response',
    });
  }
  if (error instanceof PageJourneySubmissionNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof PageJourneySubmissionCapabilityError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support this response',
    });
  }
  if (error instanceof PageJourneySubmissionInvalidBranchError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The response does not follow the journey path',
    });
  }
  if (error instanceof PageJourneySubmissionVersionConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'JOURNEY_VERSION_STALE',
      message: 'The journey has changed since it was opened',
    });
  }
  if (error instanceof PageJourneySubmissionDuplicateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_SUBMISSION',
      message: 'This browser has already submitted a response',
    });
  }
  if (error instanceof PageJourneySubmissionIdempotencyConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'That idempotency key was already used for another response',
    });
  }
  if (error instanceof SubmissionConfirmationRequiredError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFIRMATION_REQUIRED',
      message: 'Explicit confirmation is required',
    });
  }
  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }
  if (error instanceof PublicReportPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof PublicReportUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Report service temporarily unavailable',
    });
  }

  return error;
}

function mapPasswordError(error: unknown): unknown {
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
  if (error instanceof PagePasswordNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof InvalidPagePasswordError) {
    return new ApiException({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_PASSWORD',
      message: 'The password is incorrect',
    });
  }
  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }

  return error;
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
    @Inject(PageQuestionService)
    private readonly pageQuestionService?: PageQuestionService,
    @Optional()
    @Inject(PageSubmissionsService)
    private readonly pageSubmissionsService?: PageSubmissionsService,
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(PageJourneyService)
    private readonly pageJourneyService?: PageJourneyService,
    @Optional()
    @Inject(PageJourneySubmissionService)
    private readonly pageJourneySubmissionService?: PageJourneySubmissionService,
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

  @Get()
  @Header('Cache-Control', 'private, no-store')
  async list(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listPagesQuerySchema))
    query: ListPagesQuery,
  ): Promise<PageListResponse> {
    try {
      const result = await this.pageService.listPages({
        creatorId: request.authSession.user.id,
        size: query.size,
        cursor: decodePageCursor(query.cursor),
        ...(query.status ? { status: query.status } : {}),
      });

      return toPageListResponse(
        result.items,
        result.nextCursor ? encodePageCursor(result.nextCursor) : null,
      );
    } catch (error: unknown) {
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPageRequestSchema))
    body: CreatePageRequest,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.createDraft({
        creatorId: request.authSession.user.id,
        ...body,
      });

      return toOwnerPageProjection(page, this.appOrigin);
    } catch (error: unknown) {
      if (error instanceof TemplateUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'TEMPLATE_UNAVAILABLE',
          message: 'Template unavailable',
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

  @Patch(':pageId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(savePageRequestSchema))
    body: SavePageRequest,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.updateDraft({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        ...body,
      });

      return toOwnerPageProjection(page, this.appOrigin);
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }

      if (error instanceof StalePageVersionError) {
        throw new ApiException({
          statusCode: HttpStatus.CONFLICT,
          code: 'STALE_VERSION',
          message: 'This draft changed elsewhere',
          details: {
            currentContentVersion: error.currentContentVersion,
            currentUpdatedAt: error.currentUpdatedAt.toISOString(),
          },
        });
      }

      if (error instanceof InvalidPageStateError) {
        throw new ApiException({
          statusCode: HttpStatus.CONFLICT,
          code: 'INVALID_STATE',
          message: 'Unpublish this page before editing it',
        });
      }

      if (error instanceof TemplateResponseCapabilityUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'UNSUPPORTED_CAPABILITY',
          message: 'This template does not support visitor responses',
        });
      }

      if (error instanceof InvalidImageError) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'INVALID_IMAGE',
          message: 'One or more selected images are unavailable',
        });
      }

      if (error instanceof ImageLimitReachedError) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'IMAGE_LIMIT_REACHED',
          message: 'The letter image limit has been reached',
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

  @Patch(':pageId/password')
  @HttpCode(HttpStatus.OK)
  async setPassword(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(pagePasswordRequestSchema))
    body: PagePasswordRequest,
  ) {
    try {
      if (!this.pagePasswordService) {
        throw new PagePasswordConfigurationError();
      }
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      return pagePasswordResponseSchema.parse(
        await this.pagePasswordService.setPassword({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          password: body.password,
        }),
      );
    } catch (error: unknown) {
      throw mapPasswordError(error);
    }
  }

  @Post(':pageId/questions')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(createPageQuestionRequestSchema))
    body: CreatePageQuestionRequest,
  ) {
    try {
      if (!this.pageQuestionService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Question service unavailable',
        });
      }

      return pageQuestionMutationResponseSchema.parse({
        ...(await this.pageQuestionService.create({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          ...body,
        })),
      });
    } catch (error: unknown) {
      throw mapQuestionError(error);
    }
  }

  @Get(':pageId/questions')
  @Header('Cache-Control', 'private, no-store')
  async listQuestions(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ) {
    try {
      if (!this.pageQuestionService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Question service unavailable',
        });
      }
      return pageQuestionListResponseSchema.parse(
        await this.pageQuestionService.list({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
        }),
      );
    } catch (error: unknown) {
      throw mapQuestionError(error);
    }
  }

  @Patch(':pageId/questions/order')
  @HttpCode(HttpStatus.OK)
  async reorderQuestions(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(reorderPageQuestionsRequestSchema))
    body: ReorderPageQuestionsRequest,
  ) {
    try {
      if (!this.pageQuestionService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Question service unavailable',
        });
      }
      return pageQuestionReorderResponseSchema.parse(
        await this.pageQuestionService.reorder({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          ...body,
        }),
      );
    } catch (error: unknown) {
      throw mapQuestionError(error);
    }
  }

  @Patch(':pageId/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async updateQuestion(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(questionIdParamsSchema))
    params: QuestionIdParams,
    @Body(new ZodValidationPipe(updatePageQuestionRequestSchema))
    body: UpdatePageQuestionRequest,
  ) {
    try {
      if (!this.pageQuestionService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Question service unavailable',
        });
      }

      return pageQuestionMutationResponseSchema.parse({
        ...(await this.pageQuestionService.update({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          questionId: params.questionId,
          ...body,
        })),
      });
    } catch (error: unknown) {
      throw mapQuestionError(error);
    }
  }

  @Delete(':pageId/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(questionIdParamsSchema))
    params: QuestionIdParams,
    @Body(new ZodValidationPipe(deletePageQuestionRequestSchema))
    body: DeletePageQuestionRequest,
  ) {
    try {
      if (!this.pageQuestionService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Question service unavailable',
        });
      }

      const result = await this.pageQuestionService.delete({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        questionId: params.questionId,
        ...body,
      });
      return pageQuestionDeleteResponseSchema.parse({
        deleted: true,
        contentVersion: result.contentVersion,
      });
    } catch (error: unknown) {
      throw mapQuestionError(error);
    }
  }

  @Get(':pageId/submissions')
  @Header('Cache-Control', 'no-store')
  async listSubmissions(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Query(new ZodValidationPipe(listSubmissionsQuerySchema))
    query: ListSubmissionsQuery,
  ) {
    try {
      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      const result = await this.pageSubmissionsService.list({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        filter: query.filter,
        size: query.size,
        cursor: decodeSubmissionCursor(query.cursor),
      });

      const response = {
        items: result.items.map((item) => ({
          id: item.id,
          readState: item.readState,
          submittedAt: item.submittedAt.toISOString(),
          answerCount: item.answerCount,
          hasVisitorMessage: item.hasVisitorMessage,
        })),
        ...(result.unreadCount === undefined
          ? {}
          : { unreadCount: result.unreadCount }),
        nextCursor: result.nextCursor
          ? encodeSubmissionCursor(result.nextCursor)
          : null,
      };
      return result.unreadCount === undefined
        ? response
        : ownerSubmissionListResponseSchema.parse(response);
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }

  @Get(':pageId/submissions/:submissionId')
  @Header('Cache-Control', 'no-store')
  async getSubmission(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(submissionIdParamsSchema))
    params: SubmissionIdParams,
  ) {
    try {
      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      const detail = await this.pageSubmissionsService.find({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        submissionId: params.submissionId,
      });

      return ownerSubmissionDetailSchema.parse({
        ...detail,
        submittedAt: detail.submittedAt.toISOString(),
      });
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }

  @Post(':pageId/submissions/:submissionId/read')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async markSubmissionRead(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(submissionIdParamsSchema))
    params: SubmissionIdParams,
  ) {
    try {
      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      return submissionReadResponseSchema.parse(
        await this.pageSubmissionsService.markRead({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          submissionId: params.submissionId,
        }),
      );
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }

  @Delete(':pageId/submissions/:submissionId')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async deleteSubmission(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(submissionIdParamsSchema))
    params: SubmissionIdParams,
    @Body(new ZodValidationPipe(deleteSubmissionRequestSchema))
    body: DeleteSubmissionRequest,
  ) {
    try {
      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      return submissionDeleteResponseSchema.parse(
        await this.pageSubmissionsService.delete({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          submissionId: params.submissionId,
          confirm: body.confirm,
        }),
      );
    } catch (error: unknown) {
      throw mapSubmissionError(error);
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

  @Get(':pageId')
  @Header('Cache-Control', 'private, no-store')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.getOwnedPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toOwnerPageProjection(page, this.appOrigin);
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
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

  @Delete(':pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<void> {
    try {
      await this.pageService.deleteDraft({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }

      throw error;
    }
  }

  @Post(':pageId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(publishPageRequestSchema))
    body: PublishPageRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.publishPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        customSlug: body.customSlug,
        confirmReady: body.confirmReady,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/unpublish')
  @HttpCode(HttpStatus.OK)
  async unpublish(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(unpublishPageRequestSchema))
    body: UnpublishPageRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.unpublishPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        confirm: body.confirm,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.archivePage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.restorePage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Patch(':pageId/slug')
  @HttpCode(HttpStatus.OK)
  async changeSlug(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(changePublishedSlugRequestSchema))
    body: ChangePublishedSlugRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.changePublishedSlug({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        customSlug: body.customSlug,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
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
  ) {}

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
        request.headers.cookie,
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
        request.headers.cookie,
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
          const unlocked = await this.pagePasswordService.verifyRequestCookie(
            protection.pageId,
            protection.passwordVersion,
            request.headers.cookie,
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
          const unlocked = await this.pagePasswordService.verifyRequestCookie(
            protection.pageId,
            protection.passwordVersion,
            request.headers.cookie,
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

function mapPublicationError(error: unknown): unknown {
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

  if (error instanceof PageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }

  if (error instanceof InvalidSlugError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_SLUG',
      message:
        'Choose a public slug using lowercase letters, numbers, and single hyphens',
    });
  }

  if (error instanceof SlugAlreadyTakenError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'SLUG_ALREADY_TAKEN',
      message: 'That public slug is already in use',
    });
  }

  if (error instanceof InvalidPageStateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'INVALID_STATE',
      message: 'This page cannot make that lifecycle change',
    });
  }

  if (error instanceof TemplateRequirementError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'TEMPLATE_REQUIREMENT_FAILED',
      message: 'Add a recipient name and message before publishing',
    });
  }

  if (error instanceof ConfirmationRequiredError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'CONFIRMATION_REQUIRED',
      message: 'Explicit confirmation is required',
    });
  }

  if (error instanceof SlugAllocationFailedError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SLUG_ALLOCATION_FAILED',
      message: 'The public slug could not be reserved',
    });
  }

  if (error instanceof TemplateDefinitionUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
      message: 'Template definition unavailable',
    });
  }

  return error;
}

function encodePageCursor(cursor: PageCursor): string {
  return Buffer.from(
    JSON.stringify(toPageCursorPayload(cursor)),
    'utf8',
  ).toString('base64url');
}

function decodePageCursor(value: string | undefined): PageCursor | null {
  if (!value) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    const parsed = pageCursorPayloadSchema.parse(payload);

    return {
      id: parsed.id,
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    throw new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_CURSOR',
      message: 'Invalid page cursor',
    });
  }
}

function encodeSubmissionCursor(cursor: {
  submittedAt: Date;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      submittedAt: cursor.submittedAt.toISOString(),
      id: cursor.id,
    }),
    'utf8',
  ).toString('base64url');
}

function decodeSubmissionCursor(value: string | undefined): {
  submittedAt: Date;
  id: string;
} | null {
  if (!value) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    const parsed = submissionCursorPayloadSchema.parse(payload);
    return {
      submittedAt: new Date(parsed.submittedAt),
      id: parsed.id,
    };
  } catch {
    throw new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_CURSOR',
      message: 'Invalid submission cursor',
    });
  }
}
