import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Optional,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import type { Request, Response } from 'express';
import { isBetterAuthRequest } from './request-context';
import type { SafeMonitoringPort } from '../monitoring/safe-monitoring';

@Injectable()
export class RequestTimingInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly monitoring?: SafeMonitoringPort) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();

    if (isBetterAuthRequest(request)) {
      return next.handle();
    }

    const response = http.getResponse<Response>();
    const startedAt = performance.now();
    const route = (request as unknown as { route?: unknown }).route;
    const routePath =
      typeof route === 'object' &&
      route !== null &&
      'path' in route &&
      typeof route.path === 'string'
        ? route.path
        : undefined;
    const isAdminRequest = request.path.startsWith('/api/v1/admin/');
    const isPublicReport =
      request.method === 'POST' &&
      request.path.startsWith('/api/v1/public/pages/') &&
      request.path.endsWith('/reports');

    try {
      if (isAdminRequest) {
        this.monitoring?.recordMetric('admin_request_total', 1, {
          route: routePath,
          operation: 'admin_request',
        });
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          this.monitoring?.recordMetric('admin_mutation_total', 1, {
            route: routePath,
            operation: 'admin_mutation',
          });
        }
      }
      if (isPublicReport) {
        this.monitoring?.recordMetric('public_report_total', 1, {
          route: routePath,
          operation: 'public_report',
        });
      }
    } catch {
      // Metrics are best effort and must not fail the user request.
    }

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
