import { Module, type FactoryProvider } from '@nestjs/common';
import { CatalogController } from './presentation/catalog.controller';
import { CatalogService } from './application/catalog.service';
import {
  CATALOG_REPOSITORY,
  type CatalogRepository,
} from './application/catalog.repository';
import { PrismaCatalogRepository } from './infrastructure/prisma-catalog.repository';

export const catalogServiceProvider = {
  provide: CatalogService,
  inject: [CATALOG_REPOSITORY],
  useFactory: (repository: CatalogRepository) => new CatalogService(repository),
} satisfies FactoryProvider<CatalogService>;

@Module({
  controllers: [CatalogController],
  providers: [
    PrismaCatalogRepository,
    { provide: CATALOG_REPOSITORY, useExisting: PrismaCatalogRepository },
    catalogServiceProvider,
  ],
})
export class CatalogModule {}
