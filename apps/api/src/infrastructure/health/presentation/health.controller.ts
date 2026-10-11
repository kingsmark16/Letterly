import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { healthResponseSchema, type HealthResponse } from '@letterly/contracts';
import { ReadinessService } from '../readiness.service';
import {
  ApiOperationSummary,
  ApiZodErrorResponses,
  ApiZodResponse,
} from '../../openapi/zod-openapi.decorators';

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('health')
  @ApiOperationSummary('Check whether the API process is running')
  @ApiZodResponse(healthResponseSchema, 200, 'The API process is healthy.')
  @ApiZodErrorResponses(500)
  health(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });
  }

  @Get('ready')
  @ApiOperationSummary('Check PostgreSQL and critical Redis readiness')
  @ApiZodResponse(healthResponseSchema, 200, 'Critical dependencies are ready.')
  @ApiZodErrorResponses(500, 503)
  async ready(): Promise<HealthResponse> {
    await this.readiness.check();
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });
  }
}
