import type { PrismaClient } from '@letterly/database';
import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { PRISMA_CLIENT } from '../database/prisma-token';
import {
  isDatabaseAuthenticationError,
  isDatabaseUnavailableError,
} from '../database/prisma-recovery';
import {
  SAFE_MONITORING,
  type SafeMonitoringPort,
} from '../monitoring/safe-monitoring';
import {
  HealthProbeUnavailableError,
  SingleFlightHealthProbe,
} from './health-probe';

@Injectable()
export class PostgresHealthIndicator {
  private readonly probe = new SingleFlightHealthProbe();
  private authenticationFailureReported = false;

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly healthIndicator: HealthIndicatorService,
    @Inject(SAFE_MONITORING) private readonly monitoring: SafeMonitoringPort,
  ) {}

  async check(): Promise<HealthIndicatorResult<'postgres'>> {
    try {
      await this.probe.run(() => this.queryDatabase());
      this.authenticationFailureReported = false;
      return this.healthIndicator.check('postgres').up();
    } catch (error) {
      if (
        error instanceof HealthProbeUnavailableError ||
        isDatabaseUnavailableError(error)
      ) {
        return this.healthIndicator.check('postgres').down();
      }

      if (isDatabaseAuthenticationError(error)) {
        this.reportAuthenticationFailureOnce();
        return this.healthIndicator.check('postgres').down();
      }

      throw error;
    }
  }

  private reportAuthenticationFailureOnce(): void {
    if (this.authenticationFailureReported) return;

    this.authenticationFailureReported = true;
    try {
      this.monitoring.recordMetric(
        'readiness_dependency_failure_episode_total',
        1,
        {
          operation: 'readiness_probe',
          outcome: 'authentication_rejected',
          provider: 'postgres',
        },
      );
    } catch {
      // A monitoring failure must not change the readiness response.
    }
  }

  private async queryDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
