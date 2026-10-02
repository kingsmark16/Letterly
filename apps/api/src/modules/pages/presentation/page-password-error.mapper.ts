import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import {
  InvalidPagePasswordError,
  PagePasswordConfigurationError,
  PagePasswordNotFoundError,
} from '../application/page-password.service';

export function mapPasswordError(error: unknown): unknown {
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
  if (error instanceof PagePasswordNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof InvalidPagePasswordError) {
    return new ApiException({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'INVALID_PASSWORD',
      message: 'The password is incorrect',
    });
  }
  if (error instanceof PagePasswordConfigurationError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'PASSWORD_CONFIGURATION',
      message: 'Page password protection is temporarily unavailable',
    });
  }

  return error;
}
