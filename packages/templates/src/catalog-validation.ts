export interface CatalogCategoryIdentity {
  readonly key: string;
}

export interface CatalogTemplateIdentity {
  readonly categoryKey: string;
  readonly definition: {
    readonly registryKey: string;
    readonly version: number;
    readonly renderer: { readonly key: string };
  };
}

export function validateCatalogIdentities(
  categories: readonly CatalogCategoryIdentity[],
  templates: readonly CatalogTemplateIdentity[],
): void {
  const categoryKeys = new Set<string>();
  for (const category of categories) {
    if (!category.key.trim()) throw new Error("Catalog category key is empty.");
    if (categoryKeys.has(category.key)) {
      throw new Error(`Duplicate catalog category key: ${category.key}.`);
    }
    categoryKeys.add(category.key);
  }

  const registryKeys = new Set<string>();
  const versions = new Set<string>();
  for (const { categoryKey, definition } of templates) {
    const { registryKey, version, renderer } = definition;
    if (!categoryKeys.has(categoryKey)) {
      throw new Error(`Unknown catalog category: ${categoryKey}.`);
    }
    if (!registryKey.trim() || !renderer.key.trim()) {
      throw new Error("Catalog registry and renderer keys must not be empty.");
    }
    if (!Number.isSafeInteger(version) || version < 1) {
      throw new Error(`Invalid catalog version for ${registryKey}.`);
    }
    if (registryKeys.has(registryKey)) {
      throw new Error(
        `Duplicate catalog registry key: ${registryKey}. Use a distinct immutable key for each version.`,
      );
    }
    registryKeys.add(registryKey);
    const identity = JSON.stringify([categoryKey, renderer.key, version]);
    if (versions.has(identity)) {
      throw new Error(
        `Duplicate catalog template version: ${categoryKey}/${renderer.key} v${version}.`,
      );
    }
    versions.add(identity);
  }
}
