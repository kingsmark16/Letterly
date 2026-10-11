import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import {
  createCatalogProvisioningPlan,
  type CatalogCategoryDescriptor,
  type CatalogTemplateDescriptor,
} from "@letterly/templates/catalog-provisioning";
import type { Prisma } from "../generated/prisma/client.js";

export interface CatalogStore {
  category: {
    upsert(input: Prisma.CategoryUpsertArgs): PromiseLike<{ id: string }>;
  };
  template: {
    upsert(input: Prisma.TemplateUpsertArgs): PromiseLike<{ id: string }>;
  };
  templateVersion: {
    upsert(
      input: Prisma.TemplateVersionUpsertArgs & {
        select: {
          id: true;
          registryKey: true;
          version: true;
          templateId: true;
        };
      },
    ): PromiseLike<{
      id: string;
      registryKey: string;
      version: number;
      templateId: string;
    }>;
    updateMany(
      input: Prisma.TemplateVersionUpdateManyArgs,
    ): PromiseLike<{ count: number }>;
  };
}

export interface CatalogSeedDefinitions {
  readonly categories: readonly CatalogCategoryDescriptor[];
  readonly templates: readonly CatalogTemplateDescriptor[];
}

const canonicalDefinitions: CatalogSeedDefinitions = {
  categories: categoryDefinitions,
  templates: templateDefinitions,
};

export interface CatalogTransactionHost {
  $transaction<Result>(
    work: (store: CatalogStore) => Promise<Result>,
    options: { maxWait: number; timeout: number },
  ): Promise<Result>;
}

export function seedCatalogInTransaction(
  client: CatalogTransactionHost,
  definitions: CatalogSeedDefinitions = canonicalDefinitions,
): Promise<void> {
  return client.$transaction((store) => seedCatalog(store, definitions), {
    maxWait: 30_000,
    timeout: 30_000,
  });
}

export async function seedCatalog(
  store: CatalogStore,
  definitions: CatalogSeedDefinitions = canonicalDefinitions,
): Promise<void> {
  const plan = createCatalogProvisioningPlan(
    definitions.categories,
    definitions.templates,
  );
  for (const { category: categoryDefinition, templates } of plan) {
    const { key, name, description, displayOrder, status } = categoryDefinition;
    const metadata = { name, description, displayOrder, status };
    const category = await store.category.upsert({
      where: { key },
      update: metadata,
      create: { key, ...metadata },
    });

    for (const family of templates) {
      const templateKey = family.key;
      const metadata = {
        name: family.metadata.name,
        description: family.metadata.description,
        displayOrder: family.metadata.displayOrder,
        status: family.status,
      };
      const template = await store.template.upsert({
        where: {
          categoryId_key: { categoryId: category.id, key: templateKey },
        },
        update: metadata,
        create: { categoryId: category.id, key: templateKey, ...metadata },
      });
      for (const entry of family.versions) {
        const { version, registryKey } = entry.definition;
        const saved = await store.templateVersion.upsert({
          where: { templateId_version: { templateId: template.id, version } },
          update: {},
          create: {
            templateId: template.id,
            version,
            registryKey,
            status: entry.status,
          },
          select: {
            id: true,
            registryKey: true,
            version: true,
            templateId: true,
          },
        });
        if (
          saved.registryKey !== registryKey ||
          saved.version !== version ||
          saved.templateId !== template.id
        ) {
          throw new Error(
            `Catalog version identity conflict: ${key}/${templateKey} v${version}.`,
          );
        }
        const updated = await store.templateVersion.updateMany({
          where: {
            id: saved.id,
            templateId: template.id,
            version,
            registryKey,
          },
          data: { status: entry.status },
        });
        if (updated.count !== 1) {
          throw new Error(
            `Catalog version identity changed during provisioning: ${key}/${templateKey} v${version}.`,
          );
        }
      }
    }
  }
}
