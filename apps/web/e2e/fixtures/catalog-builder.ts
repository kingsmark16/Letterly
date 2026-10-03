import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from "@letterly/contracts/catalog";
import {
  createCatalogProvisioningPlan,
  type CatalogCategoryDescriptor,
  type CatalogTemplateDescriptor,
} from "@letterly/templates/catalog-provisioning";
import type {
  TemplateAudioCapability,
  TemplateCapability,
} from "@letterly/templates/capabilities";

interface BrowserTemplateDescriptor extends CatalogTemplateDescriptor {
  readonly definition: CatalogTemplateDescriptor["definition"] & {
    readonly capabilities: readonly TemplateCapability[];
    readonly audioCapability: TemplateAudioCapability;
  };
}

export function createBrowserCatalogFixture(
  categories: readonly CatalogCategoryDescriptor[],
  entries: readonly BrowserTemplateDescriptor[],
  ids: Readonly<Record<string, { id: string; versionId: string }>>,
) {
  const plan = createCatalogProvisioningPlan(categories, entries);
  const activeCategories = plan.filter(
    (group) => group.category.status === "ACTIVE",
  );
  const catalogCategories = categoryCatalogResponseSchema.parse(
    activeCategories.map((group) => group.category),
  );
  const catalogTemplates = templateCatalogResponseSchema.parse(
    activeCategories.flatMap((group) =>
      group.templates
        .filter((family) => family.status === "ACTIVE")
        .map((family) => {
          let familyId: string | undefined;
          const versions = family.versions
            .filter((entry) => entry.status === "ACTIVE")
            .map(({ definition }) => {
              const identity = ids[definition.registryKey];
              if (!identity)
                throw new Error(
                  `Missing browser fixture IDs for ${definition.registryKey}`,
                );
              if (familyId !== undefined && familyId !== identity.id) {
                throw new Error(
                  `Conflicting browser fixture family IDs for ${group.category.key}/${family.key}`,
                );
              }
              familyId = identity.id;
              return {
                id: identity.versionId,
                version: definition.version,
                capabilities: [...definition.capabilities],
                audioCapability: definition.audioCapability,
              };
            });
          return {
            id: familyId,
            categoryKey: group.category.key,
            key: family.key,
            name: family.metadata.name,
            description: family.metadata.description,
            displayOrder: family.metadata.displayOrder,
            versions,
          };
        }),
    ),
  );
  return { catalogCategories, catalogTemplates };
}
