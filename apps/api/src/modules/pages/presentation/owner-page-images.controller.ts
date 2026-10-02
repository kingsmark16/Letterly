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
  pageIdParamsSchema,
  type ImageIdParams,
  type ImageUploadRequest,
  type PageIdParams,
} from '@letterly/contracts/pages';
import type { Response } from 'express';
import { z } from 'zod';
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
