import assert from "node:assert/strict";
import { test } from "node:test";
import {
  categoryDefinitions,
  templateDefinitions,
} from "@letterly/templates/catalog";
import type { CatalogProvisioningStatus } from "@letterly/templates/catalog-provisioning";
import { secretLetterTemplate } from "@letterly/templates/secret-letter";
import { createBrowserCatalogFixture } from "./catalog-builder";
import { catalogCategories, catalogTemplates } from "./catalog";

const category = {
  key: "fixture",
  name: "Fixture",
  description: "Isolated",
  displayOrder: 1,
  status: "ACTIVE" as const,
};
const familyId = "11111111-1111-4111-8111-111111111111";
const v1Id = "22222222-2222-4222-8222-222222222222";
const v2Id = "33333333-3333-4333-8333-333333333333";
const ids = {
  "fixture.letter": { id: familyId, versionId: v1Id },
  "fixture.letter.v2": { id: familyId, versionId: v2Id },
};
function entry(version: number, status: CatalogProvisioningStatus = "ACTIVE") {
  return {
    categoryKey: category.key,
    name: `Letter v${version}`,
    description: `Version ${version}`,
    displayOrder: version,
    status,
    definition: {
      ...secretLetterTemplate,
      registryKey: version === 1 ? "fixture.letter" : "fixture.letter.v2",
      version,
      renderer: { ...secretLetterTemplate.renderer, key: "letter" },
    },
  };
}

test("canonical browser catalog preserves launch IDs, metadata, capabilities, and two cards", () => {
  assert.deepEqual(
    catalogCategories,
    categoryDefinitions.map(({ key, name, description, displayOrder }) => ({
      key,
      name,
      description,
      displayOrder,
    })),
  );
  assert.equal(catalogTemplates.length, 2);
  assert.deepEqual(
    catalogTemplates.map((template) => template.id),
    [familyId, v2Id],
  );
  for (const [index, entry] of templateDefinitions.entries()) {
    const template = catalogTemplates[index];
    assert.ok(template);
    assert.equal(template.name, entry.name);
    assert.equal(template.key, entry.definition.renderer.key);
    assert.equal(template.versions.length, 1);
    assert.equal(template.versions[0]?.version, 1);
    assert.deepEqual(
      template.versions[0]?.capabilities,
      entry.definition.capabilities,
    );
    assert.equal(
      template.versions[0]?.audioCapability,
      entry.definition.audioCapability,
    );
    assert.ok(!("status" in template));
    assert.ok(!("registryKey" in template));
  }
});

test("v1 and v2 share one catalog card with ascending eligible versions", () => {
  const catalog = createBrowserCatalogFixture(
    [category],
    [entry(2), entry(1)],
    ids,
  );
  assert.equal(catalog.catalogTemplates.length, 1);
  const template = catalog.catalogTemplates[0];
  assert.equal(template?.id, familyId);
  assert.equal(template?.name, "Letter v2");
  assert.deepEqual(
    template?.versions.map((version) => ({
      id: version.id,
      version: version.version,
    })),
    [
      { id: v1Id, version: 1 },
      { id: v2Id, version: 2 },
    ],
  );
  assert.equal(template?.versions.at(-1)?.id, v2Id);
});

test("retired v1 is absent from creation choices while eligible v2 remains", () => {
  const v1 = entry(1, "INACTIVE");
  const catalog = createBrowserCatalogFixture([category], [v1, entry(2)], ids);
  assert.deepEqual(
    catalog.catalogTemplates[0]?.versions.map((version) => version.id),
    [v2Id],
  );
  assert.equal(v1.status, "INACTIVE");
  assert.equal(v1.definition.version, 1);
});

test("retired v2 cannot replace active v1 card metadata or default selection", () => {
  const catalog = createBrowserCatalogFixture(
    [category],
    [entry(2, "INACTIVE"), entry(1)],
    ids,
  );
  assert.equal(catalog.catalogTemplates[0]?.name, "Letter v1");
  assert.equal(catalog.catalogTemplates[0]?.versions.at(-1)?.id, v1Id);
});

test("inactive categories and fully inactive families offer no new draft choices", () => {
  assert.deepEqual(
    createBrowserCatalogFixture(
      [{ ...category, status: "INACTIVE" }],
      [entry(1), entry(2)],
      ids,
    ),
    { catalogCategories: [], catalogTemplates: [] },
  );
  const catalog = createBrowserCatalogFixture(
    [category],
    [entry(1, "INACTIVE"), entry(2, "INACTIVE")],
    ids,
  );
  assert.equal(catalog.catalogCategories.length, 1);
  assert.deepEqual(catalog.catalogTemplates, []);
});

test("missing IDs and inconsistent family identities fail fixture construction", () => {
  assert.throws(
    () => createBrowserCatalogFixture([category], [entry(1)], {}),
    /Missing browser fixture IDs/,
  );
  assert.throws(
    () =>
      createBrowserCatalogFixture([category], [entry(1), entry(2)], {
        ...ids,
        "fixture.letter.v2": { id: v2Id, versionId: v2Id },
      }),
    /Conflicting browser fixture family IDs/,
  );
});
