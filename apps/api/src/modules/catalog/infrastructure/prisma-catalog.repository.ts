import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CatalogRepository,
  CatalogCategoryOverviewRecord,
  CatalogTemplatePageRecord,
  CatalogTemplateLookupRecord,
  CatalogTemplateLookupRead,
  CatalogTemplatePageRead,
} from '../application/catalog.repository';

import {
  catalogOverviewSql,
  buildCatalogPageQuery,
  buildCatalogLookupQuery,
} from './catalog-read-queries';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  listOverview(previewSize: number) {
    return this.prisma.$queryRawUnsafe<CatalogCategoryOverviewRecord[]>(
      catalogOverviewSql,
      previewSize,
    );
  }
  listCategories(activeOnly: boolean) {
    return this.prisma.category.findMany({
      where: activeOnly ? { status: 'ACTIVE' } : undefined,
      orderBy: { displayOrder: 'asc' },
      select: { key: true, name: true, description: true, displayOrder: true },
    });
  }

  findCategory(key: string) {
    return this.prisma.category.findUnique({
      where: { key },
      select: { id: true, status: true },
    });
  }

  listTemplates(categoryId?: string) {
    return this.prisma.template.findMany({
      where: {
        status: 'ACTIVE',
        ...(categoryId !== undefined ? { categoryId } : {}),
      },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        displayOrder: true,
        category: { select: { key: true } },
        versions: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'asc' },
          select: { id: true, version: true, registryKey: true },
        },
      },
    });
  }

  listTemplatePage(input: CatalogTemplatePageRead) {
    const query = buildCatalogPageQuery(input);
    return this.prisma.$queryRawUnsafe<CatalogTemplatePageRecord[]>(
      query.text,
      ...query.values,
    );
  }

  findTemplateLookup(input: CatalogTemplateLookupRead) {
    const query = buildCatalogLookupQuery(input);
    return this.prisma.$queryRawUnsafe<CatalogTemplateLookupRecord[]>(
      query.text,
      ...query.values,
    );
  }
}
