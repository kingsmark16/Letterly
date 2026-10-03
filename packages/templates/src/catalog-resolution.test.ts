import assert from "node:assert/strict";
import { test } from "node:test";
import { templateDefinitions } from "@letterly/templates/catalog";
import {
  resolveCatalogTemplate,
  resolveCatalogTemplateFromDefinitions,
} from "@letterly/templates/catalog-resolution";

const v1 = {
  categoryKey: "fixture",
  name: "Original letter",
  status: "INACTIVE",
  definition: {
    registryKey: "fixture.letter",
    version: 1,
    renderer: { key: "letter" },
  },
} as const;
const v2 = {
  categoryKey: "fixture",
  name: "New letter",
  status: "ACTIVE",
  definition: {
    registryKey: "fixture.letter.v2",
    version: 2,
    renderer: { key: "letter" },
  },
} as const;
const entries = [v2, v1] as const;

test("canonical metadata resolves the exact launch descriptor", () => {
  for (const entry of templateDefinitions) {
    assert.equal(
      resolveCatalogTemplate({
        registryKey: entry.definition.registryKey,
        rendererKey: entry.definition.renderer.key,
        version: entry.definition.version,
      }),
      entry,
    );
  }
});

test("retired v1 retains its own name when v2 metadata coexists", () => {
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      {
        registryKey: v1.definition.registryKey,
        rendererKey: "letter",
        version: 1,
      },
      entries,
    ),
    v1,
  );
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      {
        registryKey: v2.definition.registryKey,
        rendererKey: "letter",
        version: 2,
      },
      entries,
    ),
    v2,
  );
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      { registryKey: v1.definition.registryKey, version: 1 },
      entries,
    )?.name,
    "Original letter",
  );
});

test("supplied identity mismatches do not select another descriptor or the latest version", () => {
  for (const criteria of [
    { registryKey: v1.definition.registryKey, version: 2 },
    { registryKey: v2.definition.registryKey, version: 1 },
    {
      registryKey: v1.definition.registryKey,
      rendererKey: "other",
      version: 1,
    },
    { registryKey: "unknown", version: 1 },
    { registryKey: undefined, rendererKey: "letter", version: 1 },
    { registryKey: v1.definition.registryKey, version: undefined },
    { version: 1 },
  ])
    assert.equal(
      resolveCatalogTemplateFromDefinitions(criteria, entries),
      undefined,
    );
});

test("same renderer and version in different categories require a unique identity", () => {
  const other = {
    ...v1,
    categoryKey: "other",
    name: "Other letter",
    definition: { ...v1.definition, registryKey: "other.letter" },
  };
  const combined = [...entries, other];
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      { rendererKey: "letter", version: 1 },
      combined,
    ),
    undefined,
  );
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      { registryKey: "other.letter", rendererKey: "letter", version: 1 },
      combined,
    ),
    other,
  );
  assert.equal(
    resolveCatalogTemplateFromDefinitions(
      { registryKey: "fixture.letter", rendererKey: "letter", version: 1 },
      combined,
    ),
    v1,
  );
});

test("ambiguous descriptors and empty inputs fail closed without changing source entries", () => {
  const criteria = { registryKey: v1.definition.registryKey, version: 1 };
  assert.equal(
    resolveCatalogTemplateFromDefinitions(criteria, [
      v1,
      { ...v1, name: "conflicting name" },
    ]),
    undefined,
  );
  assert.equal(resolveCatalogTemplateFromDefinitions(criteria, []), undefined);
  assert.deepEqual(
    entries.map((entry) => entry.name),
    ["New letter", "Original letter"],
  );
});
