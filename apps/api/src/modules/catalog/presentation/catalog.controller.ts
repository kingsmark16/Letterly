import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  categoryCatalogQuerySchema,
  categoryCatalogResponseSchema,
  templateCatalogLookupQuerySchema,
  templateCatalogLookupResponseSchema,
  templateCatalogPageQuerySchema,
  templateCatalogPageResponseSchema,
  templateCatalogOverviewResponseSchema,
  templateCatalogResponseSchema,
  templateListQuerySchema,
  type TemplateCatalogLookupQuery,
  type TemplateCatalogPageQuery,
} from '@letterly/contracts/catalog';
import { ApiException } from '../../../infrastructure/http/api-exception';
import {
  ApiOperationSummary,
  ApiZodErrorResponses,
  ApiZodQuery,
  ApiZodResponse,
} from '../../../infrastructure/openapi/zod-openapi.decorators';
import {
  CatalogCategoryNotFoundError,
  CatalogService,
  CatalogTemplateNotFoundError,
  InvalidCatalogCursorError,
  CatalogUnavailableError,
} from '../application/catalog.service';
import { z } from 'zod';

function parseCatalogQuery<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiException({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
    });
  }
  return result.data;
}

function parseCatalogPageQuery(value: unknown): TemplateCatalogPageQuery {
  return parseCatalogQuery(templateCatalogPageQuerySchema, value);
}

function parseCatalogLookupQuery(value: unknown): TemplateCatalogLookupQuery {
  return parseCatalogQuery(templateCatalogLookupQuerySchema, value);
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

@ApiTags('Catalog')
@Controller('api/v1')
export class CatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalogService: CatalogService,
  ) {}

  @Get('categories')
  @ApiOperationSummary('List public catalog categories')
  @ApiZodQuery(categoryCatalogQuerySchema)
  @ApiZodResponse(categoryCatalogResponseSchema, 200, 'Catalog categories.')
  @ApiZodErrorResponses(400, 500, 503)
  getCategories(@Query() rawQuery: unknown) {
    const query = parseCatalogQuery(categoryCatalogQuerySchema, rawQuery);
    return this.catalogService.listCategories(query.active !== 'false');
  }

  @Get('catalog/overview')
  @ApiOperationSummary('Get the public catalog overview')
  @ApiZodResponse(
    templateCatalogOverviewResponseSchema,
    200,
    'Categories and their current template previews.',
  )
  @ApiZodErrorResponses(500, 503)
  async getCatalogOverview() {
    try {
      return await this.catalogService.listOverview();
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('templates')
  @ApiOperationSummary('List templates and retained versions')
  @ApiZodQuery(templateListQuerySchema)
  @ApiZodResponse(templateCatalogResponseSchema, 200, 'Registered templates.')
  @ApiZodErrorResponses(400, 404, 500, 503)
  async getTemplates(@Query() rawQuery: unknown) {
    const query = parseCatalogQuery(templateListQuerySchema, rawQuery);
    try {
      return await this.catalogService.listTemplates(query.categoryKey);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('catalog/templates')
  @ApiOperationSummary('List templates with cursor pagination')
  @ApiZodQuery(templateCatalogPageQuerySchema, {
    wireSchemas: { size: { type: 'integer', minimum: 1, maximum: 50 } },
  })
  @ApiZodResponse(
    templateCatalogPageResponseSchema,
    200,
    'The selected template page and navigation cursors.',
  )
  @ApiZodErrorResponses(400, 404, 500, 503)
  async getTemplatePage(@Query() rawQuery: unknown) {
    const query = parseCatalogPageQuery(rawQuery);

    try {
      return await this.catalogService.listTemplatePage(query);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }

  @Get('catalog/templates/lookup')
  @ApiOperationSummary('Look up one registered template version')
  @ApiZodQuery(templateCatalogLookupQuerySchema, {
    wireSchemas: {
      version: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
    },
  })
  @ApiZodResponse(
    templateCatalogLookupResponseSchema,
    200,
    'The matching template and selected retained version.',
  )
  @ApiZodErrorResponses(400, 404, 500, 503)
  async lookupTemplate(@Query() rawQuery: unknown) {
    const query = parseCatalogLookupQuery(rawQuery);

    try {
      return await this.catalogService.lookupTemplate(query);
    } catch (error: unknown) {
      throw mapCatalogError(error) ?? error;
    }
  }
}
