import { categoryDefinitions, templateDefinitions } from "@letterly/templates";
import type { Prisma } from "../generated/prisma/client.js";

interface CatalogStore {
  category: {
    upsert(input: Prisma.CategoryUpsertArgs): PromiseLike<{ id: string }>;
  };
  template: {
    upsert(input: Prisma.TemplateUpsertArgs): PromiseLike<{ id: string }>;
  };
  templateVersion: {
    upsert(input: Prisma.TemplateVersionUpsertArgs): PromiseLike<unknown>;
  };
}

export async function seedCatalog(store: CatalogStore): Promise<void> {
  for (const categoryDefinition of categoryDefinitions) {
    const { key, ...metadata } = categoryDefinition;
    const category = await store.category.upsert({
      where: { key },
      update: { ...metadata, status: "ACTIVE" },
      create: { key, ...metadata, status: "ACTIVE" },
    });

    for (const entry of templateDefinitions.filter(
      (template) => template.categoryKey === key,
    )) {
      const templateKey = entry.definition.renderer.key;
      const metadata = {
        name: entry.name,
        description: entry.description,
        displayOrder: entry.displayOrder,
        status: "ACTIVE" as const,
      };
      const template = await store.template.upsert({
        where: {
          categoryId_key: { categoryId: category.id, key: templateKey },
        },
        update: metadata,
        create: { categoryId: category.id, key: templateKey, ...metadata },
      });
      const { version, registryKey } = entry.definition;
      await store.templateVersion.upsert({
        where: { templateId_version: { templateId: template.id, version } },
        update: { registryKey, status: "ACTIVE" },
        create: {
          templateId: template.id,
          version,
          registryKey,
          status: "ACTIVE",
        },
      });
    }
  }
}
