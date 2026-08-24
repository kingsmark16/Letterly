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
  adminAppealCreateRequestSchema,
  adminAppealDecisionRequestSchema,
  adminAppealResponseSchema,
  adminAuditListQuerySchema,
  adminAuditListResponseSchema,
  adminModerationActionResponseSchema,
  adminPageDisableRequestSchema,
  adminPageModerationResponseSchema,
  adminPageRestoreRequestSchema,
  adminReportActionRequestSchema,
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  adminUserDisableRequestSchema,
  adminUserModerationResponseSchema,
  adminUserRestoreRequestSchema,
  type AdminAppealCreateRequest,
  type AdminAppealDecisionRequest,
  type AdminAuditListQuery,
  type AdminPageDisableRequest,
  type AdminPageRestoreRequest,
  type AdminReportActionRequest,
  type AdminReportListQuery,
  type AdminUserDisableRequest,
  type AdminUserRestoreRequest,
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
  AdminModerationNotFoundError,
  AdminAppealTransitionError,
  AdminModerationService,
  AdminProtectedTargetError,
  AdminModerationStaleVersionError,
} from './admin-moderation.service';
import { AdminAuditService } from './admin-audit.service';
import { ApiException } from '../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import { z } from 'zod';

const reportIdParamsSchema = z.object({ reportId: z.string().uuid() });
const pageIdParamsSchema = z.object({ pageId: z.string().uuid() });
const userIdParamsSchema = z.object({ userId: z.string().min(1).max(200) });
const appealIdParamsSchema = z.object({ appealId: z.string().uuid() });

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
  if (error instanceof AdminModerationNotFoundError) {
    throw new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
  }
  if (error instanceof AdminProtectedTargetError) {
    throw new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFLICT',
      message: 'Resource cannot be changed',
    });
  }
  if (error instanceof AdminAppealTransitionError) {
    throw new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFLICT',
      message: 'Resource state cannot be changed',
    });
  }
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
    private readonly audit: AdminAuditService,
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

  @Get('audit-events')
  @Header('Cache-Control', 'private, no-store')
  async listAuditEvents(
    @Req() request: Request & { authSession: { user: { id: string } } },
    @Query(new ZodValidationPipe(adminAuditListQuerySchema))
    query: AdminAuditListQuery,
  ) {
    try {
      await this.rateLimitService?.consumeAdminRead(request.authSession.user.id);
      return adminAuditListResponseSchema.parse(await this.audit.list(query));
    } catch (error: unknown) {
      return mapAdminReadError(error);
    }
  }

  @Post('reports/:reportId/review')
  @Header('Cache-Control', 'private, no-store')
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
  @Header('Cache-Control', 'private, no-store')
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
  @Header('Cache-Control', 'private, no-store')
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

  @Post('pages/:pageId/disable')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async disablePage(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: { pageId: string },
    @Body(new ZodValidationPipe(adminPageDisableRequestSchema)) body: AdminPageDisableRequest,
  ) {
    return this.mutatePageOrUser(request, 'PAGE_DISABLE', params.pageId, body);
  }

  @Post('pages/:pageId/restore')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async restorePage(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(pageIdParamsSchema)) params: { pageId: string },
    @Body(new ZodValidationPipe(adminPageRestoreRequestSchema)) body: AdminPageRestoreRequest,
  ) {
    return this.mutatePageOrUser(request, 'PAGE_RESTORE', params.pageId, body);
  }

  @Post('users/:userId/disable')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async disableUser(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(userIdParamsSchema)) params: { userId: string },
    @Body(new ZodValidationPipe(adminUserDisableRequestSchema)) body: AdminUserDisableRequest,
  ) {
    return this.mutatePageOrUser(request, 'USER_DISABLE', params.userId, body);
  }

  @Post('users/:userId/restore')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async restoreUser(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(userIdParamsSchema)) params: { userId: string },
    @Body(new ZodValidationPipe(adminUserRestoreRequestSchema)) body: AdminUserRestoreRequest,
  ) {
    return this.mutatePageOrUser(request, 'USER_RESTORE', params.userId, body);
  }

  @Post('appeals')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async createAppeal(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Body(new ZodValidationPipe(adminAppealCreateRequestSchema)) body: AdminAppealCreateRequest,
  ) {
    try {
      await this.rateLimitService?.consumeAdminWrite(request.authSession.user.id);
      return adminAppealResponseSchema.parse(await this.moderation.createAppeal({ actorId: request.authSession.user.id, request: body, requestId: request.requestId ?? randomUUID() }));
    } catch (error: unknown) {
      return mapAdminMutationError(error);
    }
  }

  @Post('appeals/:appealId/accept')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async acceptAppeal(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(appealIdParamsSchema)) params: { appealId: string },
    @Body(new ZodValidationPipe(adminAppealDecisionRequestSchema)) body: AdminAppealDecisionRequest,
  ) {
    return this.mutateAppeal(request, params.appealId, 'APPEAL_ACCEPT', body);
  }

  @Post('appeals/:appealId/reject')
  @Header('Cache-Control', 'private, no-store')
  @UseGuards(AdminOriginGuard)
  @HttpCode(HttpStatus.OK)
  async rejectAppeal(
    @Req() request: Request & { authSession: { user: { id: string } }; requestId?: string },
    @Param(new ZodValidationPipe(appealIdParamsSchema)) params: { appealId: string },
    @Body(new ZodValidationPipe(adminAppealDecisionRequestSchema)) body: AdminAppealDecisionRequest,
  ) {
    return this.mutateAppeal(request, params.appealId, 'APPEAL_REJECT', body);
  }

  private async mutatePageOrUser(
    request: Request & { authSession: { user: { id: string } }; requestId?: string },
    operation: 'PAGE_DISABLE' | 'PAGE_RESTORE' | 'USER_DISABLE' | 'USER_RESTORE',
    targetId: string,
    body: AdminPageDisableRequest | AdminPageRestoreRequest | AdminUserDisableRequest | AdminUserRestoreRequest,
  ) {
    try {
      await this.rateLimitService?.consumeAdminWrite(request.authSession.user.id);
      const result = operation.startsWith('PAGE')
        ? await this.moderation.mutatePage({ actorId: request.authSession.user.id, pageId: targetId, operation: operation as 'PAGE_DISABLE' | 'PAGE_RESTORE', request: body as AdminPageDisableRequest | AdminPageRestoreRequest, requestId: request.requestId ?? randomUUID() })
        : await this.moderation.mutateUser({ actorId: request.authSession.user.id, userId: targetId, operation: operation as 'USER_DISABLE' | 'USER_RESTORE', request: body as AdminUserDisableRequest | AdminUserRestoreRequest, requestId: request.requestId ?? randomUUID() });
      return operation.startsWith('PAGE') ? adminPageModerationResponseSchema.parse(result) : adminUserModerationResponseSchema.parse(result);
    } catch (error: unknown) {
      return mapAdminMutationError(error);
    }
  }

  private async mutateAppeal(
    request: Request & { authSession: { user: { id: string } }; requestId?: string },
    appealId: string,
    operation: 'APPEAL_ACCEPT' | 'APPEAL_REJECT',
    body: AdminAppealDecisionRequest,
  ) {
    try {
      await this.rateLimitService?.consumeAdminWrite(request.authSession.user.id);
      return adminAppealResponseSchema.parse(await this.moderation.mutateAppeal({ actorId: request.authSession.user.id, appealId, operation, request: body, requestId: request.requestId ?? randomUUID() }));
    } catch (error: unknown) {
      return mapAdminMutationError(error);
    }
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
