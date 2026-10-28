import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import {
  RateLimitService,
  RateLimitUnavailableError,
} from '../http/rate-limit.service';
import {
  HealthProbeUnavailableError,
  SingleFlightHealthProbe,
} from './health-probe';

@Injectable()
export class RateLimitHealthIndicator {
  private readonly probe = new SingleFlightHealthProbe();

  constructor(
    @Inject(RateLimitService)
    private readonly rateLimitService: RateLimitService,
    @Inject(HealthIndicatorService)
    private readonly healthIndicator: HealthIndicatorService,
  ) {}

  async check(): Promise<HealthIndicatorResult<'critical_redis'>> {
    try {
      await this.probe.run(() => this.rateLimitService.checkAvailability());
      return this.healthIndicator.check('critical_redis').up();
    } catch (error) {
      if (
        error instanceof HealthProbeUnavailableError ||
        error instanceof RateLimitUnavailableError
      ) {
        return this.healthIndicator.check('critical_redis').down();
      }

      throw error;
    }
  }
}
