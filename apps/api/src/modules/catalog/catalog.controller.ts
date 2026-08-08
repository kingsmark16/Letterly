import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';

function parseActiveFilter(value?: string): boolean {
  if (value === undefined || value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  throw new BadRequestException('The active query must be true or false');
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
  getTemplates(@Query('categoryKey') categoryKey?: string) {
    return this.catalogService.listTemplates(categoryKey);
  }
}
