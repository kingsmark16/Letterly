import type { ApiErrorCode } from '@letterly/contracts';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ApiException, type ApiError } from './api-exception';
import { writeApiError } from './api-error-writer';
import {
  getRequestId,
  isBetterAuthRequest,
  type RequestWithContext,
} from './request-context';
import type { SafeMonitoringPort } from '../monitoring/safe-monitoring';

const statusCodeFallbacks: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHENTICATED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

const statusCodeMessages: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Request cannot be processed',
  [HttpStatus.UNAUTHORIZED]: 'Authentication required',
  [HttpStatus.FORBIDDEN]: 'Access denied',
  [HttpStatus.NOT_FOUND]: 'Resource not found',
  [HttpStatus.CONFLICT]: 'Request conflicts with current state',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'Request body is too large',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Request service temporarily unavailable',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly baseExceptionFilter: BaseExceptionFilter;

  constructor(
    adapterHost: HttpAdapterHost,
    private readonly monitoring?: SafeMonitoringPort,
  ) {
    this.baseExceptionFilter = new BaseExceptionFilter(adapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext>();
    const response = context.getResponse<Response>();

    if (isBetterAuthRequest(request)) {
      this.baseExceptionFilter.catch(exception, host);
      return;
    }

    if (response.headersSent) {
      return;
    }

    if (request.originalUrl?.includes('/submissions')) {
      response.setHeader('Cache-Control', 'no-store');
    }

    const requestId = getRequestId(request, response);
    const apiError = toApiError(exception);
    if (apiError.statusCode >= 500) {
      const route = (request as unknown as { route?: unknown }).route;
      const routePath =
        typeof route === 'object' &&
        route !== null &&
        'path' in route &&
        typeof route.path === 'string'
          ? route.path
          : 'unknown';
      try {
        this.monitoring?.captureException(exception, {
          route: routePath,
          outcome: 'error',
          errorCode: apiError.code,
        });
      } catch {
        // Monitoring is best effort and must not replace the safe API error.
      }
    }
    writeApiError(response, requestId, apiError);
  }
}

function toApiError(exception: unknown): ApiError {
  if (exception instanceof ApiException) {
    return exception.toApiError();
  }

  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();

    return {
      statusCode,
      code: statusCodeFallbacks[statusCode] ?? 'INTERNAL_SERVER_ERROR',
      message: safeMessageForStatus(statusCode),
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  };
}

function safeMessageForStatus(statusCode: number): string {
  return statusCodeMessages[statusCode] ?? 'An unexpected error occurred';
}
