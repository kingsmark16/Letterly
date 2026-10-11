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

export interface CatalogTemplatePageRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  displayOrder: number;
  category: { key: string };
  currentVersion: { id: string; version: number; registryKey: string } | null;
}

export interface CatalogTemplatePagePosition {
  displayOrder: number;
  id: string;
}

export interface CatalogTemplatePageRead {
  categoryId?: string;
  query?: string;
  size: number;
  direction: 'after' | 'before';
  position?: CatalogTemplatePagePosition;
}

export interface CatalogTemplateLookupRead {
  key: string;
  categoryKey?: string;
  version?: number;
}

export interface CatalogTemplateLookupRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  displayOrder: number;
  category: { key: string };
  selectedVersion: { id: string; version: number; registryKey: string } | null;
}

export interface CatalogCategoryOverviewRecord extends CatalogCategoryRecord {
  templates: CatalogTemplatePageRecord[];
}

export interface CatalogRepository {
  listOverview(previewSize: number): Promise<CatalogCategoryOverviewRecord[]>;
  listCategories(activeOnly: boolean): Promise<CatalogCategoryRecord[]>;
  findCategory(key: string): Promise<CatalogCategoryLookup | null>;
  listTemplates(categoryId?: string): Promise<CatalogTemplateRecord[]>;
  listTemplatePage(
    input: CatalogTemplatePageRead,
  ): Promise<CatalogTemplatePageRecord[]>;
  findTemplateLookup(
    input: CatalogTemplateLookupRead,
  ): Promise<CatalogTemplateLookupRecord[]>;
}
