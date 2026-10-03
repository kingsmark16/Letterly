import {
  validateCatalogIdentities,
  type CatalogCategoryIdentity,
  type CatalogTemplateIdentity,
} from "@letterly/templates/catalog-validation";

export type CatalogProvisioningStatus = "ACTIVE" | "INACTIVE";

export interface CatalogCategoryDescriptor extends CatalogCategoryIdentity {
  readonly name: string;
  readonly description: string;
  readonly displayOrder: number;
  readonly status: CatalogProvisioningStatus;
}

export interface CatalogTemplateDescriptor extends CatalogTemplateIdentity {
  readonly name: string;
  readonly description: string;
  readonly displayOrder: number;
  readonly status: CatalogProvisioningStatus;
}

export interface CatalogTemplateFamily<
  Entry extends CatalogTemplateDescriptor,
> {
  readonly key: string;
  readonly metadata: Entry;
  readonly status: CatalogProvisioningStatus;
  readonly versions: readonly Entry[];
}

export interface CatalogCategoryPlan<
  Category extends CatalogCategoryDescriptor,
  Entry extends CatalogTemplateDescriptor,
> {
  readonly category: Category;
  readonly templates: readonly CatalogTemplateFamily<Entry>[];
}

export function createCatalogProvisioningPlan<
  Category extends CatalogCategoryDescriptor,
  Entry extends CatalogTemplateDescriptor,
>(
  categories: readonly Category[],
  entries: readonly Entry[],
): readonly CatalogCategoryPlan<Category, Entry>[] {
  validateCatalogIdentities(categories, entries);
  for (const descriptor of [...categories, ...entries]) {
    if (descriptor.status !== "ACTIVE" && descriptor.status !== "INACTIVE") {
      throw new Error(
        "Catalog provisioning status must be ACTIVE or INACTIVE.",
      );
    }
  }

  const grouped = new Map<string, Map<string, Entry[]>>();
  for (const entry of entries) {
    let families = grouped.get(entry.categoryKey);
    if (!families) {
      families = new Map();
      grouped.set(entry.categoryKey, families);
    }
    const key = entry.definition.renderer.key;
    const versions = families.get(key);
    if (versions) versions.push(entry);
    else families.set(key, [entry]);
  }

  return categories.map((category) => ({
    category,
    templates: Array.from(grouped.get(category.key) ?? [], ([key, entries]) => {
      const versions = [...entries].sort(
        (left, right) => left.definition.version - right.definition.version,
      );
      const active = versions.filter((entry) => entry.status === "ACTIVE");
      const metadata = active.at(-1) ?? versions.at(-1);
      if (!metadata)
        throw new Error("Catalog template family has no versions.");
      return {
        key,
        metadata,
        status:
          category.status === "ACTIVE" && active.length > 0
            ? "ACTIVE"
            : "INACTIVE",
        versions,
      };
    }),
  }));
}
