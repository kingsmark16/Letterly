import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  publicPageSlugParamsSchema,
  publicPageUnlockRequestSchema,
  publicPageUnlockResponseSchema,
  type PublicPageUnlockRequest,
} from '@letterly/contracts/pages';
import type { Request, Response } from 'express';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import {
  unlockCookieName,
  unlockCookieOptions,
} from '../../../infrastructure/http/unlock-cookie';
import {
  resolveVisitorIdentity,
  VISITOR_IDENTITY_SECRET,
} from '../../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  PagePasswordConfigurationError,
  PagePasswordNotFoundError,
  PagePasswordService,
} from '../application/page-password.service';
import { mapPasswordError } from './page-password-error.mapper';

@Controller('api/v1/public/pages')
export class PublicPageUnlockController {
  constructor(
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
  ) {}

  @Post(':slug/unlock')
  @HttpCode(HttpStatus.OK)
  async unlock(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body(new ZodValidationPipe(publicPageUnlockRequestSchema))
    body: PublicPageUnlockRequest,
  ) {
    try {
      if (!this.pagePasswordService) {
        throw new PagePasswordConfigurationError();
      }

      const protection = await this.pagePasswordService.findPublicProtection(
        params.slug,
      );
      if (!protection) {
        throw new PagePasswordNotFoundError();
      }

      await this.rateLimitService?.consumeVisitorUnlock(
        protection.pageId,
        resolveVisitorIdentity(request, this.visitorIdentitySecret),
      );
      const result = await this.pagePasswordService.unlock(
        params.slug,
        body.password,
      );
      response.cookie(
        unlockCookieName(result.pageId),
        result.token,
        unlockCookieOptions(process.env.NODE_ENV === 'production'),
      );
      return publicPageUnlockResponseSchema.parse({ unlocked: true });
    } catch (error: unknown) {
      throw mapPasswordError(error);
    }
  }
}
