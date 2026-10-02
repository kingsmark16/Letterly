import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createTemplatePreviewPath,
  getWebTemplate,
  resolveWebTemplate,
  webTemplateRegistrations,
} from "./registration";

test("launch web registrations match their full immutable identity", () => {
  for (const entry of webTemplateRegistrations) {
    assert.equal(
      getWebTemplate({
        templateKey: entry.templateKey,
        categoryKey: entry.categoryKey,
        version: entry.version,
        registryKey: entry.id,
      }),
      entry,
    );
    assert.equal(getWebTemplate({ templateKey: entry.templateKey }), entry);
  }
});
test("explicit invalid or missing constraints never fall back to another identity", () => {
  for (const templateKey of ["unknown", "toString", "__proto__", ""])
    assert.equal(getWebTemplate({ templateKey }), undefined);
  for (const extra of [
    { categoryKey: "other" },
    { categoryKey: undefined },
    { version: 999 },
    { version: undefined },
    { registryKey: "wrong" },
    { registryKey: undefined },
  ]) {
    assert.equal(
      getWebTemplate({ templateKey: "secret-letter", ...extra }),
      undefined,
    );
  }
});
test("cross category keys and multiple versions require unambiguous identity", () => {
  const entries = [
    { id: "one.v1", categoryKey: "one", templateKey: "shared", version: 1 },
    { id: "two.v1", categoryKey: "two", templateKey: "shared", version: 1 },
    { id: "one.v2", categoryKey: "one", templateKey: "shared", version: 2 },
  ] as const;
  assert.equal(
    resolveWebTemplate({ templateKey: "shared" }, entries),
    undefined,
  );
  assert.equal(
    resolveWebTemplate({ templateKey: "shared", version: 1 }, entries),
    undefined,
  );
  assert.equal(
    resolveWebTemplate({ templateKey: "shared", categoryKey: "one" }, entries),
    undefined,
  );
  assert.equal(
    resolveWebTemplate(
      { templateKey: "shared", categoryKey: "one", version: 2 },
      entries,
    ),
    entries[2],
  );
  assert.equal(
    resolveWebTemplate(
      { templateKey: "shared", registryKey: "two.v1", version: 1 },
      entries,
    ),
    entries[1],
  );
  assert.equal(
    resolveWebTemplate(
      { templateKey: "shared", categoryKey: "one", version: 1 },
      [entries[0], entries[0]],
    ),
    undefined,
  );
});
test("preview links retain start paths and encode category and version", () => {
  const start = "/create?templateVersionId=uuid&returnTo=/dashboard/pages";
  const result = new URL(
    createTemplatePreviewPath(
      { templateKey: "secret-letter", categoryKey: "confession", version: 1 },
      start,
    ),
    "https://letterly.test",
  );
  assert.equal(result.pathname, "/preview/secret-letter");
  assert.equal(result.searchParams.get("start"), start);
  assert.equal(result.searchParams.get("category"), "confession");
  assert.equal(result.searchParams.get("version"), "1");
});
