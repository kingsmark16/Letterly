import {
  categoryCatalogResponseSchema,
  templateCatalogLookupResponseSchema,
  templateCatalogOverviewResponseSchema,
  templateCatalogPageResponseSchema,
  templateCatalogResponseSchema,
} from '@letterly/contracts/catalog';
import type {
  TemplateCatalogLookupQuery,
  TemplateCatalogPageQuery,
} from '@letterly/contracts/catalog';
import { resolveTemplate } from '@letterly/templates';
import type {
  CatalogRepository,
  CatalogTemplatePagePosition,
} from './catalog.repository';
import type { CatalogCursor } from './catalog-cursor';
import { InvalidCatalogCursorError } from './catalog-cursor';

export class CatalogCategoryNotFoundError extends Error {}

export class CatalogTemplateNotFoundError extends Error {}

export class CatalogUnavailableError extends Error {}

export const CATALOG_PREVIEW_SIZE = 4;

export { InvalidCatalogCursorError };

function resolveRegistryEntry(registryKey: string, version: number) {
  const entry = resolveTemplate({ registryKey: registryKey, version: version });

  if (!entry) {
    throw new CatalogUnavailableError();
  }

  return entry;
}

export class CatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly cursor: CatalogCursor,
  ) {}

  async listCategories(activeOnly: boolean) {
    const categories = await this.repository.listCategories(activeOnly);

    return categoryCatalogResponseSchema.parse(categories);
  }

  async listOverview() {
    const categories = await this.repository.listOverview(CATALOG_PREVIEW_SIZE);
    const response = categories.map((category) => ({
      key: category.key,
      name: category.name,
      description: category.description,
      displayOrder: category.displayOrder,
      templates: category.templates.map((template) => {
        const currentVersion = template.currentVersion;
        if (!currentVersion) {
          throw new CatalogUnavailableError();
        }

        return {
          id: template.id,
          categoryKey: category.key,
          key: template.key,
          name: template.name,
          description: template.description,
          displayOrder: template.displayOrder,
          currentVersion: this.versionSummary(currentVersion),
        };
      }),
    }));

    return templateCatalogOverviewResponseSchema.parse({
      categories: response,
    });
  }

  async listTemplates(categoryKey?: string) {
    const category = categoryKey
      ? await this.repository.findCategory(categoryKey)
      : undefined;

    if (categoryKey && (!category || category.status !== 'ACTIVE')) {
      throw new CatalogCategoryNotFoundError();
    }

    const templates = await this.repository.listTemplates(category?.id);

    const response = templates.map((template) => ({
      id: template.id,
      categoryKey: template.category.key,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      versions: template.versions.map((version) =>
        this.versionSummary(version),
      ),
    }));

    return templateCatalogResponseSchema.parse(response);
  }

  async listTemplatePage(query: TemplateCatalogPageQuery) {
    const category = query.categoryKey
      ? await this.repository.findCategory(query.categoryKey)
      : undefined;

    if (query.categoryKey && (!category || category.status !== 'ACTIVE')) {
      throw new CatalogCategoryNotFoundError();
    }

    const filterFingerprint = this.cursor.filterFingerprint({
      categoryKey: query.categoryKey,
      query: query.q,
    });
    const position = query.cursor
      ? this.cursor.decode({
          cursor: query.cursor,
          filterFingerprint,
          size: query.size,
        })
      : undefined;
    const records = await this.repository.listTemplatePage({
      ...(category ? { categoryId: category.id } : {}),
      ...(query.q ? { query: query.q } : {}),
      size: query.size,
      direction: query.direction,
      ...(position ? { position } : {}),
    });
    const hasExtra = records.length > query.size;
    const selectedRecords = records.slice(0, query.size);

    if (query.direction === 'before') {
      selectedRecords.reverse();
    }

    const items = selectedRecords.map((record) => {
      const currentVersion = record.currentVersion;

      if (!currentVersion) {
        throw new CatalogUnavailableError();
      }

      return {
        id: record.id,
        categoryKey: record.category.key,
        key: record.key,
        name: record.name,
        description: record.description,
        displayOrder: record.displayOrder,
        currentVersion: this.versionSummary(currentVersion),
      };
    });

    const first = selectedRecords[0];
    const last = selectedRecords.at(-1);
    const previousCursor = first
      ? this.pageCursor({
          direction: query.direction,
          hasExtra,
          hasCursor: Boolean(query.cursor),
          position: first,
          filterFingerprint,
          size: query.size,
          side: 'previous',
        })
      : null;
    const nextCursor = last
      ? this.pageCursor({
          direction: query.direction,
          hasExtra,
          hasCursor: Boolean(query.cursor),
          position: last,
          filterFingerprint,
          size: query.size,
          side: 'next',
        })
      : null;

    return templateCatalogPageResponseSchema.parse({
      items,
      nextCursor,
      previousCursor,
    });
  }

  async lookupTemplate(query: TemplateCatalogLookupQuery) {
    const records = await this.repository.findTemplateLookup({
      key: query.templateKey,
      ...(query.categoryKey ? { categoryKey: query.categoryKey } : {}),
      ...(query.version !== undefined ? { version: query.version } : {}),
    });

    const record = records[0];
    if (!record || records.length !== 1) {
      throw new CatalogTemplateNotFoundError();
    }

    const selectedVersion = record.selectedVersion;
    if (!selectedVersion) {
      throw new CatalogTemplateNotFoundError();
    }

    return templateCatalogLookupResponseSchema.parse({
      id: record.id,
      categoryKey: record.category.key,
      key: record.key,
      name: record.name,
      description: record.description,
      displayOrder: record.displayOrder,
      selectedVersion: this.versionSummary(selectedVersion),
    });
  }

  private versionSummary(version: {
    id: string;
    version: number;
    registryKey: string;
  }) {
    const registryEntry = resolveRegistryEntry(
      version.registryKey,
      version.version,
    );

    return {
      id: version.id,
      version: version.version,
      capabilities: [...registryEntry.capabilities],
      audioCapability: registryEntry.audioCapability,
    };
  }

  private pageCursor(input: {
    direction: 'after' | 'before';
    hasExtra: boolean;
    hasCursor: boolean;
    position: CatalogTemplatePagePosition;
    filterFingerprint: string;
    size: number;
    side: 'previous' | 'next';
  }): string | null {
    const available =
      input.side === 'next'
        ? input.direction === 'after'
          ? input.hasExtra
          : input.hasCursor
        : input.direction === 'after'
          ? input.hasCursor
          : input.hasExtra;

    return available
      ? this.cursor.encode({
          position: input.position,
          filterFingerprint: input.filterFingerprint,
          size: input.size,
        })
      : null;
  }
}
