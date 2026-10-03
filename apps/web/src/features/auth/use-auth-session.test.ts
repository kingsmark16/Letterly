import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let cachedSession: {
  data: { user: { name: string } } | null;
  error: { message: string } | null;
  isPending: boolean;
} = { data: null, error: null, isPending: false };

mock.module(new URL("../../lib/auth-client.ts", import.meta.url), {
  namedExports: { authClient: { useSession: () => cachedSession } },
});
const { useAuthSession } = await import("./use-auth-session");
after(() => mock.restoreAll());

function SessionView(): React.ReactElement {
  const session = useAuthSession();
  return createElement(
    "span",
    null,
    session.isPending
      ? "Checking sign-in"
      : (session.data?.user.name ?? session.error?.message ?? "Signed out"),
  );
}

test("server session markup stays pending when a shared store already resolved", () => {
  for (const state of [
    { data: { user: { name: "Cached user" } }, error: null, isPending: false },
    { data: null, error: null, isPending: false },
    { data: null, error: { message: "Cached error" }, isPending: false },
  ]) {
    cachedSession = state;
    assert.equal(
      renderToStaticMarkup(createElement(SessionView)),
      "<span>Checking sign-in</span>",
    );
  }
});
