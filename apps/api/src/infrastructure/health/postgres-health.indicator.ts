import type { PrismaClient } from '@letterly/database';
import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { PRISMA_CLIENT } from '../database/prisma-token';
import {
  HealthProbeUnavailableError,
  SingleFlightHealthProbe,
} from './health-probe';
import { isTransientDatabaseError } from '../database/prisma-recovery';

@Injectable()
export class PostgresHealthIndicator {
  private readonly probe = new SingleFlightHealthProbe();

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(): Promise<HealthIndicatorResult<'postgres'>> {
    try {
      await this.probe.run(() => this.queryDatabase());
      return this.healthIndicator.check('postgres').up();
    } catch (error) {
      if (
        error instanceof HealthProbeUnavailableError ||
        isTransientDatabaseError(error)
      ) {
        return this.healthIndicator.check('postgres').down();
      }

      throw error;
    }
  }

  private async queryDatabase(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
