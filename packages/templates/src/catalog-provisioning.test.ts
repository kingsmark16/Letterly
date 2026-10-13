import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCatalogProvisioningPlan,
  type CatalogCategoryDescriptor,
  type CatalogTemplateDescriptor,
  type CatalogProvisioningStatus,
} from "@letterly/templates/catalog-provisioning";
import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import { resolveTemplateFromDefinitions } from "@letterly/templates/registry";

const category: CatalogCategoryDescriptor = {
  key: "fixture",
  name: "Fixture",
  description: "Isolated category",
  displayOrder: 1,
  status: "ACTIVE",
};
function entry(
  version: number,
  status: CatalogProvisioningStatus = "ACTIVE",
  categoryKey = "fixture",
): CatalogTemplateDescriptor {
  return {
    categoryKey,
    name: `Letter v${version}`,
    description: `Version ${version}`,
    displayOrder: version,
    status,
    definition: {
      registryKey: `${categoryKey}.letter${version === 1 ? "" : `.v${version}`}`,
      version,
      renderer: { key: "letter" },
    },
  };
}

test("launch provisioning retains one active category and planned inactive categories", () => {
  const plan = createCatalogProvisioningPlan(
    categoryDefinitions,
    templateDefinitions,
  );
  assert.equal(plan.length, 6);
  assert.equal(plan[0]?.category.status, "ACTIVE");
  assert.deepEqual(
    plan[0]?.templates.map(({ key, status, versions }) => ({
      key,
      status,
      versions: versions.map((entry) => entry.definition.version),
    })),
    [
      { key: "secret-letter", status: "ACTIVE", versions: [1] },
      { key: "choose-your-heart", status: "ACTIVE", versions: [1] },
    ],
  );
  assert.deepEqual(
    plan.slice(1).map(({ category, templates }) => ({
      key: category.key,
      status: category.status,
      templates,
    })),
    [
      { key: "birthday", status: "INACTIVE", templates: [] },
      { key: "anniversary", status: "INACTIVE", templates: [] },
      { key: "monthsary", status: "INACTIVE", templates: [] },
      { key: "thank-you", status: "INACTIVE", templates: [] },
      { key: "appreciation", status: "INACTIVE", templates: [] },
    ],
  );
});

test("groups unsorted retained versions and selects highest eligible metadata without changing source order", () => {
  const entries = Object.freeze([entry(3, "INACTIVE"), entry(1), entry(2)]);
  const family = createCatalogProvisioningPlan([category], entries)[0]
    ?.templates[0];
  assert.equal(family?.metadata, entries[2]);
  assert.equal(family?.status, "ACTIVE");
  assert.deepEqual(
    family?.versions.map((entry) => entry.definition.version),
    [1, 2, 3],
  );
  assert.deepEqual(
    entries.map((entry) => entry.definition.version),
    [3, 1, 2],
  );
  assert.equal(
    family?.versions.filter((entry) => entry.status === "ACTIVE").at(-1)
      ?.definition.version,
    2,
  );
});

test("retirement keeps the v1 definition resolvable while new drafts select v2", () => {
  const v1 = entry(1, "INACTIVE");
  const v2 = entry(2);
  const family = createCatalogProvisioningPlan([category], [v2, v1])[0]
    ?.templates[0];
  assert.ok(family);
  assert.equal(family.metadata, v2);
  const definitions = family.versions.map((entry) => entry.definition);
  assert.equal(
    resolveTemplateFromDefinitions(
      { registryKey: v1.definition.registryKey, version: 1 },
      definitions,
    ),
    v1.definition,
  );
  assert.equal(
    resolveTemplateFromDefinitions(
      { registryKey: v1.definition.registryKey, version: 2 },
      definitions,
    ),
    undefined,
  );
  assert.equal(
    resolveTemplateFromDefinitions(
      { rendererKey: "letter", version: undefined },
      definitions,
    ),
    undefined,
  );
  assert.deepEqual(
    family.versions.filter((entry) => entry.status === "ACTIVE"),
    [v2],
  );
});

test("a fully retired family keeps its highest retained metadata and every definition", () => {
  const v1 = entry(1, "INACTIVE");
  const v2 = entry(2, "INACTIVE");
  const family = createCatalogProvisioningPlan([category], [v2, v1])[0]
    ?.templates[0];
  assert.equal(family?.status, "INACTIVE");
  assert.equal(family?.metadata, v2);
  assert.deepEqual(family?.versions, [v1, v2]);
});

test("inactive categories disable family eligibility without dropping active definitions", () => {
  const v1 = entry(1);
  const plan = createCatalogProvisioningPlan(
    [{ ...category, status: "INACTIVE" }],
    [v1],
  );
  assert.equal(plan[0]?.templates[0]?.status, "INACTIVE");
  assert.equal(plan[0]?.templates[0]?.versions[0], v1);
});

test("renderer names in different categories produce independent families", () => {
  const other = { ...category, key: "other" };
  const plan = createCatalogProvisioningPlan(
    [category, other],
    [entry(2, "ACTIVE", "other"), entry(1)],
  );
  assert.deepEqual(
    plan.map((group) =>
      group.templates.map((family) =>
        family.versions.map((entry) => entry.definition.registryKey),
      ),
    ),
    [[["fixture.letter"]], [["other.letter.v2"]]],
  );
});

test("empty categories are retained and an empty catalog is valid", () => {
  assert.deepEqual(createCatalogProvisioningPlan([category], []), [
    { category, templates: [] },
  ]);
  assert.deepEqual(createCatalogProvisioningPlan([], []), []);
});

test("unknown status is rejected rather than silently activating a descriptor", () => {
  for (const status of [undefined, "ARCHIVED", "active", ""]) {
    assert.throws(
      () =>
        createCatalogProvisioningPlan(
          [{ ...category, status: status as CatalogProvisioningStatus }],
          [],
        ),
      /provisioning status/,
    );
    assert.throws(
      () =>
        createCatalogProvisioningPlan(
          [category],
          [{ ...entry(1), status: status as CatalogProvisioningStatus }],
        ),
      /provisioning status/,
    );
  }
});

test("invalid or ambiguous identities fail before planning families", () => {
  assert.throws(
    () => createCatalogProvisioningPlan([category], [entry(1), entry(1)]),
    /Duplicate catalog registry/,
  );
  assert.throws(
    () =>
      createCatalogProvisioningPlan(
        [category],
        [
          entry(1),
          {
            ...entry(1),
            definition: { ...entry(1).definition, registryKey: "different" },
          },
        ],
      ),
    /Duplicate catalog template version/,
  );
  assert.throws(
    () =>
      createCatalogProvisioningPlan(
        [category],
        [entry(1, "ACTIVE", "missing")],
      ),
    /Unknown catalog category/,
  );
});
