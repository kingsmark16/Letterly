import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { Inject, Optional } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { ApiException } from '../../infrastructure/http/api-exception';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';
import { resetPrismaAfterTransientError } from '../../infrastructure/database/prisma-recovery';
import { auth } from './infrastructure/better-auth';

const SESSION_READ_ATTEMPTS = 3;
const SESSION_RETRY_BASE_DELAY_MS = 100;
const transientSessionErrorCodes = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'P1001',
  'P1002',
  'P2024',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '57P01',
  '57P02',
  '57P03',
]);

function isTransientSessionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: string; cause?: unknown };

  return (
    (candidate.code !== undefined &&
      transientSessionErrorCodes.has(candidate.code)) ||
    (candidate.cause !== undefined && isTransientSessionError(candidate.cause))
  );
}

async function waitBeforeSessionRetry(attempt: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, SESSION_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  });
}

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type AuthenticatedRequest = Request & {
  authSession: AuthSession;
};

@Injectable()
export class BetterAuthSessionGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(PRISMA_CLIENT)
    private readonly prisma?: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const headers = fromNodeHeaders(request.headers);
    let session: AuthSession | null = null;

    for (let attempt = 1; attempt <= SESSION_READ_ATTEMPTS; attempt += 1) {
      try {
        session = await auth.api.getSession({ headers });
        break;
      } catch (error: unknown) {
        if (
          attempt === SESSION_READ_ATTEMPTS ||
          !isTransientSessionError(error)
        ) {
          throw error;
        }

        // Better Auth and the Nest provider share the runtime Prisma client.
        // Reset its pool before retrying so a timed-out connection is not
        // reused for every attempt.
        if (this.prisma) {
          await resetPrismaAfterTransientError(this.prisma, error);
        }
        await waitBeforeSessionRetry(attempt);
      }
    }

    if (!session) {
      throw new ApiException({
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    if (this.prisma) {
      const user = await this.prisma.user.findUnique({
        where: { id: session.user.id },
        select: { moderationStatus: true },
      });

      if (!user) {
        throw new ApiException({
          statusCode: 401,
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        });
      }

      if (user.moderationStatus === 'DISABLED') {
        const sessionId = (session as unknown as { session?: { id?: string } })
          .session?.id;
        if (sessionId) {
          await this.prisma.session.deleteMany({ where: { id: sessionId } });
        }
        throw new ApiException({
          statusCode: 403,
          code: 'ACCOUNT_DISABLED',
          message: 'This account is unavailable',
        });
      }
    }

    request.authSession = session;
    return true;
  }
}
