import { Module } from '@nestjs/common';
import { HealthCheckService, TerminusModule } from '@nestjs/terminus';
import { RateLimitModule } from '../http/rate-limit.module';
import { HealthController } from './presentation/health.controller';
import { PostgresHealthIndicator } from './postgres-health.indicator';
import { RateLimitHealthIndicator } from './rate-limit-health.indicator';
import { ReadinessService } from './readiness.service';
import {
  CRITICAL_REDIS_HEALTH_INDICATOR,
  HEALTH_CHECK_SERVICE,
  POSTGRES_HEALTH_INDICATOR,
} from './health.tokens';

@Module({
  imports: [TerminusModule.forRoot({ logger: false }), RateLimitModule],
  controllers: [HealthController],
  providers: [
    PostgresHealthIndicator,
    RateLimitHealthIndicator,
    ReadinessService,
    {
      provide: HEALTH_CHECK_SERVICE,
      useExisting: HealthCheckService,
    },
    {
      provide: POSTGRES_HEALTH_INDICATOR,
      useExisting: PostgresHealthIndicator,
    },
    {
      provide: CRITICAL_REDIS_HEALTH_INDICATOR,
      useExisting: RateLimitHealthIndicator,
    },
  ],
})
export class HealthModule {}
