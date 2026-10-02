import { HttpStatus } from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  RateLimitExceededError,
  RateLimitUnavailableError,
} from '../../../infrastructure/http/rate-limit.service';
import { PagePasswordConfigurationError } from '../application/page-password.service';
import {
  AudioLinkCreationDisabledError,
  AudioLinkLookupUnavailableError,
  AudioLinkUnavailableError,
} from '../application/page-audio-link.service';
import {
  AudioCapabilityUnavailableError,
  AudioNotReadyError,
  AudioPageNotFoundError,
  AudioProcessingError,
  AudioRangeNotSatisfiableError,
  AudioRetryUnavailableError,
  AudioSourceOccupiedError,
  AudioStorageError,
  AudioUploadActiveError,
} from '../application/page-audio.service';
import { YouTubeLinkInvalidError } from '../application/youtube-url';

export function mapAudioError(error: unknown): unknown {
  if (error instanceof ApiException) return error;
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
  if (error instanceof AudioPageNotFoundError) {
    return new ApiException({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    });
  }
  if (error instanceof AudioCapabilityUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'UNSUPPORTED_CAPABILITY',
      message: 'This template does not support audio',
    });
  }
  if (error instanceof YouTubeLinkInvalidError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_LINK_INVALID',
      message: 'Paste a valid YouTube video link',
    });
  }
  if (error instanceof AudioLinkUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_LINK_UNAVAILABLE',
      message: 'This video is unavailable or cannot be embedded',
    });
  }
  if (error instanceof AudioLinkLookupUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'AUDIO_LINK_LOOKUP_UNAVAILABLE',
      message: 'YouTube could not be checked right now. Retry the link.',
    });
  }
  if (error instanceof AudioLinkCreationDisabledError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'AUDIO_LINKS_DISABLED',
      message: 'YouTube links are temporarily unavailable',
    });
  }
  if (error instanceof AudioSourceOccupiedError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_SOURCE_OCCUPIED',
      message: 'Remove the current song before adding another one',
    });
  }
  if (
    error instanceof AudioUploadActiveError ||
    error instanceof AudioProcessingError
  ) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_PROCESSING',
      message: 'Audio upload is still processing',
    });
  }
  if (error instanceof AudioNotReadyError) {
    return new ApiException({
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: 'AUDIO_VERIFICATION_FAILED',
      message: 'The audio file could not be verified',
    });
  }
  if (error instanceof AudioRetryUnavailableError) {
    return new ApiException({
      statusCode: HttpStatus.CONFLICT,
      code: 'AUDIO_RETRY_UNAVAILABLE',
      message: 'This audio upload cannot be retried',
    });
  }
  if (error instanceof AudioRangeNotSatisfiableError) {
    return new ApiException({
      statusCode: HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      code: 'AUDIO_RANGE_NOT_SATISFIABLE',
      message: 'The requested audio range is not satisfiable',
    });
  }
  if (error instanceof AudioStorageError) {
    return new ApiException({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'STORAGE_UNAVAILABLE',
      message: 'Media storage is temporarily unavailable',
    });
  }
  return error;
}
