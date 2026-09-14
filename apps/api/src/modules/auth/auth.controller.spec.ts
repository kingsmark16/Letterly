import type { Response } from 'express';
import type { RequestWithContext } from '../../infrastructure/http/request-context';

const mockAuthHandler = jest.fn().mockResolvedValue(undefined);

jest.mock('better-auth/node', () => ({
  toNodeHandler: jest.fn(() => mockAuthHandler),
}));

jest.mock('./infrastructure/better-auth', () => ({
  auth: {},
}));

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('adds no-store security headers and forwards the raw request to Better Auth', async () => {
    const controller = new AuthController();
    const request = {
      headers: {
        'cf-connecting-ip': '198.51.100.10',
        'x-forwarded-for': '198.51.100.10',
        'x-real-ip': '198.51.100.10',
        'x-letterly-client-ip': '198.51.100.10',
      },
      ip: '203.0.113.10',
      requestId: undefined,
    } as unknown as RequestWithContext;
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;

    await controller.handle(request, response);

    expect(request.headers['x-request-id']).toEqual(expect.any(String));
    expect(request.headers['x-letterly-client-ip']).toBe('203.0.113.10');
    expect(request.headers['cf-connecting-ip']).toBeUndefined();
    expect(request.headers['x-forwarded-for']).toBeUndefined();
    expect(request.headers['x-real-ip']).toBeUndefined();
    expect(setHeader).toHaveBeenCalledWith(
      'X-Request-ID',
      request.headers['x-request-id'],
    );
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(setHeader).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer');
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(mockAuthHandler).toHaveBeenCalledWith(request, response);
  });
});
