import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiException } from '../../infrastructure/http/api-exception';
import { APP_ORIGIN } from '../pages/application/page.service';

function originFromRequest(request: Request): string | null {
  const origin = request.headers.origin;
  if (typeof origin === 'string' && origin.length > 0) {
    return origin;
  }

  const referer = request.headers.referer;
  if (typeof referer === 'string' && referer.length > 0) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

@Injectable()
export class AdminOriginGuard implements CanActivate {
  constructor(
    @Inject(APP_ORIGIN)
    private readonly appOrigin: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.headers.cookie) {
      return true;
    }

    const requestOrigin = originFromRequest(request);
    const csrfToken = request.headers['x-csrf-token'];
    if (
      requestOrigin !== this.appOrigin ||
      typeof csrfToken !== 'string' ||
      csrfToken.trim().length === 0
    ) {
      throw new ApiException({
        statusCode: 403,
        code: 'CSRF_ORIGIN_INVALID',
        message: 'Request origin could not be verified',
      });
    }

    return true;
  }
}
