import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import type { Request, Response } from 'express';
import { isBetterAuthRequest } from './request-context';

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    if (isBetterAuthRequest(request)) {
      return next.handle();
    }

    const response = http.getResponse<Response>();
    const startedAt = performance.now();

    return next.handle().pipe(
      finalize(() => {
        if (!response.headersSent) {
          response.setHeader(
            'X-Response-Time',
            `${Math.round(performance.now() - startedAt)}ms`,
          );
        }
      }),
    );
  }
}
