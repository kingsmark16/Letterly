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
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  imageIdParamsSchema,
  imageOperationResponseSchema,
  imageUploadRequestSchema,
  imageUploadResponseSchema,
  ownerPageImageSchema,
  ownerPageImagesResponseSchema,
  pageIdParamsSchema,
  type ImageIdParams,
  type ImageUploadRequest,
  type PageIdParams,
} from '@letterly/contracts/pages';
import type { Response } from 'express';
import { z } from 'zod';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiBetterAuthSession,
  ApiFileResponse,
  ApiNoContentResponse,
  ApiOperationSummary,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
} from '../../auth/better-auth-session.guard';
import {
  MediaStorageError,
  PageMediaService,
} from '../application/page-media.service';
import { mapMediaError } from './page-media-error.mapper';

@ApiTags('Owner Page Media')
@ApiBetterAuthSession()
@UseGuards(BetterAuthSessionGuard)
@Controller('api/v1/pages')
export class OwnerPageImagesController {
  constructor(
    @Optional()
    @Inject(PageMediaService)
    private readonly pageMediaService?: PageMediaService,
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
  ) {}

  @Post(':pageId/images/uploads')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Prepare an image upload for an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodBody(imageUploadRequestSchema)
  @ApiZodResponse(
    imageUploadResponseSchema,
    200,
    'The signed image upload instructions.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  async prepareImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
    @Body(new ZodValidationPipe(imageUploadRequestSchema))
    body: ImageUploadRequest,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      await this.rateLimitService?.consumeCreatorImageUpload(
        request.authSession.user.id,
      );
      return imageUploadResponseSchema.parse(
        await this.pageMediaService.prepareUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          ...body,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Get(':pageId/images')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperationSummary('List image uploads for an owned page')
  @ApiZodParams(pageIdParamsSchema)
  @ApiZodResponse(
    ownerPageImagesResponseSchema,
    200,
    'The page image upload states.',
  )
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
  async listImages(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(pageIdParamsSchema))
    params: PageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return z.array(ownerPageImageSchema).parse(
        await this.pageMediaService.listOwnerImages({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Post(':pageId/images/:imageId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Complete image upload processing')
  @ApiZodParams(imageIdParamsSchema)
  @ApiZodResponse(
    imageOperationResponseSchema,
    200,
    'The processed image state.',
  )
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
  async completeImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return imageOperationResponseSchema.parse(
        await this.pageMediaService.completeUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          imageId: params.imageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Post(':pageId/images/:imageId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperationSummary('Retry an image upload')
  @ApiZodParams(imageIdParamsSchema)
  @ApiZodResponse(
    imageUploadResponseSchema,
    200,
    'The refreshed signed upload instructions.',
  )
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
  async retryImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ) {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      return imageUploadResponseSchema.parse(
        await this.pageMediaService.retryUpload({
          creatorId: request.authSession.user.id,
          pageId: params.pageId,
          imageId: params.imageId,
        }),
      );
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Delete(':pageId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperationSummary('Remove an image upload from an owned page')
  @ApiZodParams(imageIdParamsSchema)
  @ApiNoContentResponse('The image upload was removed.')
  @ApiZodErrorResponses(401, 403, 404, 409, 422, 429, 500, 503)
  async removeImageUpload(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
  ): Promise<void> {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      await this.pageMediaService.removeUpload({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        imageId: params.imageId,
      });
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }

  @Get(':pageId/images/:imageId')
  @Header('Cache-Control', 'no-store')
  @ApiOperationSummary('Get image media for an owned page')
  @ApiZodParams(imageIdParamsSchema)
  @ApiFileResponse('image/webp', 'The processed image media.')
  @ApiZodErrorResponses(401, 403, 404, 422, 429, 500, 503)
  async getOwnerImage(
    @Req() request: AuthenticatedRequest,
    @Param(new ZodValidationPipe(imageIdParamsSchema))
    params: ImageIdParams,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (!this.pageMediaService) throw new MediaStorageError();
      const body = await this.pageMediaService.getOwnerMedia({
        creatorId: request.authSession.user.id,
        pageId: params.pageId,
        imageId: params.imageId,
      });
      response.setHeader('Content-Type', 'image/webp');
      response.setHeader('Cache-Control', 'no-store');
      response.send(body);
    } catch (error: unknown) {
      throw mapMediaError(error);
    }
  }
}
