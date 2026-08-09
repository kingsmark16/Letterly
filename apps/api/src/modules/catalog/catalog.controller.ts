import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiException } from '../../infrastructure/http/api-exception';
import {
  CatalogCategoryNotFoundError,
  CatalogService,
  CatalogUnavailableError,
} from './catalog.service';

function parseActiveFilter(value?: string): boolean {
  if (value === undefined || value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new ApiException({
    statusCode: 400,
    code: 'BAD_REQUEST',
    message: 'Request cannot be processed',
  });
}

@Controller('api/v1')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Get('categories')
  getCategories(@Query('active') active?: string) {
    return this.catalogService.listCategories(parseActiveFilter(active));
  }

  @Get('templates')
  async getTemplates(@Query('categoryKey') categoryKey?: string) {
    try {
      return await this.catalogService.listTemplates(categoryKey);
    } catch (error: unknown) {
      if (error instanceof CatalogCategoryNotFoundError) {
        throw new ApiException({
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Resource not found',
        });
      }

      if (error instanceof CatalogUnavailableError) {
        throw new ApiException({
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
          message: 'Request service temporarily unavailable',
        });
      }

      throw error;
    }
  }
}
