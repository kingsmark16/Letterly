import * as Sentry from '@sentry/node';
import type { ErrorEvent, Event } from '@sentry/node';
import { Injectable, Logger } from '@nestjs/common';
import { loadConfig, type AppConfig } from '@letterly/config';

export const SAFE_MONITORING = Symbol('SAFE_MONITORING');

export const safeMetricNames = [
  'admin_request_total',
  'admin_mutation_total',
  'public_report_total',
  'moderation_purge_total',
  'moderation_purge_age_seconds',
  'restore_drill_total',
] as const;

export type SafeMetricName = (typeof safeMetricNames)[number];

export type SafeMonitoringContext = {
  route?: string;
  operation?: string;
  outcome?: string;
  errorCode?: string;
  provider?: string;
};

export interface SafeMonitoringPort {
  captureException(error: unknown, context?: SafeMonitoringContext): void;
  recordMetric(
    name: SafeMetricName,
    value?: number,
    context?: SafeMonitoringContext,
  ): void;
}

type MonitoringConfig = Pick<
  AppConfig,
  | 'SENTRY_DSN'
  | 'SENTRY_ENVIRONMENT'
  | 'SENTRY_RELEASE'
  | 'SENTRY_TRACES_SAMPLE_RATE'
>;

const allowedTagKeys = new Set([
  'route',
  'operation',
  'outcome',
  'errorCode',
  'provider',
  'environment',
]);

function safeContext(
  context: SafeMonitoringContext | undefined,
  environment: string,
): Record<string, string> {
  const values: Record<string, string> = { environment };
  for (const [key, value] of Object.entries(context ?? {})) {
    if (allowedTagKeys.has(key) && typeof value === 'string' && value.length) {
      if (
        key === 'route' &&
        (!/^\/(?:api\/|health$|$)/.test(value) ||
          value.includes('?') ||
          value.includes('#'))
      ) {
        continue;
      }
      values[key] = value.slice(0, 80);
    }
  }
  return values;
}

function redactExceptionValue(
  value: NonNullable<NonNullable<Event['exception']>['values']>[number],
) {
  return {
    type: value.type,
    mechanism: value.mechanism
      ? {
          type: value.mechanism.type,
          handled: value.mechanism.handled,
        }
      : undefined,
  };
}

/**
 * Removes request data, identity, breadcrumbs, messages, and stack contents.
 * Only the explicitly allowlisted operational tags and exception type remain.
 */
export function redactSentryEvent(event: ErrorEvent): ErrorEvent {
  const tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).filter(([key]) => allowedTagKeys.has(key)),
  );

  return {
    event_id: event.event_id,
    type: undefined,
    level: event.level,
    platform: event.platform,
    release: event.release,
    environment: event.environment,
    tags,
    exception: event.exception?.values
      ? { values: event.exception.values.map(redactExceptionValue) }
      : undefined,
  };
}

@Injectable()
export class SafeMonitoring implements SafeMonitoringPort {
  private readonly logger = new Logger(SafeMonitoring.name);
  private readonly config: MonitoringConfig;
  private readonly sentryEnabled: boolean;

  constructor(config: MonitoringConfig = loadConfig()) {
    this.config = config;
    this.sentryEnabled = Boolean(config.SENTRY_DSN);

    if (config.SENTRY_DSN) {
      try {
        Sentry.init({
          dsn: config.SENTRY_DSN,
          environment: config.SENTRY_ENVIRONMENT,
          release: config.SENTRY_RELEASE,
          tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
          beforeSend: redactSentryEvent,
        });
      } catch {
        // Monitoring is intentionally non-critical. The application remains
        // available when the provider cannot initialize.
        this.logger.warn({
          operation: 'monitoring_init',
          outcome: 'disabled',
        });
      }
    }
  }

  captureException(error: unknown, context?: SafeMonitoringContext): void {
    const tags = safeContext(context, this.config.SENTRY_ENVIRONMENT);
    this.logger.error({
      operation: 'monitoring_exception',
      outcome: 'captured',
      errorCode: tags.errorCode ?? 'INTERNAL_SERVER_ERROR',
      route: tags.route,
    });

    if (!this.sentryEnabled) return;
    try {
      Sentry.withScope((scope) => {
        scope.setTags(tags);
        Sentry.captureException(error);
      });
    } catch {
      // A monitoring provider outage must never fail a user request.
    }
  }

  recordMetric(
    name: SafeMetricName,
    value = 1,
    context?: SafeMonitoringContext,
  ): void {
    if (!safeMetricNames.includes(name)) return;
    const boundedValue = Number.isFinite(value)
      ? Math.max(0, Math.min(value, 1_000_000))
      : 0;
    this.logger.log({
      metric: name,
      value: boundedValue,
      ...safeContext(context, this.config.SENTRY_ENVIRONMENT),
    });
  }
}
