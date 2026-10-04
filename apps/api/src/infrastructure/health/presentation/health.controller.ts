import { Controller, Get } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@letterly/contracts';
import { ReadinessService } from '../readiness.service';

@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('health')
  health(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    await this.readiness.check();
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });
  }
}
