import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { ApiException } from '../../infrastructure/http/api-exception';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma-token';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.authSession.user.id },
      select: { role: true, moderationStatus: true },
    });

    if (user?.moderationStatus === 'DISABLED') {
      throw new ApiException({
        statusCode: 403,
        code: 'ACCOUNT_DISABLED',
        message: 'This account is unavailable',
      });
    }

    if (user?.role !== 'ADMIN') {
      throw new ApiException({
        statusCode: 403,
        code: 'ADMIN_REQUIRED',
        message: 'Administrator access required',
      });
    }

    return true;
  }
}
