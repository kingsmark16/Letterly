import type {
  CreatePageRequest,
  ListPagesQuery,
  OwnerPageProjection,
  PageIdParams,
  PageListResponse,
  SavePageRequest,
} from '@letterly/contracts/pages';
import {
  changePublishedSlugRequestSchema,
  createPageRequestSchema,
  listPagesQuerySchema,
  ownerPageProjectionSchema,
  pageIdParamsSchema,
  pageLifecycleResponseSchema,
  pageListResponseSchema,
  publishPageRequestSchema,
  savePageRequestSchema,
  unpublishPageRequestSchema,
  type ChangePublishedSlugRequest,
  type PageLifecycleResponse,
  type PublishPageRequest,
  type UnpublishPageRequest,
} from '@letterly/contracts/pages';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { APP_ORIGIN } from '../../../infrastructure/config/app-config.module';
import {
  RateLimitExceededError,
  RateLimitService,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';
import { BetterAuthSessionGuard } from '../../auth/better-auth-session.guard';
import { YOUTUBE_LINKS_ENABLED } from '../application/page-audio-link.service';
import {
  ConfirmationRequiredError,
  ImageLimitReachedError,
  InvalidImageError,
  InvalidPageStateError,
  InvalidSlugError,
  PageNotFoundError,
  PageService,
  SlugAllocationFailedError,
  SlugAlreadyTakenError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateRequirementError,
  TemplateUnavailableError,
} from '../application/page.service';
import type { PageCursor } from '../domain/page.types';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiBetterAuthSession,
  ApiNoContentResponse,
  ApiOperationSummary,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodQuery,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  toOwnerPageProjection,
  toPageCursorPayload,
  toPageLifecycleResponse,
  toPageListResponse,
} from './page-response.mapper';

import { ListOwnerPages } from '../application/list-owner-pages';
const pageCursorPayloadSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

@ApiTags('Owner Pages')
@ApiBetterAuthSession()
@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPagesController {
  constructor(
    @Inject(PageService) private readonly pageService: PageService,
    @Inject(ListOwnerPages) private readonly listOwnerPages: ListOwnerPages,
    @Optional()
    @Inject(APP_ORIGIN)
    private readonly appOrigin = 'http://localhost:3000',
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(YOUTUBE_LINKS_ENABLED)
    private readonly youtubeLinksEnabled = false,
  ) {}

  @Get()
  @ApiOperationSummary('List the signed in creator’s pages')
  @ApiZodQuery(listPagesQuerySchema, {
    wireSchemas: { size: { type: 'integer', minimum: 1, maximum: 50 } },
  })
  @ApiZodResponse(
    pageListResponseSchema,
    200,
    'A page of creator page summaries.',
  )
  @ApiZodErrorResponses(401, 403, 422, 429, 500, 503)
  @Header('Cache-Control', 'private, no-store')
  async list(
    @Req() request: AuthenticatedRequest,
    @Query(new ZodValidationPipe(listPagesQuerySchema))
    query: ListPagesQuery,
  ): Promise<PageListResponse> {
    try {
      const result = await this.listOwnerPages.execute({
        creatorId: request.authSession.user.id,
        size: query.size,
        cursor: decodePageCursor(query.cursor),
        ...(query.status ? { status: query.status } : {}),
      });

      return toPageListResponse(
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
  @ApiOperationSummary('Create a page draft')
  @ApiZodBody(createPageRequestSchema)
  @ApiZodResponse(
    ownerPageProjectionSchema,
    201,
    'The newly created page draft.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 500, 503)
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

      return toOwnerPageProjection(
        page,
        this.appOrigin,
        this.youtubeLinksEnabled,
      );
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
  @ApiOperationSummary('Save page content and settings')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(savePageRequestSchema)
  @ApiZodResponse(ownerPageProjectionSchema, 200, 'The updated owner page.')
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 500, 503)
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

      return toOwnerPageProjection(
        page,
        this.appOrigin,
        this.youtubeLinksEnabled,
      );
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

      if (error instanceof InvalidPageStateError) {
        throw new ApiException({
          statusCode: HttpStatus.CONFLICT,
          code: 'INVALID_STATE',
          message: 'This page cannot be edited in its current state',
        });
      }

      if (error instanceof InvalidImageError) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'INVALID_IMAGE',
          message: 'One or more selected images are unavailable',
        });
      }

      if (error instanceof ImageLimitReachedError) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'IMAGE_LIMIT_REACHED',
          message: 'The letter image limit has been reached',
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
  @ApiOperationSummary('Get one page owned by the signed in creator')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodResponse(ownerPageProjectionSchema, 200, 'The owner page projection.')
  @ApiZodErrorResponses(401, 403, 404, 422, 500, 503)
  @Header('Cache-Control', 'private, no-store')
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

      return toOwnerPageProjection(
        page,
        this.appOrigin,
        this.youtubeLinksEnabled,
      );
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
  @ApiOperationSummary('Delete an owned draft')
  @ApiZodParams(pageIdParamsSchema)
  @ApiNoContentResponse('The draft was deleted.')
  @ApiZodErrorResponses(401, 403, 404, 422, 500)
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

  @Post(':pageId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Publish an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(publishPageRequestSchema)
  @ApiZodResponse(
    pageLifecycleResponseSchema,
    200,
    'The published page lifecycle state.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  async publish(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(publishPageRequestSchema))
    body: PublishPageRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.publishPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        customSlug: body.customSlug,
        confirmReady: body.confirmReady,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Unpublish an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(unpublishPageRequestSchema)
  @ApiZodResponse(
    pageLifecycleResponseSchema,
    200,
    'The unpublished page lifecycle state.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  async unpublish(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(unpublishPageRequestSchema))
    body: UnpublishPageRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.unpublishPage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        confirm: body.confirm,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Archive an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodResponse(
    pageLifecycleResponseSchema,
    200,
    'The archived page lifecycle state.',
  )
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
  async archive(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.archivePage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Post(':pageId/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Restore an archived page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodResponse(
    pageLifecycleResponseSchema,
    200,
    'The restored page lifecycle state.',
  )
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
  async restore(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.restorePage({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }

  @Patch(':pageId/slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Change the slug of a published page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(changePublishedSlugRequestSchema)
  @ApiZodResponse(
    pageLifecycleResponseSchema,
    200,
    'The updated page lifecycle state.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  async changeSlug(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(changePublishedSlugRequestSchema))
    body: ChangePublishedSlugRequest,
  ): Promise<PageLifecycleResponse> {
    try {
      await this.rateLimitService?.consumeCreator(request.authSession.user.id);
      const lifecycle = await this.pageService.changePublishedSlug({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        customSlug: body.customSlug,
      });

      return toPageLifecycleResponse({
        ...lifecycle,
        appOrigin: this.appOrigin,
      });
    } catch (error: unknown) {
      throw mapPublicationError(error);
    }
  }
}

function mapPublicationError(error: unknown): unknown {
  if (error instanceof RateLimitExceededError) {
    return new ApiException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many requests',
      details: { retryAfterSeconds: error.retryAfterSeconds },
    });
  }

  if (error instanceof RateLimitUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'RATE_LIMIT_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }

  if (error instanceof PageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }

  if (error instanceof InvalidSlugError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_SLUG',
      message:
        'Choose a public slug using lowercase letters, numbers, and single hyphens',
    });
  }

  if (error instanceof SlugAlreadyTakenError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'SLUG_ALREADY_TAKEN',
      message: 'That public slug is already in use',
    });
  }

  if (error instanceof InvalidPageStateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'INVALID_STATE',
      message: 'This page cannot make that lifecycle change',
    });
  }

  if (error instanceof TemplateRequirementError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'TEMPLATE_REQUIREMENT_FAILED',
      message: 'Add a recipient name and message before publishing',
    });
  }

  if (error instanceof ConfirmationRequiredError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'CONFIRMATION_REQUIRED',
      message: 'Explicit confirmation is required',
    });
  }

  if (error instanceof SlugAllocationFailedError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SLUG_ALLOCATION_FAILED',
      message: 'The public slug could not be reserved',
    });
  }

  if (error instanceof TemplateDefinitionUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'TEMPLATE_DEFINITION_UNAVAILABLE',
      message: 'Template definition unavailable',
    });
  }

  return error;
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
