import {
  createPageQuestionRequestSchema,
  deletePageQuestionRequestSchema,
  pageQuestionDeleteResponseSchema,
  pageQuestionListResponseSchema,
  pageQuestionMutationResponseSchema,
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
  pageIdParamsSchema,
  type PageIdParams,
} from '@letterly/contracts/pages';
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
  Patch,
  Post,
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
  InvalidQuestionBranchError,
  InvalidQuestionOrderError,
  PageQuestionCapabilityUnavailableError,
  PageQuestionInvalidStateError,
  PageQuestionKeyTakenError,
  PageQuestionLimitReachedError,
  PageQuestionNotFoundError,
  PageQuestionService,
  PageQuestionStaleVersionError,
  QuestionResponseImpactError,
} from '../application/page-questions.service';

function mapQuestionError(error: unknown): unknown {
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
  if (error instanceof PageQuestionLimitReachedError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'QUESTION_LIMIT_REACHED',
      message: 'This letter can contain at most 100 questions',
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

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageQuestionsController {
  constructor(
    @Optional()
    @Inject(PageQuestionService)
    private readonly pageQuestionService?: PageQuestionService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

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
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);

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
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
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
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);

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
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);

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
}
