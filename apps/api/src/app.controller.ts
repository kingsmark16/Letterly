import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import {
  ApiOperationSummary,
  ApiZodErrorResponses,
  ApiZodResponse,
} from './infrastructure/openapi/zod-openapi.decorators';
import { z } from 'zod';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Get()
  @ApiOperationSummary('Get the API service greeting')
  @ApiZodResponse(z.string(), 200, 'The API service greeting.')
  @ApiZodErrorResponses(500)
  getHello(): string {
    return this.appService.getHello();
  }
}
