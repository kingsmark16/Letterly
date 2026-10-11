import {
  pageIdParamsSchema,
  type PageIdParams,
} from '@letterly/contracts/pages';
import {
  deleteSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  ownerSubmissionDetailSchema,
  ownerSubmissionListResponseSchema,
  ownerSubmissionListWireResponseSchema,
  submissionDeleteResponseSchema,
  submissionIdParamsSchema,
  submissionReadResponseSchema,
  type DeleteSubmissionRequest,
  type ListSubmissionsQuery,
  type SubmissionIdParams,
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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  ApiBetterAuthSession,
  ApiOperationSummary,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodQuery,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import { PageSubmissionsService } from '../application/page-submissions.service';
import { mapSubmissionError } from './page-submission-error.mapper';

const submissionCursorPayloadSchema = z.object({
  version: z.literal(1),
  submittedAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

@ApiTags('Page Submissions')
@ApiBetterAuthSession()
@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageSubmissionsController {
  constructor(
    @Optional()
    @Inject(PageSubmissionsService)
    private readonly pageSubmissionsService?: PageSubmissionsService,
  ) {}

  @Get(':pageId/submissions')
  @Header('Cache-Control', 'no-store')
  @ApiOperationSummary('List private responses for an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodQuery(listSubmissionsQuerySchema, {
    wireSchemas: { size: { type: 'integer', minimum: 1, maximum: 50 } },
  })
  @ApiZodResponse(
    ownerSubmissionListWireResponseSchema,
    200,
    'Private response summaries and pagination.',
  )
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Get one private response')
  @ApiZodParams(submissionIdParamsSchema)
  @ApiZodResponse(
    ownerSubmissionDetailSchema,
    200,
    'The private response detail.',
  )
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Mark a private response as read')
  @ApiZodParams(submissionIdParamsSchema)
  @ApiZodResponse(
    submissionReadResponseSchema,
    200,
    'The updated response read state.',
  )
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
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
  @ApiOperationSummary('Delete a private response')
  @ApiZodParams(submissionIdParamsSchema)
  @ApiZodBody(deleteSubmissionRequestSchema)
  @ApiZodResponse(
    submissionDeleteResponseSchema,
    200,
    'The response deletion result.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
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
