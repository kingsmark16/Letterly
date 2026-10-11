import {
  pageIdParamsSchema,
  pagePasswordRequestSchema,
  pagePasswordResponseSchema,
  type PageIdParams,
  type PagePasswordRequest,
} from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiBetterAuthSession,
  ApiOperationSummary,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import {
  PagePasswordConfigurationError,
  PagePasswordService,
} from '../application/page-password.service';
import { mapPasswordError } from './page-password-error.mapper';

@ApiTags('Page Passwords')
@ApiBetterAuthSession()
@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPagePasswordController {
  constructor(
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

  @Patch(':pageId/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Set or remove an owned page password')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(pagePasswordRequestSchema)
  @ApiZodResponse(
    pagePasswordResponseSchema,
    200,
    'The page password protection state.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
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
}
