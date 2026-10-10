import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryDefinitions,
  templateDefinitions,
  templateRegistry,
  resolveTemplate,
  validatePageJourneyGraph,
} from "@letterly/templates";
import type { Prisma } from "../generated/prisma/client.js";
import type { CatalogProvisioningStatus } from "@letterly/templates/catalog-provisioning";
import {
  seedCatalog,
  seedCatalogInTransaction,
  type CatalogStore,
  type CatalogSeedDefinitions,
} from "./seed-catalog.js";

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
      `${entry.categoryKey}.${definition.renderer.key}${definition.version === 1 ? "" : `.v${definition.version}`}`,
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

test("catalog seed preserves launch templates and planned category statuses", async () => {
  const categories: Prisma.CategoryUpsertArgs[] = [];
  const templates: Prisma.TemplateUpsertArgs[] = [];
  const versions: Prisma.TemplateVersionUpsertArgs[] = [];
  const statuses: Prisma.TemplateVersionUpdateManyArgs[] = [];
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
        assert.ok(input.create);
        return {
          id: `version-${versions.length}`,
          registryKey: input.create.registryKey,
          version: input.create.version,
          templateId: String(input.where.templateId_version?.templateId),
        };
      },
      async updateMany(input) {
        statuses.push(input);
        return { count: 1 };
      },
    },
  });
  assert.deepEqual(categories[0], {
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
  });
  assert.deepEqual(
    categories.slice(1).map(({ where, update }) => ({
      key: where.key,
      name: update.name,
      status: update.status,
    })),
    [
      { key: "birthday", name: "Birthday", status: "INACTIVE" },
      { key: "anniversary", name: "Anniversary", status: "INACTIVE" },
      { key: "monthsary", name: "Monthsary", status: "INACTIVE" },
      { key: "thank-you", name: "Thank You", status: "INACTIVE" },
      { key: "appreciation", name: "Appreciation", status: "INACTIVE" },
    ],
  );
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
      update: {},
      create: {
        templateId: "template-1",
        version: 1,
        registryKey: "confession.secret-letter",
        status: "ACTIVE",
      },
      select: { id: true, registryKey: true, version: true, templateId: true },
    },
    {
      where: { templateId_version: { templateId: "template-2", version: 1 } },
      update: {},
      create: {
        templateId: "template-2",
        version: 1,
        registryKey: "confession.choose-your-heart",
        status: "ACTIVE",
      },
      select: { id: true, registryKey: true, version: true, templateId: true },
    },
  ]);
  assert.deepEqual(
    statuses,
    versions.map((input, index) => ({
      where: {
        id: `version-${index + 1}`,
        templateId: input.where.templateId_version?.templateId,
        version: input.where.templateId_version?.version,
        registryKey: input.create?.registryKey,
      },
      data: { status: "ACTIVE" },
    })),
  );
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
      templateVersion: {
        async upsert() {
          throw new Error("must not write a version");
        },
        async updateMany() {
          throw new Error("must not update status");
        },
      },
    }),
    /database unavailable/,
  );
  assert.equal(templateWrites, 0);
});

test("template resolution retains exact identity, renderer, and version constraints", () => {
  const entry = templateDefinitions[0].definition;
  assert.equal(
    resolveTemplate({ registryKey: entry.registryKey, version: entry.version }),
    entry,
  );
  assert.equal(
    resolveTemplate({
      rendererKey: entry.renderer.key,
      version: entry.version,
    }),
    entry,
  );
  assert.equal(
    resolveTemplate({
      registryKey: entry.registryKey,
      rendererKey: entry.renderer.key,
      version: entry.version,
    }),
    entry,
  );
  assert.equal(
    resolveTemplate({
      registryKey: entry.registryKey,
      rendererKey: "choose-your-heart",
      version: entry.version,
    }),
    undefined,
  );
  assert.equal(
    resolveTemplate({ registryKey: entry.registryKey, version: 999 }),
    undefined,
  );
});

test("template resolution fails closed for missing or unknown identities", () => {
  for (const registryKey of [
    undefined,
    null,
    "",
    "unknown",
    "toString",
    "__proto__",
  ]) {
    assert.equal(
      resolveTemplate({
        registryKey,
        rendererKey: "secret-letter",
        version: 1,
      }),
      undefined,
    );
  }
  assert.equal(resolveTemplate({ version: 1 }), undefined);
  assert.equal(
    resolveTemplate({
      registryKey: "confession.secret-letter",
      version: undefined,
    }),
    undefined,
  );
});

test("renderer-only resolution rejects collisions while exact registry identity remains stable", () => {
  const source = templateRegistry["confession.secret-letter"];
  const fixtureKey = "fixture.secret-letter";
  Object.defineProperty(templateRegistry, fixtureKey, {
    configurable: true,
    enumerable: true,
    value: { ...source, registryKey: fixtureKey },
  });
  try {
    assert.equal(
      resolveTemplate({
        rendererKey: source.renderer.key,
        version: source.version,
      }),
      undefined,
    );
    assert.equal(
      resolveTemplate({
        registryKey: source.registryKey,
        rendererKey: source.renderer.key,
        version: source.version,
      }),
      source,
    );
    assert.equal(
      resolveTemplate({
        registryKey: fixtureKey,
        rendererKey: source.renderer.key,
        version: source.version,
      })?.registryKey,
      fixtureKey,
    );
  } finally {
    Reflect.deleteProperty(templateRegistry, fixtureKey);
  }
});

interface StoredCatalog {
  categories: { id: string; key: string; status: CatalogProvisioningStatus }[];
  templates: {
    id: string;
    categoryId: string;
    key: string;
    name: string;
    status: CatalogProvisioningStatus;
  }[];
  versions: {
    id: string;
    templateId: string;
    version: number;
    registryKey: string;
    status: CatalogProvisioningStatus;
  }[];
  pages: { id: string; templateVersionId: string }[];
}

function fixtureDefinitions(
  v1Status: CatalogProvisioningStatus = "ACTIVE",
): CatalogSeedDefinitions {
  const category = {
    key: "fixture",
    name: "Fixture",
    description: "Isolated",
    displayOrder: 1,
    status: "ACTIVE" as const,
  };
  return {
    categories: [category],
    templates: [2, 1].map((version) => ({
      categoryKey: category.key,
      name: `Letter v${version}`,
      description: `Version ${version}`,
      displayOrder: version,
      status: version === 1 ? v1Status : "ACTIVE",
      definition: {
        registryKey: version === 1 ? "fixture.letter" : "fixture.letter.v2",
        version,
        renderer: { key: "letter" },
      },
    })),
  };
}

function existingCatalog(registryKey = "fixture.letter"): StoredCatalog {
  return {
    categories: [{ id: "category-1", key: "fixture", status: "INACTIVE" }],
    templates: [
      {
        id: "template-1",
        categoryId: "category-1",
        key: "letter",
        name: "Old metadata",
        status: "INACTIVE",
      },
    ],
    versions: [
      {
        id: "version-1",
        templateId: "template-1",
        version: 1,
        registryKey,
        status: "INACTIVE",
      },
    ],
    pages: [{ id: "published-v1-page", templateVersionId: "version-1" }],
  };
}

function createMemoryStore(state: StoredCatalog): CatalogStore {
  return {
    category: {
      async upsert(input) {
        const key = input.where.key;
        assert.ok(typeof key === "string");
        const saved = state.categories.find((category) => category.key === key);
        const status = saved ? input.update.status : input.create?.status;
        assert.ok(status === "ACTIVE" || status === "INACTIVE");
        if (saved) {
          saved.status = status;
          return saved;
        }
        const created = {
          id: `category-${state.categories.length + 1}`,
          key,
          status,
        };
        state.categories.push(created);
        return created;
      },
    },
    template: {
      async upsert(input) {
        const identity = input.where.categoryId_key;
        assert.ok(identity);
        const saved = state.templates.find(
          (template) =>
            template.categoryId === identity.categoryId &&
            template.key === identity.key,
        );
        const metadata = saved ? input.update : input.create;
        assert.ok(metadata);
        const { name, status } = metadata;
        assert.ok(typeof name === "string");
        assert.ok(status === "ACTIVE" || status === "INACTIVE");
        if (saved) {
          Object.assign(saved, { name, status });
          return saved;
        }
        const created = {
          id: `template-${state.templates.length + 1}`,
          ...identity,
          name,
          status,
        };
        state.templates.push(created);
        return created;
      },
    },
    templateVersion: {
      async upsert(input) {
        assert.deepEqual(
          input.update,
          {},
          "existing version identity must never be updated",
        );
        const identity = input.where.templateId_version;
        assert.ok(identity);
        const saved = state.versions.find(
          (version) =>
            version.templateId === identity.templateId &&
            version.version === identity.version,
        );
        if (saved) return { ...saved };
        const data = input.create;
        assert.ok(data);
        assert.ok(data.status === "ACTIVE" || data.status === "INACTIVE");
        const created = {
          id: `version-${state.versions.length + 1}`,
          ...identity,
          registryKey: data.registryKey,
          status: data.status,
        };
        state.versions.push(created);
        return { ...created };
      },
      async updateMany(input) {
        assert.ok(input.where);
        assert.deepEqual(Object.keys(input.data), ["status"]);
        const { id, templateId, version, registryKey } = input.where;
        const saved = state.versions.find(
          (row) =>
            row.id === id &&
            row.templateId === templateId &&
            row.version === version &&
            row.registryKey === registryKey,
        );
        if (!saved) return { count: 0 };
        const status = input.data.status;
        assert.ok(status === "ACTIVE" || status === "INACTIVE");
        saved.status = status;
        return { count: 1 };
      },
    },
  };
}

function createMemoryTransactionHost(initial: StoredCatalog) {
  const committed = structuredClone(initial);
  let transactions = 0;
  let transactionOptions: { maxWait: number; timeout: number } | undefined;
  return {
    committed,
    get transactions() {
      return transactions;
    },
    get transactionOptions() {
      return transactionOptions;
    },
    async $transaction<Result>(
      work: (store: CatalogStore) => Promise<Result>,
      options: { maxWait: number; timeout: number },
    ): Promise<Result> {
      transactions++;
      transactionOptions = options;
      const pending = structuredClone(committed);
      const result = await work(createMemoryStore(pending));
      Object.assign(committed, pending);
      return result;
    },
  };
}

test("retains v1 identity and published page references while adding v2 once per family", async () => {
  const state = existingCatalog();
  const pages = structuredClone(state.pages);
  const store = createMemoryStore(state);
  let familyWrites = 0;
  const originalUpsert = store.template.upsert;
  store.template.upsert = (input) => {
    familyWrites++;
    return originalUpsert(input);
  };
  await seedCatalog(store, fixtureDefinitions("INACTIVE"));
  assert.equal(familyWrites, 1);
  assert.equal(state.templates.length, 1);
  assert.equal(state.templates[0]?.name, "Letter v2");
  assert.equal(state.templates[0]?.status, "ACTIVE");
  assert.deepEqual(state.versions, [
    {
      id: "version-1",
      templateId: "template-1",
      version: 1,
      registryKey: "fixture.letter",
      status: "INACTIVE",
    },
    {
      id: "version-2",
      templateId: "template-1",
      version: 2,
      registryKey: "fixture.letter.v2",
      status: "ACTIVE",
    },
  ]);
  assert.deepEqual(state.pages, pages);
  const first = structuredClone(state);
  await seedCatalog(store, fixtureDefinitions("INACTIVE"));
  assert.deepEqual(
    state,
    first,
    "rerunning the seed must not duplicate or reactivate versions",
  );
});

test("only explicit ACTIVE descriptors reactivate retained version rows", async () => {
  const state = existingCatalog();
  await seedCatalog(createMemoryStore(state), fixtureDefinitions("ACTIVE"));
  assert.equal(state.versions[0]?.status, "ACTIVE");
  assert.equal(state.versions[0]?.registryKey, "fixture.letter");
  assert.equal(state.pages[0]?.templateVersionId, "version-1");
});

test("fully inactive families retain every version and highest retained metadata", async () => {
  const state = existingCatalog();
  const definitions = fixtureDefinitions("INACTIVE");
  await seedCatalog(createMemoryStore(state), {
    ...definitions,
    templates: definitions.templates.map((entry) => ({
      ...entry,
      status: "INACTIVE",
    })),
  });
  assert.equal(state.templates[0]?.status, "INACTIVE");
  assert.equal(state.templates[0]?.name, "Letter v2");
  assert.equal(state.versions.length, 2);
  assert.ok(state.versions.every((version) => version.status === "INACTIVE"));
});

test("category retirement prevents family activation without deleting version rows", async () => {
  const state = existingCatalog();
  const definitions = fixtureDefinitions();
  await seedCatalog(createMemoryStore(state), {
    ...definitions,
    categories: definitions.categories.map((category) => ({
      ...category,
      status: "INACTIVE",
    })),
  });
  assert.equal(state.categories[0]?.status, "INACTIVE");
  assert.equal(state.templates[0]?.status, "INACTIVE");
  assert.equal(state.versions.length, 2);
  assert.equal(state.pages[0]?.templateVersionId, "version-1");
});

test("an existing identity conflict rolls back all catalog changes through the seed transaction entry", async () => {
  const before = existingCatalog("fixture.other-identity");
  const host = createMemoryTransactionHost(before);
  await assert.rejects(
    seedCatalogInTransaction(host, fixtureDefinitions()),
    /Catalog version identity conflict: fixture\/letter v1/,
  );
  assert.equal(host.transactions, 1);
  assert.deepEqual(host.committed, before);
});

test("successful transaction commits retained versions without changing page references", async () => {
  const host = createMemoryTransactionHost(existingCatalog());
  await seedCatalogInTransaction(host, fixtureDefinitions("INACTIVE"));
  assert.equal(host.transactions, 1);
  assert.equal(host.committed.versions.length, 2);
  assert.deepEqual(host.transactionOptions, {
    maxWait: 30_000,
    timeout: 30_000,
  });
  assert.equal(host.committed.versions[0]?.status, "INACTIVE");
  assert.deepEqual(host.committed.pages, existingCatalog().pages);
});

test("an identity change before status update fails closed and rolls back", async () => {
  const before = existingCatalog();
  const host = createMemoryTransactionHost(before);
  const original = host.$transaction.bind(host);
  host.$transaction = (work, options) =>
    original(async (store) => {
      store.templateVersion.updateMany = async () => ({ count: 0 });
      return work(store);
    }, options);
  await assert.rejects(
    seedCatalogInTransaction(host, fixtureDefinitions()),
    /identity changed during provisioning/,
  );
  assert.deepEqual(host.committed, before);
});

test("invalid descriptor identities or status cause no store writes", async () => {
  for (const definitions of [
    {
      ...fixtureDefinitions(),
      templates: [
        fixtureDefinitions().templates[0]!,
        fixtureDefinitions().templates[0]!,
      ],
    },
    {
      ...fixtureDefinitions(),
      categories: [
        {
          ...fixtureDefinitions().categories[0]!,
          status: "unknown" as CatalogProvisioningStatus,
        },
      ],
    },
  ]) {
    const state = existingCatalog();
    const before = structuredClone(state);
    await assert.rejects(
      seedCatalog(createMemoryStore(state), definitions),
      /Duplicate catalog registry|provisioning status/,
    );
    assert.deepEqual(state, before);
  }
});
