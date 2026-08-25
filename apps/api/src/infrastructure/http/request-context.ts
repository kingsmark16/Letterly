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

  if (request.path.startsWith('/api/v1/admin/')) {
    response.setHeader('Cache-Control', 'private, no-store');
  } else if (
    request.path.startsWith('/api/v1/public/pages/') &&
    request.path.endsWith('/reports')
  ) {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
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
