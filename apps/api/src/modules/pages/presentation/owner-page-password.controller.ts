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
