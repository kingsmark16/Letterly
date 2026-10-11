import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import {
  validateCatalogIdentities,
  type CatalogTemplateIdentity,
} from "@letterly/templates/catalog-validation";
import {
  resolveTemplate,
  resolveTemplateFromDefinitions,
} from "@letterly/templates/registry";

const categories = [{ key: "confession" }, { key: "celebration" }] as const;
function entry(
  registryKey = "confession.letter",
  version = 1,
  categoryKey = "confession",
  rendererKey = "letter",
): CatalogTemplateIdentity {
  return {
    categoryKey,
    definition: { registryKey, version, renderer: { key: rendererKey } },
  };
}

test("canonical launch identities remain unchanged and resolve only pinned versions", () => {
  validateCatalogIdentities(categoryDefinitions, templateDefinitions);
  assert.deepEqual(
    categoryDefinitions.map(({ key }) => key),
    ["confession"],
  );
  assert.deepEqual(
    templateDefinitions.map(({ definition }) => definition.registryKey),
    ["confession.secret-letter", "confession.choose-your-heart"],
  );
  for (const { definition } of templateDefinitions) {
    assert.equal(
      resolveTemplate({
        registryKey: definition.registryKey,
        rendererKey: definition.renderer.key,
        version: definition.version,
      }),
      definition,
    );
    assert.equal(
      resolveTemplate({ registryKey: definition.registryKey, version: 2 }),
      undefined,
    );
  }
});

test("rejects duplicate categories and orphan references", () => {
  assert.throws(
    () =>
      validateCatalogIdentities(
        [{ key: "confession" }, { key: "confession" }],
        [],
      ),
    /Duplicate catalog category/,
  );
  assert.throws(
    () =>
      validateCatalogIdentities(categories, [
        entry("unknown.letter", 1, "unknown"),
      ]),
    /Unknown catalog category/,
  );
  assert.throws(
    () => validateCatalogIdentities([{ key: " " }], []),
    /category key is empty/,
  );
});

test("duplicate registry keys fail even when versions or categories differ", () => {
  for (const duplicate of [
    entry(),
    entry("confession.letter", 2),
    entry("confession.letter", 1, "celebration"),
  ]) {
    assert.throws(
      () => validateCatalogIdentities(categories, [entry(), duplicate]),
      /Duplicate catalog registry key/,
    );
  }
});

test("same category and renderer version cannot use conflicting registry keys", () => {
  assert.throws(
    () =>
      validateCatalogIdentities(categories, [
        entry(),
        entry("confession.other"),
      ]),
    /Duplicate catalog template version/,
  );
});

test("distinct immutable keys retain versions and cross category reuse without mutation", () => {
  const templates = [
    entry(),
    entry("confession.letter.v2", 2),
    entry("celebration.letter", 1, "celebration"),
  ];
  const before = structuredClone(templates);
  validateCatalogIdentities(categories, templates);
  assert.deepEqual(templates, before);
});

test("empty registry and renderer keys fail", () => {
  assert.throws(
    () => validateCatalogIdentities(categories, [entry(" ")]),
    /must not be empty/,
  );
  assert.throws(
    () =>
      validateCatalogIdentities(categories, [
        entry("confession.letter", 1, "confession", ""),
      ]),
    /must not be empty/,
  );
});

test("fixture resolver retains versions and fails ambiguous or mismatched identities", () => {
  const definitions = [
    entry(),
    entry("confession.letter.v2", 2),
    entry("celebration.letter", 1, "celebration"),
  ].map(({ definition }) => definition);
  assert.equal(
    resolveTemplateFromDefinitions(
      { registryKey: "confession.letter", version: 1 },
      definitions,
    ),
    definitions[0],
  );
  assert.equal(
    resolveTemplateFromDefinitions(
      {
        registryKey: "confession.letter.v2",
        rendererKey: "letter",
        version: 2,
      },
      definitions,
    ),
    definitions[1],
  );
  for (const criteria of [
    { registryKey: "confession.letter", version: 2 },
    { rendererKey: "letter", version: 1 },
    { registryKey: "confession.letter.v2", rendererKey: "other", version: 2 },
    { registryKey: undefined, rendererKey: "letter", version: 2 },
    { version: 2 },
  ])
    assert.equal(
      resolveTemplateFromDefinitions(criteria, definitions),
      undefined,
    );
});

for (const version of [
  0,
  -1,
  1.5,
  NaN,
  Infinity,
  Number.MAX_SAFE_INTEGER + 1,
]) {
  test(`reject unsafe catalog version ${version}`, () => {
    assert.throws(
      () =>
        validateCatalogIdentities(categories, [
          entry("confession.letter", version),
        ]),
      /Invalid catalog version/,
    );
  });
}

test("positive safe integer boundary is valid", () => {
  validateCatalogIdentities(categories, [
    entry("confession.letter", Number.MAX_SAFE_INTEGER),
  ]);
});
