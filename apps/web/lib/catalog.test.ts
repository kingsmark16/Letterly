import assert from "node:assert/strict";
import { test } from "node:test";
import { getCategories } from "./catalog";

const categories = [
  {
    key: "confession",
    name: "Confession",
    description: null,
    displayOrder: 1,
  },
];

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
