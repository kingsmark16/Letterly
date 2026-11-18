import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import {
  adminPageParamsSchema,
  deletionAcceptRequestSchema,
  deletionChildrenQuerySchema,
  deletionJobDetailSchema,
  deletionJobParamsSchema,
  deletionJobSummarySchema,
  deletionListQuerySchema,
  deletionListResponseSchema,
  deletionPreviewRequestSchema,
  deletionPreviewSchema,
  deletionRetryRequestSchema,
  type DeletionAcceptRequest,
  type DeletionListQuery,
  type DeletionRetryRequest,
} from '@letterly/contracts';
import { BetterAuthSessionGuard } from '../../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';
import { AdminOriginGuard } from './admin-origin.guard';
import { AdminDeletionsService } from '../application/admin-deletions.service';
import { AdminDeletionError } from '../application/admin-deletions.repository';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
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
import { mapAdminReadError } from './admin.controller';

type AdminRequest = Request & {
  authSession: { user: { id: string } };
  requestId?: string;
};
@ApiTags('Administration')
@ApiBetterAuthSession()
@Controller('api/v1/admin')
@UseGuards(BetterAuthSessionGuard, AdminGuard)
export class AdminDeletionsController {
  constructor(
    @Inject(AdminDeletionsService)
    private readonly service: AdminDeletionsService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}
  @Post('pages/:pageId/deletion-preview')
  @HttpCode(200)
  @UseGuards(AdminOriginGuard)
  @ApiOperationSummary(
    'Preview permanent page deletion without returning content',
  )
  @ApiZodParams(adminPageParamsSchema)
  @ApiZodBody(deletionPreviewRequestSchema)
  @ApiZodResponse(
    deletionPreviewSchema,
    200,
    'Impact and five minute confirmation token.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  preview(
    @Req() req: AdminRequest,
    @Param(new ZodValidationPipe(adminPageParamsSchema))
    params: { pageId: string },
    @Body(new ZodValidationPipe(deletionPreviewRequestSchema))
    body: { expectedModerationVersion: number },
  ) {
    return this.run(req, false, async () =>
      deletionPreviewSchema.parse(
        await this.service.preview(
          req.authSession.user.id,
          params.pageId,
          body.expectedModerationVersion,
        ),
      ),
    );
  }
  @Post('pages/:pageId/deletions')
  @HttpCode(202)
  @UseGuards(AdminOriginGuard)
  @ApiOperationSummary('Accept confirmed permanent page deletion')
  @ApiZodParams(adminPageParamsSchema)
  @ApiZodBody(deletionAcceptRequestSchema)
  @ApiZodResponse(deletionJobSummarySchema, 202, 'Durable page deletion job.')
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  accept(
    @Req() req: AdminRequest,
    @Param(new ZodValidationPipe(adminPageParamsSchema))
    params: { pageId: string },
    @Body(new ZodValidationPipe(deletionAcceptRequestSchema))
    body: DeletionAcceptRequest,
  ) {
    return this.run(req, true, async () =>
      deletionJobSummarySchema.parse(
        await this.service.accept(
          req.authSession.user.id,
          params.pageId,
          body,
          req.requestId ?? randomUUID(),
        ),
      ),
    );
  }
  @Get('deletions')
  @ApiOperationSummary('List retained deletion progress')
  @ApiZodQuery(deletionListQuerySchema, {
    wireSchemas: { size: { type: 'integer', minimum: 1, maximum: 100 } },
  })
  @ApiZodResponse(deletionListResponseSchema, 200, 'Bounded deletion jobs.')
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  list(
    @Req() req: AdminRequest,
    @Query(new ZodValidationPipe(deletionListQuerySchema))
    query: DeletionListQuery,
  ) {
    return this.run(req, false, async () =>
      deletionListResponseSchema.parse(await this.service.list(query)),
    );
  }
  @Get('deletions/:jobId')
  @ApiOperationSummary('Read safe deletion progress and failure state')
  @ApiZodParams(deletionJobParamsSchema)
  @ApiZodResponse(deletionJobDetailSchema, 200, 'Safe job detail.')
  @ApiZodErrorResponses(400, 401, 403, 404, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  get(
    @Req() req: AdminRequest,
    @Param(new ZodValidationPipe(deletionJobParamsSchema))
    params: { jobId: string },
  ) {
    return this.run(req, false, async () =>
      deletionJobDetailSchema.parse(await this.service.get(params.jobId)),
    );
  }
  @Get('deletions/:jobId/children')
  @ApiOperationSummary('List bounded child job summaries')
  @ApiZodParams(deletionJobParamsSchema)
  @ApiZodQuery(deletionChildrenQuerySchema)
  @ApiZodResponse(deletionListResponseSchema, 200, 'Bounded child jobs.')
  @ApiZodErrorResponses(400, 401, 403, 404, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  children(
    @Req() req: AdminRequest,
    @Param(new ZodValidationPipe(deletionJobParamsSchema))
    params: { jobId: string },
    @Query(new ZodValidationPipe(deletionChildrenQuerySchema))
    query: DeletionListQuery,
  ) {
    return this.run(req, false, async () =>
      deletionListResponseSchema.parse(
        await this.service.list(query, params.jobId),
      ),
    );
  }
  @Post('deletions/:jobId/retry')
  @HttpCode(202)
  @UseGuards(AdminOriginGuard)
  @ApiOperationSummary('Confirm retry of the same recoverable deletion job')
  @ApiZodParams(deletionJobParamsSchema)
  @ApiZodBody(deletionRetryRequestSchema)
  @ApiZodResponse(
    deletionJobSummarySchema,
    202,
    'Existing job scheduled to resume.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  retry(
    @Req() req: AdminRequest,
    @Param(new ZodValidationPipe(deletionJobParamsSchema))
    params: { jobId: string },
    @Body(new ZodValidationPipe(deletionRetryRequestSchema))
    body: DeletionRetryRequest,
  ) {
    return this.run(req, true, async () =>
      deletionJobSummarySchema.parse(
        await this.service.retry(
          req.authSession.user.id,
          params.jobId,
          body,
          req.requestId ?? randomUUID(),
        ),
      ),
    );
  }
  private async run<T>(
    req: AdminRequest,
    mutation: boolean,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      if (mutation)
        await this.limits.consumeAdminWrite(req.authSession.user.id);
      else await this.limits.consumeAdminRead(req.authSession.user.id);
      return await operation();
    } catch (error: unknown) {
      if (error instanceof AdminDeletionError) {
        const code =
          error.code === 'NOT_FOUND'
            ? 'NOT_FOUND'
            : error.code === 'FORBIDDEN'
              ? 'FORBIDDEN'
              : error.code === 'PROTECTED_TARGET'
                ? 'CONFLICT'
                : error.code;
        throw new ApiException({
          statusCode:
            code === 'NOT_FOUND' ? 404 : code === 'FORBIDDEN' ? 403 : 409,
          code,
          message:
            code === 'NOT_FOUND'
              ? 'Record unavailable'
              : code === 'FORBIDDEN'
                ? 'Deletion acceptance is unavailable'
                : 'The deletion request could not be confirmed. Review the current record.',
        });
      }
      return mapAdminReadError(error);
    }
  }
}
