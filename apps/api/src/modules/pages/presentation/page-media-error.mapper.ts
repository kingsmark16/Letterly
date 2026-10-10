import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import { PagePasswordConfigurationError } from '../application/page-password.service';
import {
  MediaImageAttachedError,
  MediaImageLimitError,
  MediaImageNotReadyError,
  MediaImageProcessingError,
  MediaImageProcessingFailedError,
  MediaImageRetryUnavailableError,
  MediaPageNotFoundError,
  MediaRateLimitError,
  MediaStorageError,
} from '../application/page-media.service';

export function mapMediaError(error: unknown, publicRead = false): unknown {
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

  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }

  if (error instanceof MediaPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: publicRead ? 'This letter is not available' : 'Page not found',
    });
  }

  if (error instanceof MediaImageLimitError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_LIMIT_REACHED',
      message: 'The letter image limit has been reached',
    });
  }

  if (error instanceof MediaImageProcessingError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_PROCESSING',
      message: 'The image is already processing',
    });
  }

  if (error instanceof MediaImageNotReadyError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_NOT_READY',
      message: 'The image is not ready',
    });
  }

  if (error instanceof MediaImageAttachedError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'IMAGE_ATTACHED',
      message: 'Attached images are changed through page save',
    });
  }

  if (error instanceof MediaImageRetryUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_RETRY_UNAVAILABLE',
      message: 'The image cannot be retried',
    });
  }

  if (error instanceof MediaImageProcessingFailedError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'IMAGE_PROCESSING_FAILED',
      message: 'The image could not be processed',
    });
  }

  if (error instanceof MediaRateLimitError) {
    return new ApiException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: 'Too many image operations',
    });
  }

  if (error instanceof MediaStorageError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Image storage is temporarily unavailable',
    });
  }

  if (publicRead) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }

  return error;
}
