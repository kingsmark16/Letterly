import {
  apiErrorEnvelopeSchema,
  rateLimitedErrorDetailsSchema,
  type ApiErrorCode,
  type ApiErrorDetails,
} from '@letterly/contracts';
import type { Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetails;
}

export function writeApiError(
  response: Response,
  requestId: string,
  error: ApiErrorResponse,
): void {
  const body = apiErrorEnvelopeSchema.parse({
    ...error,
    requestId,
  });

  response.setHeader('X-Request-ID', requestId);

  if (body.code === 'RATE_LIMITED' && body.details) {
    const details = rateLimitedErrorDetailsSchema.parse(body.details);
    response.setHeader('Retry-After', details.retryAfterSeconds.toString());
  }

  response.status(body.statusCode).json(body);
}
