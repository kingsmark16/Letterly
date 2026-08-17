import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
};

export function isBetterAuthRequest(request: Request): boolean {
  return request.path === '/api/auth' || request.path.startsWith('/api/auth/');
}

export function requestContextMiddleware(
  request: RequestWithContext,
  response: Response,
  next: NextFunction,
): void {
  if (isBetterAuthRequest(request)) {
    next();
    return;
  }

  request.requestId = randomUUID();
  response.setHeader('X-Request-ID', request.requestId);
  next();
}

export function getRequestId(
  request: RequestWithContext,
  response: Response,
): string {
  if (!request.requestId) {
    request.requestId = randomUUID();
    response.setHeader('X-Request-ID', request.requestId);
  }

  return request.requestId;
}
