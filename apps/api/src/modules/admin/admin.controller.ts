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
import type { Request } from 'express';
import {
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  type AdminReportListQuery,
} from '@letterly/contracts';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';
import {
  AdminReportNotFoundError,
  AdminReportsService,
  InvalidAdminCursorError,
} from './admin-reports.service';
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

@Controller('api/v1/admin')
@UseGuards(BetterAuthSessionGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly reports: AdminReportsService,
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
}
