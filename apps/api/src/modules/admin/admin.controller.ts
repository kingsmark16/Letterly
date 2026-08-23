import {
  Controller,
  Body,
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
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import {
  adminModerationActionResponseSchema,
  adminReportActionRequestSchema,
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  type AdminReportActionRequest,
  type AdminReportListQuery,
} from '@letterly/contracts';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';
import { AdminOriginGuard } from './admin-origin.guard';
import {
  AdminReportNotFoundError,
  AdminReportsService,
  InvalidAdminCursorError,
} from './admin-reports.service';
import {
  AdminModerationIdempotencyConflictError,
  AdminModerationService,
  AdminModerationStaleVersionError,
} from './admin-moderation.service';
import { ApiException } from '../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import { z } from 'zod';

const reportIdParamsSchema = z.object({ reportId: z.string().uuid() });

function mapAdminReadError(error: unknown): never {
  if (error instanceof InvalidAdminCursorError) {
    throw new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_CURSOR',
      message: 'Invalid cursor',
    });
  }
  if (error instanceof AdminReportNotFoundError) {
    throw new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      message: 'Resource not found',
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
      code: 'RATE_LIMIT_STORE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }
  throw error;
}

function mapAdminMutationError(error: unknown): never {
  if (error instanceof AdminModerationStaleVersionError) {
    throw new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'STALE_MODERATION_VERSION',
      message: 'Moderation state changed',
    });
  }
  if (error instanceof AdminModerationIdempotencyConflictError) {
    throw new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'Idempotency key conflict',
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
      code: 'RATE_LIMIT_STORE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }
  throw error;
}

@Controller('api/v1/admin')
@UseGuards(BetterAuthSessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly reports: AdminReportsService,
    private readonly moderation: AdminModerationService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

  @Get('reports')
  @Header('Cache-Control', 'private, no-store')
  async listReports(
    @Req() request: Request & { authSession: { user: { id: string } } },
    @Query(new ZodValidationPipe(adminReportListQuerySchema))
    query: AdminReportListQuery,
  ) {
    try {
      await this.rateLimitService?.consumeAdminRead(
        request.authSession.user.id,
      );
      return adminReportListResponseSchema.parse(
        await this.reports.list(query),
      );
    } catch (error: unknown) {
      return mapAdminReadError(error);
    }
  }

  @Get('reports/:reportId')
  @Header('Cache-Control', 'private, no-store')
  async getReport(
    @Req() request: Request & { authSession: { user: { id: string } } },
    @Param(new ZodValidationPipe(reportIdParamsSchema))
    params: { reportId: string },
  ) {
    try {
      await this.rateLimitService?.consumeAdminRead(
        request.authSession.user.id,
      );
      return await this.reports.detail(params.reportId);
    } catch (error: unknown) {
      return mapAdminReadError(error);
    }
  }

  @Post('reports/:reportId/review')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async reviewReport(
    @Req()
    request: Request & {
      authSession: { user: { id: string } };
      requestId?: string;
    },
    @Param(new ZodValidationPipe(reportIdParamsSchema))
    params: { reportId: string },
    @Body(new ZodValidationPipe(adminReportActionRequestSchema))
    body: AdminReportActionRequest,
  ) {
    return this.mutateReport(request, params.reportId, 'REPORT_REVIEW', body);
  }

  @Post('reports/:reportId/dismiss')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async dismissReport(
    @Req()
    request: Request & {
      authSession: { user: { id: string } };
      requestId?: string;
    },
    @Param(new ZodValidationPipe(reportIdParamsSchema))
    params: { reportId: string },
    @Body(new ZodValidationPipe(adminReportActionRequestSchema))
    body: AdminReportActionRequest,
  ) {
    return this.mutateReport(request, params.reportId, 'REPORT_DISMISS', body);
  }

  @Post('reports/:reportId/reopen')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async reopenReport(
    @Req()
    request: Request & {
      authSession: { user: { id: string } };
      requestId?: string;
    },
    @Param(new ZodValidationPipe(reportIdParamsSchema))
    params: { reportId: string },
    @Body(new ZodValidationPipe(adminReportActionRequestSchema))
    body: AdminReportActionRequest,
  ) {
    return this.mutateReport(request, params.reportId, 'REPORT_REOPEN', body);
  }

  private async mutateReport(
    request: Request & {
      authSession: { user: { id: string } };
      requestId?: string;
    },
    reportId: string,
    operation: 'REPORT_REVIEW' | 'REPORT_DISMISS' | 'REPORT_REOPEN',
    body: AdminReportActionRequest,
  ) {
    try {
      await this.rateLimitService?.consumeAdminWrite(
        request.authSession.user.id,
      );
      return adminModerationActionResponseSchema.parse(
        await this.moderation.mutateReport({
          actorId: request.authSession.user.id,
          reportId,
          operation,
          request: body,
          requestId: request.requestId ?? randomUUID(),
        }),
      );
    } catch (error: unknown) {
      return mapAdminMutationError(error);
    }
  }
}
