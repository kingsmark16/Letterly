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
import type { Request } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  adminCreatorListQuerySchema,
  adminCreatorSearchSchema,
  adminCreatorListResponseSchema,
  adminPageListQuerySchema,
  adminPageSearchSchema,
  adminPageListResponseSchema,
  adminPageRecordSchema,
  adminPageParamsSchema,
  adminAppealListQuerySchema,
  adminAppealListResponseSchema,
  adminAppealDetailSchema,
  adminAppealParamsSchema,
  type AdminCreatorListQuery,
  type AdminCreatorSearch,
  type AdminPageListQuery,
  type AdminPageSearch,
  type AdminAppealListQuery,
} from '@letterly/contracts';
import { BetterAuthSessionGuard } from '../../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';
import { AdminOriginGuard } from './admin-origin.guard';
import { AdminOperationsService } from '../application/admin-operations.service';
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

type AdminRequest = Request & { authSession: { user: { id: string } } };
const wireSize = {
  wireSchemas: { size: { type: 'integer', minimum: 1, maximum: 100 } },
} as const;

@ApiTags('Administration')
@ApiBetterAuthSession()
@Controller('api/v1/admin')
@UseGuards(BetterAuthSessionGuard, AdminGuard)
export class AdminOperationsController {
  constructor(
    @Inject(AdminOperationsService)
    private readonly operations: AdminOperationsService,
    @Inject(RateLimitService) private readonly limits: RateLimitService,
  ) {}

  @Get('creators')
  @ApiOperationSummary('List safe creator accounts')
  @ApiZodQuery(adminCreatorListQuerySchema, wireSize)
  @ApiZodResponse(
    adminCreatorListResponseSchema,
    200,
    'Bounded creator summaries.',
  )
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  listCreators(
    @Req() request: AdminRequest,
    @Query(new ZodValidationPipe(adminCreatorListQuerySchema))
    query: AdminCreatorListQuery,
  ) {
    return this.read(request, async () =>
      adminCreatorListResponseSchema.parse(
        await this.operations.creators(query),
      ),
    );
  }

  @Post('creators/search')
  @HttpCode(200)
  @UseGuards(AdminOriginGuard)
  @ApiOperationSummary(
    'Search creator identity without putting identity in URLs',
  )
  @ApiZodBody(adminCreatorSearchSchema)
  @ApiZodResponse(
    adminCreatorListResponseSchema,
    200,
    'Bounded creator matches.',
  )
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  searchCreators(
    @Req() request: AdminRequest,
    @Body(new ZodValidationPipe(adminCreatorSearchSchema))
    query: AdminCreatorSearch,
  ) {
    return this.read(request, async () =>
      adminCreatorListResponseSchema.parse(
        await this.operations.creators(query),
      ),
    );
  }

  @Get('pages')
  @ApiOperationSummary('List safe page metadata')
  @ApiZodQuery(adminPageListQuerySchema, wireSize)
  @ApiZodResponse(adminPageListResponseSchema, 200, 'Bounded page summaries.')
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  listPages(
    @Req() request: AdminRequest,
    @Query(new ZodValidationPipe(adminPageListQuerySchema))
    query: AdminPageListQuery,
  ) {
    return this.read(request, async () =>
      adminPageListResponseSchema.parse(await this.operations.pages(query)),
    );
  }

  @Post('pages/search')
  @HttpCode(200)
  @UseGuards(AdminOriginGuard)
  @ApiOperationSummary('Find a page by exact ID or slug')
  @ApiZodBody(adminPageSearchSchema)
  @ApiZodResponse(adminPageListResponseSchema, 200, 'Bounded page matches.')
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  searchPages(
    @Req() request: AdminRequest,
    @Body(new ZodValidationPipe(adminPageSearchSchema)) query: AdminPageSearch,
  ) {
    return this.read(request, async () =>
      adminPageListResponseSchema.parse(await this.operations.pages(query)),
    );
  }

  @Get('pages/:pageId')
  @ApiOperationSummary('Read page metadata without private writing')
  @ApiZodParams(adminPageParamsSchema)
  @ApiZodResponse(adminPageRecordSchema, 200, 'Safe page detail.')
  @ApiZodErrorResponses(400, 401, 403, 404, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  page(
    @Req() request: AdminRequest,
    @Param(new ZodValidationPipe(adminPageParamsSchema))
    params: { pageId: string },
  ) {
    return this.read(request, async () =>
      adminPageRecordSchema.parse(await this.operations.page(params.pageId)),
    );
  }

  @Get('appeals')
  @ApiOperationSummary('List the appeal inbox')
  @ApiZodQuery(adminAppealListQuerySchema, wireSize)
  @ApiZodResponse(
    adminAppealListResponseSchema,
    200,
    'Bounded appeal summaries.',
  )
  @ApiZodErrorResponses(400, 401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  appeals(
    @Req() request: AdminRequest,
    @Query(new ZodValidationPipe(adminAppealListQuerySchema))
    query: AdminAppealListQuery,
  ) {
    return this.read(request, async () =>
      adminAppealListResponseSchema.parse(await this.operations.appeals(query)),
    );
  }

  @Get('appeals/:appealId')
  @ApiOperationSummary('Read an appeal and its safe resolution metadata')
  @ApiZodParams(adminAppealParamsSchema)
  @ApiZodResponse(adminAppealDetailSchema, 200, 'Safe appeal detail.')
  @ApiZodErrorResponses(400, 401, 403, 404, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  appeal(
    @Req() request: AdminRequest,
    @Param(new ZodValidationPipe(adminAppealParamsSchema))
    params: { appealId: string },
  ) {
    return this.read(request, async () =>
      adminAppealDetailSchema.parse(
        await this.operations.appeal(params.appealId),
      ),
    );
  }

  private async read<T>(
    request: AdminRequest,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      await this.limits.consumeAdminRead(request.authSession.user.id);
      return await operation();
    } catch (error: unknown) {
      return mapAdminReadError(error);
    }
  }
}
