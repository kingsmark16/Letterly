import type {
  CreatePageRequest,
  DraftListResponse,
  ListPagesQuery,
  PageIdParams,
  OwnerPageProjection,
  SavePageRequest,
} from '@letterly/contracts/pages';
import {
  createPageRequestSchema,
  listPagesQuerySchema,
  pageIdParamsSchema,
  savePageRequestSchema,
} from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
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
import type { PageCursor } from './domain/page.types';
import {
  toDraftListResponse,
  toOwnerPageProjection,
  toPageCursorPayload,
} from './presentation/page-response.mapper';

const pageCursorPayloadSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class PagesController {
  constructor(private readonly pageService: PageService) {}

  @Get()
  async list(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listPagesQuerySchema))
    query: ListPagesQuery,
  ): Promise<DraftListResponse> {
    try {
      const result = await this.pageService.listDrafts({
        creatorId: request.authSession.user.id,
        size: query.size,
        cursor: decodePageCursor(query.cursor),
      });

      return toDraftListResponse(
        result.items,
        result.nextCursor ? encodePageCursor(result.nextCursor) : null,
      );
    } catch (error: unknown) {
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

  @Delete(':pageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<void> {
    try {
      await this.pageService.deleteDraft({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });
    } catch (error: unknown) {
      if (error instanceof PageNotFoundError) {
        throw new ApiException({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'PAGE_NOT_FOUND',
          message: 'Page not found',
        });
      }

      throw error;
    }
  }
}

function encodePageCursor(cursor: PageCursor): string {
  return Buffer.from(
    JSON.stringify(toPageCursorPayload(cursor)),
    'utf8',
  ).toString('base64url');
}

function decodePageCursor(value: string | undefined): PageCursor | null {
  if (!value) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    );
    const parsed = pageCursorPayloadSchema.parse(payload);

    return {
      id: parsed.id,
      updatedAt: new Date(parsed.updatedAt),
    };
  } catch {
    throw new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_CURSOR',
      message: 'Invalid page cursor',
    });
  }
}
