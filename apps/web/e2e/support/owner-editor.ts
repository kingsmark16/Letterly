import type { Page } from "@playwright/test";
import { ownerPage, pageId, session } from "../fixtures/owner-page";

export async function installOwnerEditorRoutes(
  page: Page,
  owner = ownerPage(
    1,
    "Avery",
    "A message worth keeping.",
    "2026-08-20T00:05:00.000Z",
  ),
): Promise<void> {
  const reads: ReadonlyArray<readonly [string, unknown]> = [
    ["**/api/auth/get-session", session],
    [`**/api/v1/pages/${pageId}`, owner],
    [`**/api/v1/pages/${pageId}/questions`, []],
    [
      `**/api/v1/pages/${pageId}/submissions**`,
      { items: [], unreadCount: 0, nextCursor: null },
    ],
  ];
  for (const [path, json] of reads) {
    await page.route(path, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 200, json })
        : route.continue(),
    );
  }
}
