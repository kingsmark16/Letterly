export const CATALOG_REPOSITORY = Symbol('CATALOG_REPOSITORY');

export interface CatalogCategoryRecord {
  key: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

export interface CatalogCategoryLookup {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CatalogTemplateRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  displayOrder: number;
  category: { key: string };
  versions: { id: string; version: number; registryKey: string }[];
}

export interface CatalogRepository {
  listCategories(activeOnly: boolean): Promise<CatalogCategoryRecord[]>;
  findCategory(key: string): Promise<CatalogCategoryLookup | null>;
  listTemplates(categoryId?: string): Promise<CatalogTemplateRecord[]>;
}
