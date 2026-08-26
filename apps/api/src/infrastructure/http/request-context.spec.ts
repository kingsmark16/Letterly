import type { Request, Response } from 'express';
import {
  getRequestId,
  requestContextMiddleware,
  type RequestWithContext,
} from './request-context';

function createResponse(): jest.Mocked<Pick<Response, 'setHeader'>> {
  return {
    setHeader: jest.fn(),
  };
}

describe('requestContextMiddleware', () => {
  it('AC-7 ignores a client supplied request ID and creates a server UUID', () => {
    const request = {
      path: '/api/v1/pages',
      headers: {
        'x-request-id': 'forged-browser-value',
      },
    } as unknown as RequestWithContext;
    const response = createResponse();
    const next = jest.fn();

    requestContextMiddleware(request, response as unknown as Response, next);

    expect(request.requestId).toEqual(expect.any(String));
    expect(request.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(request.requestId).not.toBe('forged-browser-value');
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      request.requestId,
    );
    expect(next).toHaveBeenCalledWith();
  });

  it('AC-7 preserves Better Auth raw routes', () => {
    const request = {
      path: '/api/auth/callback/google',
    } as unknown as RequestWithContext;
    const response = createResponse();
    const next = jest.fn();

    requestContextMiddleware(request, response as unknown as Response, next);

    expect(request.requestId).toBeUndefined();
    expect(response.setHeader).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('creates a request ID for an error path that has no earlier context', () => {
    const request = {
      path: '/api/v1/pages',
    } as unknown as RequestWithContext;
    const response = createResponse();

    const requestId = getRequestId(request, response as unknown as Response);

    expect(requestId).toEqual(expect.any(String));
    expect(response.setHeader).toHaveBeenCalledWith('X-Request-ID', requestId);
  });

  it('keeps administrator responses private before authentication guards run', () => {
    const request = {
      path: '/api/v1/admin/reports',
    } as unknown as RequestWithContext;
    const response = createResponse();

    requestContextMiddleware(
      request,
      response as unknown as Response,
      jest.fn(),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
  });

  it('keeps public report responses uncacheable and out of search indexes', () => {
    const request = {
      path: '/api/v1/public/pages/a-safe-slug/reports',
    } as unknown as RequestWithContext;
    const response = createResponse();

    requestContextMiddleware(
      request,
      response as unknown as Response,
      jest.fn(),
    );

    expect(response.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'no-store',
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'X-Robots-Tag',
      'noindex, nofollow, noarchive',
    );
  });
});
