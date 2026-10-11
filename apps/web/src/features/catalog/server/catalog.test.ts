import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getCategories,
  getLandingCatalog,
  getTemplateCatalogPage,
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

test("AC-2 and AC-9 landing catalog loads one grouped overview with one family preview per category", async (t) => {
  const overview = {
    categories: [
      {
        ...categories[0],
        templates: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            categoryKey: "confession",
            key: "note",
            name: "A private note",
            description: null,
            displayOrder: 1,
            currentVersion: {
              id: "22222222-2222-4222-8222-222222222222",
              version: 1,
              capabilities: [],
              audioCapability: "hidden",
            },
          },
        ],
      },
      {
        key: "celebration",
        name: "Celebration",
        description: "Words for the moments worth celebrating.",
        displayOrder: 2,
        templates: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            categoryKey: "celebration",
            key: "note",
            name: "A celebration note",
            description: null,
            displayOrder: 1,
            currentVersion: {
              id: "44444444-4444-4444-8444-444444444444",
              version: 1,
              capabilities: [],
              audioCapability: "hidden",
            },
          },
        ],
      },
    ],
  };
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
      return Response.json(overview);
    },
  );

  assert.deepEqual(await getLandingCatalog(), overview);
  assert.deepEqual(requestedPaths, ["/api/v1/catalog/overview"]);
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

test("AC-5 focused catalog lookup rejects ambiguous keys and resolves a requested version", async (t) => {
  const selected = {
    id: "33333333-3333-4333-8333-333333333333",
    categoryKey: "celebration",
    key: "shared",
    name: "Shared",
    description: null,
    displayOrder: 1,
    selectedVersion: {
      id: "44444444-4444-4444-8444-444444444444",
      version: 2,
      capabilities: [],
      audioCapability: "hidden",
    },
  };
  const requestedPaths: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(String(input));
      requestedPaths.push(`${url.pathname}${url.search}`);
      return url.searchParams.get("categoryKey") === "celebration" &&
        url.searchParams.get("version") === "2"
        ? Response.json(selected)
        : new Response(null, { status: 404 });
    },
  );
  assert.equal(await getTemplateCatalogItem("shared"), undefined);
  assert.deepEqual(
    await getTemplateCatalogItem("shared", "celebration", 2),
    selected,
  );
  assert.equal(await getTemplateCatalogItem("shared", "missing"), undefined);
  assert.deepEqual(requestedPaths, [
    "/api/v1/catalog/templates/lookup?templateKey=shared",
    "/api/v1/catalog/templates/lookup?templateKey=shared&categoryKey=celebration&version=2",
    "/api/v1/catalog/templates/lookup?templateKey=shared&categoryKey=missing",
  ]);
});

test("focused catalog lookup keeps service failures visible to its caller", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 503 }),
  );
  await assert.rejects(
    getTemplateCatalogItem("shared"),
    /Catalog request failed with status 503/,
  );
});

test("AC-3 and AC-4 template page reader sends URL filters and validates the bounded response", async (t) => {
  const page = {
    items: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        categoryKey: "confession",
        key: "note",
        name: "A private note",
        description: null,
        displayOrder: 1,
        currentVersion: {
          id: "22222222-2222-4222-8222-222222222222",
          version: 2,
          capabilities: [],
          audioCapability: "hidden",
        },
      },
    ],
    nextCursor: "bmV4dA",
    previousCursor: null,
  };
  let requestedPath = "";
  t.mock.method(
    globalThis,
    "fetch",
    async (
      input: Parameters<typeof globalThis.fetch>[0],
      init: Parameters<typeof globalThis.fetch>[1],
    ) => {
      assert.equal(init?.cache, "no-store");
      const url = new URL(String(input));
      requestedPath = `${url.pathname}${url.search}`;
      return Response.json(page);
    },
  );

  assert.deepEqual(
    await getTemplateCatalogPage({
      categoryKey: "confession",
      q: " love ",
      size: 1,
      cursor: "cGFnZQ",
      direction: "before",
    }),
    page,
  );
  assert.equal(
    requestedPath,
    "/api/v1/catalog/templates?categoryKey=confession&q=+love+&size=1&cursor=cGFnZQ&direction=before",
  );
});
