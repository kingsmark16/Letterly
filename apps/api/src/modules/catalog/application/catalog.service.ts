import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from '@letterly/contracts/catalog';
import { resolveTemplate } from '@letterly/templates';
import type { CatalogRepository } from './catalog.repository';

export class CatalogCategoryNotFoundError extends Error {}

export class CatalogUnavailableError extends Error {}

function resolveRegistryEntry(registryKey: string, version: number) {
  const entry = resolveTemplate({ registryKey: registryKey, version: version });

  if (!entry) {
    throw new CatalogUnavailableError();
  }

  return entry;
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async listCategories(activeOnly: boolean) {
    const categories = await this.repository.listCategories(activeOnly);

    return categoryCatalogResponseSchema.parse(categories);
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
      versions: template.versions.map((version) => {
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
      }),
    }));

    return templateCatalogResponseSchema.parse(response);
  }
}
