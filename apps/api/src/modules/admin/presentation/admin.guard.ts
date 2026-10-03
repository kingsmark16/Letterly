import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ApiException } from '../../../infrastructure/http/api-exception';
import { AdminAccessService } from '../application/admin-access.service';
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @Inject(AdminAccessService)
    private readonly access: AdminAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const result = await this.access.check(request.authSession.user.id);

    if (result === 'disabled') {
      throw new ApiException({
        statusCode: 403,
        code: 'ACCOUNT_DISABLED',
        message: 'This account is unavailable',
      });
    }

    if (result === 'admin_required') {
      throw new ApiException({
        statusCode: 403,
        code: 'ADMIN_REQUIRED',
        message: 'Administrator access required',
      });
    }

    return true;
  }
}
