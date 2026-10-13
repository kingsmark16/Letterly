import { expect, test } from "@playwright/test";

const session = {
  session: {
    id: "list-session",
    userId: "list-creator",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  user: {
    id: "list-creator",
    name: "List Creator",
    email: "list@example.com",
    emailVerified: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
};

function summary(id: string, label: string) {
  return {
    id,
    recipientLabel: label,
    status: "DRAFT",
    contentVersion: 0,
    preview: { title: label },
    template: {
      id: "33333333-3333-4333-8333-333333333333",
      key: "secret-letter",
      name: "Secret Letter",
      templateVersionId: "22222222-2222-4222-8222-222222222222",
      version: 1,
      registryKey: "confession.secret-letter",
    },
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: session }),
  );
});

test("loads the next page with the returned cursor and current filter", async ({
  page,
}) => {
  const cursors: (string | null)[] = [];
  await page.route("**/api/v1/pages?*", (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get("status")).toBe("ALL");
    expect(url.searchParams.get("size")).toBe("20");
    const cursor = url.searchParams.get("cursor");
    cursors.push(cursor);
    return route.fulfill({
      json: {
        items: [
          cursor
            ? summary("44444444-4444-4444-8444-444444444444", "Second letter")
            : summary("11111111-1111-4111-8111-111111111111", "First letter"),
        ],
        nextCursor: cursor ? null : "next-page",
      },
    });
  });
  await page.goto("/dashboard/pages");
  await expect(
    page.getByRole("heading", { name: "First letter", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Load more" }).click();
  await expect(
    page.getByRole("heading", { name: "Second letter", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "First letter", exact: true }),
  ).toBeVisible();
  expect(cursors).toEqual([null, "next-page"]);
});

test("recovers from one transient gateway response", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/v1/pages?*", (route) => {
    requests++;
    if (requests === 1) {
      return route.fulfill({
        status: 502,
        contentType: "text/html",
        body: "Bad Gateway",
      });
    }

    return route.fulfill({ json: { items: [], nextCursor: null } });
  });

  await page.goto("/dashboard/pages");

  await expect(
    page.getByRole("heading", { name: "Your first page is still waiting." }),
  ).toBeVisible();
  expect(requests).toBe(2);
});

test("shows a safe malformed-response error and recovers after an explicit retry", async ({
  page,
}) => {
  let valid = false;
  await page.route("**/api/v1/pages?*", (route) =>
    route.fulfill({
      json: valid
        ? { items: [], nextCursor: null }
        : { privateDiagnostic: "must not be displayed" },
    }),
  );
  await page.goto("/dashboard/pages");
  const alert = page.locator("#dashboard-content").getByRole("alert");
  await expect(alert).toContainText(
    "We received an unexpected response. Please try again.",
  );
  await expect(page.getByText("must not be displayed")).toHaveCount(0);
  valid = true;
  await alert.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Your first page is still waiting." }),
  ).toBeVisible();
});

test("unknown or mismatched thumbnail identity uses a generic placeholder", async ({
  page,
}) => {
  const known = summary("11111111-1111-4111-8111-111111111111", "Known letter");
  const unknown = summary(
    "44444444-4444-4444-8444-444444444444",
    "Unknown design",
  );
  unknown.template.key = "future-template";
  unknown.template.registryKey = "confession.future-template";
  const mismatched = summary(
    "55555555-5555-4555-8555-555555555555",
    "Mismatched design",
  );
  mismatched.template.registryKey = "confession.choose-your-heart";
  await page.route("**/api/v1/pages?*", (route) =>
    route.fulfill({
      json: { items: [known, unknown, mismatched], nextCursor: null },
    }),
  );
  await page.goto("/dashboard/pages");
  await expect(
    page.getByRole("heading", { name: "Unknown design", exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-template-placeholder="true"]')).toHaveCount(
    2,
  );
  await expect(
    page.locator('[data-template-thumbnail="secret-letter"]'),
  ).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Known letter", exact: true }),
  ).toBeVisible();
});
