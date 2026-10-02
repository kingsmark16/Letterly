import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import { PagePasswordConfigurationError } from '../application/page-password.service';
import {
  PublicReportPageNotFoundError,
  PublicReportUnavailableError,
} from '../application/page-reports.service';
import {
  DuplicateSubmissionError,
  InvalidSubmissionBranchError,
  SubmissionCapabilityUnavailableError,
  SubmissionConfirmationRequiredError,
  SubmissionIdempotencyConflictError,
  SubmissionNotFoundError,
  SubmissionPageNotFoundError,
} from '../application/page-submissions.service';
import {
  PageJourneySubmissionCapabilityError,
  PageJourneySubmissionDuplicateError,
  PageJourneySubmissionIdempotencyConflictError,
  PageJourneySubmissionInvalidBranchError,
  PageJourneySubmissionNotFoundError,
  PageJourneySubmissionVersionConflictError,
} from '../application/page-journey-submissions.service';

export function mapSubmissionError(error: unknown): unknown {
  if (error instanceof ApiException) {
    return error;
  }
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
  if (
    error instanceof SubmissionPageNotFoundError ||
    error instanceof SubmissionNotFoundError
  ) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof InvalidSubmissionBranchError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The response does not follow the question path',
    });
  }
  if (error instanceof SubmissionCapabilityUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support this response',
    });
  }
  if (error instanceof DuplicateSubmissionError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_SUBMISSION',
      message: 'This browser has already submitted a response',
    });
  }
  if (error instanceof SubmissionIdempotencyConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'That idempotency key was already used for another response',
    });
  }
  if (error instanceof PageJourneySubmissionNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof PageJourneySubmissionCapabilityError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support this response',
    });
  }
  if (error instanceof PageJourneySubmissionInvalidBranchError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'INVALID_BRANCH',
      message: 'The response does not follow the journey path',
    });
  }
  if (error instanceof PageJourneySubmissionVersionConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'JOURNEY_VERSION_STALE',
      message: 'The journey has changed since it was opened',
    });
  }
  if (error instanceof PageJourneySubmissionDuplicateError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'DUPLICATE_SUBMISSION',
      message: 'This browser has already submitted a response',
    });
  }
  if (error instanceof PageJourneySubmissionIdempotencyConflictError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IDEMPOTENCY_CONFLICT',
      message: 'That idempotency key was already used for another response',
    });
  }
  if (error instanceof SubmissionConfirmationRequiredError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'CONFIRMATION_REQUIRED',
      message: 'Explicit confirmation is required',
    });
  }
  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }
  if (error instanceof PublicReportPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'This letter is not available',
    });
  }
  if (error instanceof PublicReportUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Report service temporarily unavailable',
    });
  }

  return error;
}
