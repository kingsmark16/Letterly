import type { HealthIndicatorFunction } from '@nestjs/terminus';

export const HEALTH_CHECK_SERVICE = Symbol('HEALTH_CHECK_SERVICE');
export const POSTGRES_HEALTH_INDICATOR = Symbol('POSTGRES_HEALTH_INDICATOR');
export const CRITICAL_REDIS_HEALTH_INDICATOR = Symbol(
  'CRITICAL_REDIS_HEALTH_INDICATOR',
);

export interface HealthCheckPort {
  check(indicators: HealthIndicatorFunction[]): Promise<unknown>;
}
