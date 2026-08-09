import type {
  CreatePageRequest,
  PageIdParams,
  OwnerPageProjection,
  SavePageRequest,
} from '@letterly/contracts/pages';
import {
  createPageRequestSchema,
  pageIdParamsSchema,
  savePageRequestSchema,
} from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BetterAuthSessionGuard } from '../auth/better-auth-session.guard';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { ApiException } from '../../infrastructure/http/api-exception';
import { ZodValidationPipe } from '../../infrastructure/http/zod-validation.pipe';
import {
  PageService,
  PageNotFoundError,
  StalePageVersionError,
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
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'TEMPLATE_UNAVAILABLE',
          message: 'Template unavailable',
        });
      }

      if (error instanceof TemplateDefinitionUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
          message: 'Template definition unavailable',
        });
      }

      throw error;
    }
  }

  @Patch(':pageId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(savePageRequestSchema))
    body: SavePageRequest,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.updateDraft({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        ...body,
      });

      return toOwnerPageProjection(page);
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }

      if (error instanceof StalePageVersionError) {
        throw new ApiException({
          statusCode: HttpStatus.CONFLICT,
          code: 'STALE_VERSION',
          message: 'This draft changed elsewhere',
          details: {
            currentContentVersion: error.currentContentVersion,
            currentUpdatedAt: error.currentUpdatedAt.toISOString(),
          },
        });
      }

      if (error instanceof TemplateDefinitionUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
          message: 'Template definition unavailable',
        });
      }

      throw error;
    }
  }

  @Get(':pageId')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<OwnerPageProjection> {
    try {
      const page = await this.pageService.getOwnedPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toOwnerPageProjection(page);
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }

      if (error instanceof TemplateDefinitionUnavailableError) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
          message: 'Template definition unavailable',
        });
      }

      throw error;
    }
  }
}
