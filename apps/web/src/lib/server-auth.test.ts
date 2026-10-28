import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";

interface MockCookie {
  name: string;
  value: string;
}

let mockCookies: MockCookie[] = [];

mock.module("next/headers", {
  namedExports: {
    cookies: async () => ({
      has: (name: string) => mockCookies.some((cookie) => cookie.name === name),
      getAll: () => mockCookies,
      toString: () =>
        mockCookies
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
    }),
  },
});

mock.module(new URL("./server-config.ts", import.meta.url), {
  namedExports: {
    getApiOrigin: () => "http://localhost:3001",
  },
});

const { isServerAuthenticated } = await import("./server-auth");

const originalFetch = globalThis.fetch;

afterEach(() => {
  mockCookies = [];
  globalThis.fetch = originalFetch;
});

after(() => {
  mock.restoreAll();
  globalThis.fetch = originalFetch;
});

test("returns false immediately when no session cookies exist without calling fetch", async () => {
  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return new Response(JSON.stringify(null), { status: 200 });
  }) as typeof fetch;

  mockCookies = [];
  const result = await isServerAuthenticated();
  assert.equal(result, false);
  assert.equal(fetchCalled, false);
});

test("returns true when session cookie exists and API confirms valid session", async () => {
  mockCookies = [{ name: "better-auth.session_token", value: "valid-token" }];
  globalThis.fetch = (async (url, init) => {
    assert.equal(url, "http://localhost:3001/api/auth/get-session");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.cookie, "better-auth.session_token=valid-token");
    return new Response(
      JSON.stringify({
        session: { id: "session-123" },
        user: { id: "user-456" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  const result = await isServerAuthenticated();
  assert.equal(result, true);
});

test("returns false when session cookie exists but API reports no active session", async () => {
  mockCookies = [
    { name: "__Secure-better-auth.session_token", value: "expired-token" },
  ];
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify(null), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const result = await isServerAuthenticated();
  assert.equal(result, false);
});

test("returns false gracefully when API returns 401 or network error", async () => {
  mockCookies = [{ name: "better-auth.session_token", value: "invalid-token" }];
  globalThis.fetch = (async () => {
    return new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
    });
  }) as typeof fetch;

  const result401 = await isServerAuthenticated();
  assert.equal(result401, false);

  globalThis.fetch = (async () => {
    throw new Error("Network offline");
  }) as typeof fetch;

  const resultNetworkError = await isServerAuthenticated();
  assert.equal(resultNetworkError, false);
});
