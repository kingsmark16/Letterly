import type { ExecutionContext } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { ApiException } from '../../infrastructure/http/api-exception';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { AdminGuard } from './admin.guard';

function contextFor(request: AuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => request as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

function request(): AuthenticatedRequest {
  return {
    authSession: { user: { id: 'admin-1' } },
  } as unknown as AuthenticatedRequest;
}

describe('AdminGuard', () => {
  it('allows an active administrator', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'ADMIN',
          moderationStatus: 'ACTIVE',
        }),
      },
    } as unknown as PrismaClient;

    await expect(
      new AdminGuard(prisma).canActivate(contextFor(request())),
    ).resolves.toBe(true);
  });

  it('rejects creators with the stable administrator error', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'CREATOR',
          moderationStatus: 'ACTIVE',
        }),
      },
    } as unknown as PrismaClient;

    const error = await new AdminGuard(prisma)
      .canActivate(contextFor(request()))
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 403,
      code: 'ADMIN_REQUIRED',
    });
  });

  it('rejects a disabled administrator as an unavailable account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          role: 'ADMIN',
          moderationStatus: 'DISABLED',
        }),
      },
    } as unknown as PrismaClient;

    const error = await new AdminGuard(prisma)
      .canActivate(contextFor(request()))
      .catch((value: unknown) => value);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_DISABLED',
    });
  });
});
