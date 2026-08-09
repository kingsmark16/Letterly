jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn(),
}));

jest.mock('./infrastructure/better-auth', () => ({
  auth: {
    api: {
      getSession: jest.fn(),
    },
  },
}));

import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './infrastructure/better-auth';
import {
  BetterAuthSessionGuard,
  type AuthenticatedRequest,
  type AuthSession,
} from './better-auth-session.guard';

function createRequest(): AuthenticatedRequest {
  return {
    headers: {
      cookie: 'better-auth.session_token=test-session',
    },
  } as unknown as AuthenticatedRequest;
}

function createContext(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => request as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

describe('BetterAuthSessionGuard', () => {
  let guard: BetterAuthSessionGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new BetterAuthSessionGuard();

    jest.mocked(fromNodeHeaders).mockReturnValue(new Headers());
  });

  it('AC-8 attaches the verified Better Auth session to the request', async () => {
    const request = createRequest();
    const session = {
      user: {
        id: 'creator-123',
      },
    } as unknown as AuthSession;

    jest.mocked(auth.api.getSession).mockResolvedValue(session);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(jest.mocked(fromNodeHeaders).mock.calls).toEqual([
      [request.headers],
    ]);
    expect(jest.mocked(auth.api.getSession).mock.calls).toHaveLength(1);
    expect(request.authSession).toBe(session);
  });

  it('AC-8 rejects a request without a valid session', async () => {
    const request = createRequest();

    jest.mocked(auth.api.getSession).mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext(request)),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect('authSession' in request).toBe(false);
  });
});
