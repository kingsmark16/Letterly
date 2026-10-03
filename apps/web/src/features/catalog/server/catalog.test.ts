import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCategories,
  getLandingCatalog,
  getTemplateCatalogItem,
} from "./catalog";

const categories = [
  {
    key: "confession",
    name: "Confession",
    description: null,
    displayOrder: 1,
  },
];

test("landing catalog includes every active category and its templates", async (t) => {
  const allCategories = [
    ...categories,
    {
      key: "celebration",
      name: "Celebration",
      description: "Words for the moments worth celebrating.",
      displayOrder: 2,
    },
  ];
  const templates = [
    {
      id: "11111111-1111-4111-8111-111111111111",
      categoryKey: "confession",
      key: "note",
      name: "A private note",
      description: null,
      displayOrder: 1,
      versions: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          version: 1,
          capabilities: [],
          audioCapability: "hidden",
        },
      ],
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      categoryKey: "celebration",
      key: "note",
      name: "A celebration note",
      description: null,
      displayOrder: 1,
      versions: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          version: 1,
          capabilities: [],
          audioCapability: "hidden",
        },
      ],
    },
  ];
  const requestedPaths: string[] = [];

  t.mock.method(
    globalThis,
    "fetch",
    async (
      input: Parameters<typeof globalThis.fetch>[0],
      init: Parameters<typeof globalThis.fetch>[1],
    ) => {
      assert.equal(init?.cache, "no-store");
      const url = new URL(String(input));
      requestedPaths.push(`${url.pathname}${url.search}`);
      return url.pathname.endsWith("/categories")
        ? Response.json(allCategories)
        : Response.json(templates);
    },
  );

  assert.deepEqual(await getLandingCatalog(), {
    categories: allCategories,
    templates,
  });
  assert.deepEqual(requestedPaths.sort(), [
    "/api/v1/categories",
    "/api/v1/templates",
  ]);
});

test("recovers from a proxy socket failure without caching catalog data", async (t) => {
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (...[, options]: Parameters<typeof fetch>) => {
      assert.equal(options?.cache, "no-store");
      if (++calls === 1) throw new TypeError("fetch failed");
      return Response.json(categories);
    },
  );
  assert.deepEqual(await getCategories(), categories);
  assert.equal(calls, 2);
});

test("retries a temporary gateway failure once", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    return ++calls === 1
      ? new Response(null, { status: 502 })
      : Response.json(categories);
  });
  assert.deepEqual(await getCategories(), categories);
  assert.equal(calls, 2);
});

test("recovers when the catalog API returns a temporary internal error", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    return ++calls === 1
      ? Response.json({ code: "INTERNAL_SERVER_ERROR" }, { status: 500 })
      : Response.json(categories);
  });
  assert.deepEqual(await getCategories(), categories);
  assert.equal(calls, 2);
});

test("stops after one retry even when the failure changes", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (++calls === 1) throw new TypeError("fetch failed");
    return new Response(null, { status: 503 });
  });
  await assert.rejects(getCategories(), /status 503/);
  assert.equal(calls, 2);
});

test("does not retry permanent HTTP or invalid catalog responses", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    return new Response(null, { status: 404 });
  });
  await assert.rejects(getCategories(), /status 404/);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async () =>
    Response.json({ invalid: true }),
  );
  await assert.rejects(getCategories());
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("catalog lookup rejects ambiguous bare keys and resolves a requested category", async (t) => {
  const templates = ["confession", "celebration"].map((categoryKey) => ({
    id: "11111111-1111-4111-8111-111111111111",
    categoryKey,
    key: "shared",
    name: "Shared",
    description: null,
    displayOrder: 1,
    versions: [],
  }));
  t.mock.method(globalThis, "fetch", async () => Response.json(templates));
  assert.equal(await getTemplateCatalogItem("shared"), undefined);
  assert.deepEqual(
    await getTemplateCatalogItem("shared", "celebration"),
    templates[1],
  );
  assert.equal(await getTemplateCatalogItem("shared", "missing"), undefined);
});
