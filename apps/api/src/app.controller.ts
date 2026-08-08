import { Controller, Get, Inject } from '@nestjs/common';
import { healthResponseSchema, type HealthResponse } from '@letterly/contracts';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });
  }
}
