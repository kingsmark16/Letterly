import { Module } from '@nestjs/common';
import {
  createConfiguredRateLimitStore,
  RATE_LIMIT_STORE,
  RateLimitService,
} from './rate-limit.service';

@Module({
  providers: [
    RateLimitService,
    {
      provide: RATE_LIMIT_STORE,
      useFactory: () => createConfiguredRateLimitStore(),
    },
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
