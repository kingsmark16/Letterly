import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { publicPageSlugParamsSchema } from '@letterly/contracts/pages';
import {
  publicSubmissionRequestSchema,
  visitorSubmissionResponseSchema,
  type PublicSubmissionRequest,
} from '@letterly/contracts/submissions';
import type { Request } from 'express';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  ApiOperationSummary,
  ApiVisitorCookie,
  ApiZodBody,
  ApiZodErrorResponses,
  ApiZodParams,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  hashBrowserToken,
  readBrowserToken,
} from '../../../infrastructure/http/browser-token';
import { RateLimitService } from '../../../infrastructure/http/rate-limit.service';
import { readUnlockToken } from '../../../infrastructure/http/unlock-cookie';
import { VISITOR_IDENTITY_SECRET } from '../../../infrastructure/http/visitor-identity';
import { ZodValidationPipe } from '../../../infrastructure/http/zod-validation.pipe';
import { PageJourneySubmissionService } from '../application/page-journey-submissions.service';
import { PagePasswordService } from '../application/page-password.service';
import {
  PageSubmissionsService,
  SubmissionPageNotFoundError,
} from '../application/page-submissions.service';
import { mapSubmissionError } from './page-submission-error.mapper';

@ApiTags('Public Pages')
@Controller('api/v1/public/pages')
export class PublicPageSubmissionsController {
  constructor(
    @Optional()
    @Inject(RateLimitService)
    private readonly rateLimitService?: RateLimitService,
    @Optional()
    @Inject(VISITOR_IDENTITY_SECRET)
    private readonly visitorIdentitySecret?: string,
    @Optional()
    @Inject(PageSubmissionsService)
    private readonly pageSubmissionsService?: PageSubmissionsService,
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(PageJourneySubmissionService)
    private readonly pageJourneySubmissionService?: PageJourneySubmissionService,
  ) {}

  @Post(':slug/submissions')
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ApiOperationSummary('Submit a private response to a public page')
  @ApiZodParams(publicPageSlugParamsSchema)
  @ApiZodBody(publicSubmissionRequestSchema)
  @ApiVisitorCookie(
    'Required letterly_browser cookie. Password protected pages also require their page scoped letterly_unlock cookie.',
    true,
  )
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Required for Choose Your Heart journey submissions. Secret Letter submissions carry the idempotency key in the JSON body.',
  })
  @ApiZodResponse(
    visitorSubmissionResponseSchema,
    201,
    'The response was accepted for the page creator.',
  )
  @ApiZodErrorResponses(400, 401, 403, 404, 409, 413, 422, 429, 500, 503)
  async submit(
    @Param(new ZodValidationPipe(publicPageSlugParamsSchema))
    params: { slug: string },
    @Req() request: Request,
    @Body(new ZodValidationPipe(publicSubmissionRequestSchema))
    body: PublicSubmissionRequest,
  ) {
    try {
      if (
        (!this.pageSubmissionsService && !this.pageJourneySubmissionService) ||
        !this.visitorIdentitySecret
      ) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }

      const browserToken = readBrowserToken(request);
      if (!browserToken) {
        throw new ApiException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          code: 'COOKIE_REQUIRED',
          message: 'A browser cookie is required to submit a response',
        });
      }

      const normalizedSlug = params.slug.trim().toLowerCase();
      const isJourneySubmission = 'publishedGraphVersion' in body;
      const rawIdempotencyHeader =
        typeof request.header === 'function'
          ? request.header('Idempotency-Key')
          : request.headers['idempotency-key'];
      const headerIdempotencyKey = (
        Array.isArray(rawIdempotencyHeader)
          ? rawIdempotencyHeader[0]
          : rawIdempotencyHeader
      )?.trim();
      if (isJourneySubmission && !headerIdempotencyKey) {
        throw new ApiException({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'BAD_REQUEST',
          message: 'An Idempotency-Key header is required',
        });
      }
      const idempotencyKey = isJourneySubmission
        ? headerIdempotencyKey
        : body.idempotencyKey;
      const pageScope = isJourneySubmission
        ? await this.pageJourneySubmissionService?.findPublicPageScope(
            normalizedSlug,
          )
        : await this.pageSubmissionsService?.findPublicPageScope(
            normalizedSlug,
          );
      if (!pageScope) {
        throw new SubmissionPageNotFoundError();
      }
      let observedPasswordVersion: string | null | undefined;
      if (this.pagePasswordService) {
        const protection =
          await this.pagePasswordService.findPublicProtection(normalizedSlug);
        observedPasswordVersion = protection?.passwordVersion ?? null;
        if (protection) {
          const unlocked = await this.pagePasswordService.verifyUnlockToken(
            protection.pageId,
            protection.passwordVersion,
            readUnlockToken(request, protection.pageId),
          );
          if (!unlocked) {
            throw new ApiException({
              statusCode: HttpStatus.UNAUTHORIZED,
              code: 'PAGE_LOCKED',
              message: 'Unlock this letter before submitting a response',
            });
          }
        }
      }
      const browserTokenHash = hashBrowserToken(
        pageScope,
        browserToken,
        this.visitorIdentitySecret,
      );
      await this.rateLimitService?.consumeVisitorSubmission(
        pageScope,
        browserTokenHash,
      );

      if (isJourneySubmission) {
        if (!this.pageJourneySubmissionService) {
          throw new ApiException({
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            code: 'SERVICE_UNAVAILABLE',
            message: 'Journey response service unavailable',
          });
        }
        return visitorSubmissionResponseSchema.parse(
          await this.pageJourneySubmissionService.submit({
            slug: normalizedSlug,
            browserTokenHash,
            idempotencyKey: idempotencyKey as string,
            publishedGraphVersion: body.publishedGraphVersion,
            answers: body.answers,
            outcomeKey: body.outcomeKey,
            visitorMessage: body.visitorMessage,
            observedPasswordVersion,
          }),
        );
      }

      if (!this.pageSubmissionsService) {
        throw new ApiException({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Submission service unavailable',
        });
      }
      return visitorSubmissionResponseSchema.parse(
        await this.pageSubmissionsService.submit({
          slug: normalizedSlug,
          browserTokenHash,
          idempotencyKey: body.idempotencyKey,
          answers: body.answers,
          visitorMessage: body.visitorMessage
            ? { message: body.visitorMessage }
            : undefined,
          observedPasswordVersion,
        }),
      );
    } catch (error: unknown) {
      throw mapSubmissionError(error);
    }
  }
}
