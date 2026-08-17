import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';
import { of } from 'rxjs';
import { RequestTimingInterceptor } from './request-timing.interceptor';

function createContext(path: string, response: Response): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => ({ path }) as T,
      getResponse: <T>(): T => response as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

describe('RequestTimingInterceptor', () => {
  it('adds a response time to ordinary NestJS routes', () => {
    const setHeader = jest.fn();
    const response = {
      headersSent: false,
      setHeader,
    } as unknown as Response;
    const interceptor = new RequestTimingInterceptor();
    const handler = {
      handle: () => of('ok'),
    } as CallHandler;

    interceptor
      .intercept(createContext('/api/v1/pages', response), handler)
      .subscribe();

    expect(setHeader).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/),
    );
  });

  it('preserves Better Auth raw routes', () => {
    const setHeader = jest.fn();
    const response = {
      headersSent: false,
      setHeader,
    } as unknown as Response;
    const interceptor = new RequestTimingInterceptor();
    const handler = {
      handle: () => of('ok'),
    } as CallHandler;

    interceptor
      .intercept(createContext('/api/auth/callback/google', response), handler)
      .subscribe();

    expect(setHeader).not.toHaveBeenCalled();
  });
});
