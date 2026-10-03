import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createWebTemplateImplementationRegistry,
  type WebTemplateImplementation,
} from "./implementation-registry";
import {
  createTemplatePreviewPath,
  hasWebTemplateFamily,
  resolveWebTemplate,
} from "./registration";

const registrations = [
  {
    id: "fixture.letter.v1",
    categoryKey: "fixture",
    templateKey: "letter",
    version: 1,
    status: "INACTIVE",
  },
  {
    id: "fixture.letter.v2",
    categoryKey: "fixture",
    templateKey: "letter",
    version: 2,
    status: "ACTIVE",
  },
];
interface Model {
  message: string;
}
function bindings(
  surface: string,
): Record<string, WebTemplateImplementation<ComponentType<Model>>> {
  return Object.fromEntries(
    registrations.map(({ id, version }) => [
      id,
      {
        registryKey: id,
        version,
        implementation: ({ message }: Model) =>
          createElement(
            "section",
            { "aria-label": `${surface} v${version}` },
            message,
          ),
      },
    ]),
  );
}

for (const surface of ["Editor", "Public", "Preview"]) {
  for (const entry of registrations) {
    test(`${surface} dispatch retains v${entry.version} with both versions registered and readable server output`, () => {
      const resolve = createWebTemplateImplementationRegistry(
        registrations,
        bindings(surface),
      );
      const resolved = resolve({
        templateKey: entry.templateKey,
        registryKey: entry.id,
        version: entry.version,
      });
      assert.ok(resolved);
      assert.equal(resolved.registration.status, entry.status);
      const html = renderToStaticMarkup(
        createElement(resolved.implementation, {
          message: "Saved <message> & words",
        }),
      );
      assert.equal(
        html,
        `<section aria-label="${surface} v${entry.version}">Saved &lt;message&gt; &amp; words</section>`,
      );
      assert.ok(!html.includes(`${surface} v${entry.version === 1 ? 2 : 1}`));
    });
  }
}

test("component registration rejects missing, unknown, and mismatched version bindings", () => {
  const implementations = bindings("Public");
  const v1 = implementations["fixture.letter.v1"]!;
  assert.throws(
    () =>
      createWebTemplateImplementationRegistry(registrations, {
        "fixture.letter.v1": v1,
      }),
    /Missing template implementation/,
  );
  assert.throws(
    () =>
      createWebTemplateImplementationRegistry(registrations, {
        ...implementations,
        unknown: { ...v1, registryKey: "unknown" },
      }),
    /Unknown template implementation/,
  );
  assert.throws(
    () =>
      createWebTemplateImplementationRegistry(registrations, {
        ...implementations,
        "fixture.letter.v1": { ...v1, version: 2 },
      }),
    /identity mismatch/,
  );
  assert.throws(
    () =>
      createWebTemplateImplementationRegistry(registrations, {
        ...implementations,
        "fixture.letter.v1": { ...v1, registryKey: "fixture.letter.v2" },
      }),
    /identity mismatch/,
  );
});

test("component dispatch has no newest fallback for ambiguous, conflicting, or missing identities", () => {
  const resolve = createWebTemplateImplementationRegistry(
    registrations,
    bindings("Editor"),
  );
  for (const identity of [
    { templateKey: "letter" },
    { templateKey: "letter", registryKey: "fixture.letter.v1", version: 2 },
    { templateKey: "letter", registryKey: undefined, version: 1 },
    { templateKey: "letter", categoryKey: "other", version: 1 },
    { templateKey: "letter", version: undefined },
    { templateKey: "letter", version: 3 },
    { templateKey: "unknown", version: 1 },
  ])
    assert.equal(resolve(identity), undefined);
  assert.equal(
    resolve({ templateKey: "letter", version: 1 })?.registration.id,
    "fixture.letter.v1",
  );
  assert.equal(
    resolve({ templateKey: "letter", version: 2 })?.registration.id,
    "fixture.letter.v2",
  );
});

test("preview links select their exact version and ambiguous registered families cannot enter catalog fallback", () => {
  const resolve = createWebTemplateImplementationRegistry(
    registrations,
    bindings("Preview"),
  );
  for (const entry of registrations) {
    const path = new URL(
      createTemplatePreviewPath(
        {
          templateKey: entry.templateKey,
          categoryKey: entry.categoryKey,
          version: entry.version,
        },
        "/sign-in",
      ),
      "https://letterly.test",
    );
    const resolved = resolve({
      templateKey: path.pathname.split("/").at(-1)!,
      categoryKey: path.searchParams.get("category")!,
      version: Number(path.searchParams.get("version")),
    });
    assert.equal(resolved?.registration.id, entry.id);
  }
  assert.equal(
    resolveWebTemplate({ templateKey: "letter" }, registrations),
    undefined,
  );
  assert.equal(hasWebTemplateFamily("letter", registrations), true);
  assert.equal(hasWebTemplateFamily("unknown", registrations), false);
});

test("binding registration snapshots source identities and map entries", () => {
  const entries = registrations.map((entry) => ({ ...entry }));
  const implementations = bindings("Public");
  const resolve = createWebTemplateImplementationRegistry(
    entries,
    implementations,
  );
  entries[0]!.version = 99;
  entries.length = 0;
  delete implementations["fixture.letter.v1"];
  assert.equal(
    resolve({ templateKey: "letter", version: 1 })?.registration.id,
    "fixture.letter.v1",
  );
});
