import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryDefinitions,
  templateDefinitions,
  templateRegistry,
  validatePageJourneyGraph,
} from "@letterly/templates";
import type { Prisma } from "../generated/prisma/client.js";
import { seedCatalog } from "./seed-catalog.js";

test("catalog definitions register valid defaults with unique keys and existing categories", () => {
  const categories = new Set(
    categoryDefinitions.map((category) => category.key),
  );
  assert.equal(categories.size, categoryDefinitions.length);
  const keys = templateDefinitions.map(
    ({ definition }) => definition.registryKey,
  );
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(
    Object.keys(templateRegistry).length,
    templateDefinitions.length,
  );
  for (const entry of templateDefinitions) {
    assert.ok(categories.has(entry.categoryKey));
    const definition = entry.definition;
    assert.equal(
      definition.registryKey,
      `${entry.categoryKey}.${definition.renderer.key}`,
    );
    assert.equal(templateRegistry[definition.registryKey], definition);
    assert.ok(
      definition.contentSchema.safeParse(definition.defaultContent).success,
    );
    assert.ok(
      definition.settingsSchema.safeParse(definition.defaultSettings).success,
    );
    if ("journey" in definition)
      assert.ok(
        validatePageJourneyGraph(definition.journey.defaultGraph).valid,
      );
  }
});

test("catalog seed preserves launch upsert keys, metadata, active status, and versions", async () => {
  const categories: Prisma.CategoryUpsertArgs[] = [];
  const templates: Prisma.TemplateUpsertArgs[] = [];
  const versions: Prisma.TemplateVersionUpsertArgs[] = [];
  await seedCatalog({
    category: {
      async upsert(input) {
        categories.push(input);
        return { id: "category-id" };
      },
    },
    template: {
      async upsert(input) {
        templates.push(input);
        return { id: `template-${templates.length}` };
      },
    },
    templateVersion: {
      async upsert(input) {
        versions.push(input);
      },
    },
  });
  assert.deepEqual(categories, [
    {
      where: { key: "confession" },
      update: {
        name: "Confession",
        description: "Personal letters and heartfelt messages.",
        displayOrder: 1,
        status: "ACTIVE",
      },
      create: {
        key: "confession",
        name: "Confession",
        description: "Personal letters and heartfelt messages.",
        displayOrder: 1,
        status: "ACTIVE",
      },
    },
  ]);
  assert.deepEqual(
    templates.map((input) => input.where),
    [
      { categoryId_key: { categoryId: "category-id", key: "secret-letter" } },
      {
        categoryId_key: { categoryId: "category-id", key: "choose-your-heart" },
      },
    ],
  );
  assert.deepEqual(
    templates.map((input) => input.update),
    [
      {
        name: "Secret Letter",
        description: "A romantic letter with optional interactive features.",
        displayOrder: 1,
        status: "ACTIVE",
      },
      {
        name: "Choose Your Heart",
        description: "A guided branching journey with a personal result.",
        displayOrder: 2,
        status: "ACTIVE",
      },
    ],
  );
  for (const [index, input] of templates.entries()) {
    assert.deepEqual(input.create, {
      categoryId: "category-id",
      key: templateDefinitions[index]?.definition.renderer.key,
      ...input.update,
    });
  }
  assert.deepEqual(versions, [
    {
      where: { templateId_version: { templateId: "template-1", version: 1 } },
      update: { registryKey: "confession.secret-letter", status: "ACTIVE" },
      create: {
        templateId: "template-1",
        version: 1,
        registryKey: "confession.secret-letter",
        status: "ACTIVE",
      },
    },
    {
      where: { templateId_version: { templateId: "template-2", version: 1 } },
      update: { registryKey: "confession.choose-your-heart", status: "ACTIVE" },
      create: {
        templateId: "template-2",
        version: 1,
        registryKey: "confession.choose-your-heart",
        status: "ACTIVE",
      },
    },
  ]);
});

test("catalog seed propagates a store failure before writing dependent templates", async () => {
  let templateWrites = 0;
  await assert.rejects(
    seedCatalog({
      category: {
        async upsert() {
          throw new Error("database unavailable");
        },
      },
      template: {
        async upsert() {
          templateWrites++;
          return { id: "unused" };
        },
      },
      templateVersion: { async upsert() {} },
    }),
    /database unavailable/,
  );
  assert.equal(templateWrites, 0);
});
