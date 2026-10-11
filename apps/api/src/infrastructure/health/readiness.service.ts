import { BeforeApplicationShutdown, Inject, Injectable } from '@nestjs/common';
import { ReadinessUnavailableException } from '../http/api-exception';
import type { PostgresHealthIndicator } from './postgres-health.indicator';
import type { RateLimitHealthIndicator } from './rate-limit-health.indicator';
import {
  CRITICAL_REDIS_HEALTH_INDICATOR,
  HEALTH_CHECK_SERVICE,
  POSTGRES_HEALTH_INDICATOR,
  type HealthCheckPort,
} from './health.tokens';

@Injectable()
export class ReadinessService implements BeforeApplicationShutdown {
  private isDraining = false;

  constructor(
    @Inject(HEALTH_CHECK_SERVICE)
    private readonly healthCheck: HealthCheckPort,
    @Inject(POSTGRES_HEALTH_INDICATOR)
    private readonly postgres: PostgresHealthIndicator,
    @Inject(CRITICAL_REDIS_HEALTH_INDICATOR)
    private readonly criticalRedis: RateLimitHealthIndicator,
  ) {}

  async check(): Promise<void> {
    if (this.isDraining) {
      throw new ReadinessUnavailableException();
    }

    try {
      await this.healthCheck.check([
        () => this.postgres.check(),
        () => this.criticalRedis.check(),
      ]);
    } catch (error) {
      if (isTerminusUnavailable(error)) {
        throw new ReadinessUnavailableException();
      }

      throw error;
    }
  }

  beforeApplicationShutdown(): void {
    this.isDraining = true;
  }
}

type HealthCheckFailure = {
  getStatus(): number;
  getResponse(): unknown;
};

function isTerminusUnavailable(error: unknown): error is HealthCheckFailure {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<HealthCheckFailure>;
  if (
    typeof candidate.getStatus !== 'function' ||
    typeof candidate.getResponse !== 'function'
  ) {
    return false;
  }

  try {
    const response = candidate.getResponse();
    return (
      candidate.getStatus() === 503 &&
      typeof response === 'object' &&
      response !== null &&
      'status' in response &&
      (response.status === 'error' || response.status === 'shutting_down')
    );
  } catch {
    return false;
  }
}
