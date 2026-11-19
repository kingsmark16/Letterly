import {
  Controller,
  Get,
  Header,
  Inject,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  adminOverviewQuerySchema,
  adminOverviewResponseSchema,
  type AdminOverviewPeriod,
} from '@letterly/contracts';
import { BetterAuthSessionGuard } from '../../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  ApiBetterAuthSession,
  ApiOperationSummary,
  ApiZodQuery,
  ApiZodResponse,
  ApiZodErrorResponses,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import { PrismaAdminOverviewRepository } from '../infrastructure/prisma-admin-overview.repository';
import { mapAdminReadError } from './admin.controller';

@ApiTags('Administration')
@ApiBetterAuthSession()
@Controller('api/v1/admin')
@UseGuards(BetterAuthSessionGuard, AdminGuard)
export class AdminOverviewController {
  constructor(
    @Inject(PrismaAdminOverviewRepository)
    private readonly repository: PrismaAdminOverviewRepository,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  @Get('overview')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperationSummary('Read moderation workload and UTC platform activity')
  @ApiZodQuery(adminOverviewQuerySchema, {
    wireSchemas: {
      period: { type: 'integer', enum: [7, 30, 90], default: 30 },
    },
  })
  @ApiZodResponse(
    adminOverviewResponseSchema,
    200,
    'Current totals and covered daily activity.',
  )
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 503)
  async read(
    @Req() request: { authSession: { user: { id: string } } },
    @Query(new ZodValidationPipe(adminOverviewQuerySchema))
    query: { period: AdminOverviewPeriod },
  ) {
    try {
      await this.limits.consumeAdminRead(request.authSession.user.id);
    } catch (error: unknown) {
      return mapAdminReadError(error);
    }
    try {
      return await this.repository.read(query.period);
    } catch {
      throw new ApiException({
        statusCode: 503,
        code: 'ANALYTICS_UNAVAILABLE',
        message: 'Platform activity is temporarily unavailable',
      });
    }
  }
}
