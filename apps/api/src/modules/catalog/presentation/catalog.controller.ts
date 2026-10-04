import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  templateCatalogLookupQuerySchema,
  templateCatalogPageQuerySchema,
  type TemplateCatalogLookupQuery,
  type TemplateCatalogPageQuery,
} from '@letterly/contracts/catalog';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  CatalogCategoryNotFoundError,
  CatalogService,
  CatalogTemplateNotFoundError,
  InvalidCatalogCursorError,
  CatalogUnavailableError,
} from '../application/catalog.service';

function parseCatalogPageQuery(value: unknown): TemplateCatalogPageQuery {
  const result = templateCatalogPageQuerySchema.safeParse(value);

  if (!result.success) {
    throw new ApiException({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
  }

  return result.data;
}

function parseCatalogLookupQuery(value: unknown): TemplateCatalogLookupQuery {
  const result = templateCatalogLookupQuerySchema.safeParse(value);

  if (!result.success) {
    throw new ApiException({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
  }

  return result.data;
}

function mapCatalogError(error: unknown): ApiException | undefined {
  if (error instanceof CatalogCategoryNotFoundError) {
    return new ApiException({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
  }

  if (error instanceof CatalogTemplateNotFoundError) {
    return new ApiException({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
  }

  if (error instanceof InvalidCatalogCursorError) {
    return new ApiException({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
  }

  if (error instanceof CatalogUnavailableError) {
    return new ApiException({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Request service temporarily unavailable',
    });
  }

  return undefined;
}

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

  @Get('catalog/overview')
  async getCatalogOverview() {
    try {
      return await this.catalogService.listOverview();
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('templates')
  async getTemplates(@Query('categoryKey') categoryKey?: string) {
    try {
      return await this.catalogService.listTemplates(categoryKey);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('catalog/templates')
  async getTemplatePage(@Query() rawQuery: unknown) {
    const query = parseCatalogPageQuery(rawQuery);

    try {
      return await this.catalogService.listTemplatePage(query);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('catalog/templates/lookup')
  async lookupTemplate(@Query() rawQuery: unknown) {
    const query = parseCatalogLookupQuery(rawQuery);

    try {
      return await this.catalogService.lookupTemplate(query);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }
}
