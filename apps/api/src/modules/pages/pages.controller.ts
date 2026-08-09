import type {
  CreatePageRequest,
  OwnerPageProjection,
} from '@letterly/contracts/pages';
import { createPageRequestSchema } from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import {
  PageService,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './application/page.service';
import { toOwnerPageProjection } from './presentation/page-response.mapper';

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class PagesController {
  constructor(private readonly pageService: PageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(createPageRequestSchema))
    body: CreatePageRequest,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.createDraft({
        creatorId: request.authSession.user.id,
        ...body,
      });

      return toOwnerPageProjection(page);
    } catch (error: unknown) {
      if (error instanceof TemplateUnavailableError) {
        throw new NotFoundException('Template unavailable');
      }

      if (error instanceof TemplateDefinitionUnavailableError) {
        throw new ServiceUnavailableException(
          'Template definition unavailable',
        );
      }

      throw error;
    }
  }
}
