import { Module, type FactoryProvider } from '@nestjs/common';
import { CatalogController } from './presentation/catalog.controller';
import { CatalogService } from './application/catalog.service';
import {
  CATALOG_CURSOR,
  type CatalogCursor,
} from './application/catalog-cursor';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './application/catalog.repository';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';
import { CatalogCursorService } from './infrastructure/catalog-cursor.service';

export const catalogServiceProvider = {
  provide: CatalogService,
  inject: [CATALOG_REPOSITORY, CATALOG_CURSOR],
  useFactory: (repository: CatalogRepository, cursor: CatalogCursor) =>
    new CatalogService(repository, cursor),
} satisfies FactoryProvider<CatalogService>;

@Module({
  controllers: [CatalogController],
  providers: [
    PrismaCatalogRepository,
    CatalogCursorService,
    { provide: CATALOG_CURSOR, useExisting: CatalogCursorService },
    { provide: CATALOG_REPOSITORY, useExisting: PrismaCatalogRepository },
    catalogServiceProvider,
  ],
})
export class CatalogModule {}
