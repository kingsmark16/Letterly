import type { CatalogTemplatePagePosition } from './catalog.repository';

export const CATALOG_CURSOR = Symbol('CATALOG_CURSOR');

export class InvalidCatalogCursorError extends Error {}

export interface CatalogCursor {
  filterFingerprint(input: { categoryKey?: string; query?: string }): string;
  encode(input: {
    position: CatalogTemplatePagePosition;
    filterFingerprint: string;
    size: number;
  }): string;
  decode(input: {
    cursor: string;
    filterFingerprint: string;
    size: number;
  }): CatalogTemplatePagePosition;
}
