import type { INestApplication } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { json } from 'express';
import type { NextFunction, Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter';
import { writeApiError } from './api-error-writer';
import {
  getRequestId,
  isBetterAuthRequest,
  requestContextMiddleware,
  type RequestWithContext,
} from './request-context';
import { RequestTimingInterceptor } from './request-timing.interceptor';

function isMalformedJson(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}

function isBodyTooLarge(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  );
}

export function configureHttpApplication(app: INestApplication): void {
  app.use(requestContextMiddleware);

  const jsonBodyParser = json({ limit: '128kb' });
  app.use(
    (request: RequestWithContext, response: Response, next: NextFunction) => {
      if (isBetterAuthRequest(request)) {
        next();
        return;
      }

      jsonBodyParser(request, response, (error?: unknown) => {
        if (isMalformedJson(error)) {
          if (request.originalUrl?.includes('/submissions')) {
            response.setHeader('Cache-Control', 'no-store');
          }
          writeApiError(response, getRequestId(request, response), {
            statusCode: 400,
            code: 'BAD_REQUEST',
            message: 'Request cannot be processed',
          });
          return;
        }

        if (isBodyTooLarge(error)) {
          if (request.originalUrl?.includes('/submissions')) {
            response.setHeader('Cache-Control', 'no-store');
          }
          writeApiError(response, getRequestId(request, response), {
            statusCode: 413,
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body is too large',
          });
          return;
        }

        next(error);
      });
    },
  );

  const adapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new ApiExceptionFilter(adapterHost));
  app.useGlobalInterceptors(new RequestTimingInterceptor());
}
