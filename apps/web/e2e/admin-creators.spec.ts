import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { adminCreatorDetailSchema } from "@letterly/contracts/moderation";
import { adminCreatorSummarySchema } from "@letterly/contracts/admin-operations";
import { appOrigin } from "./support/app-origin";
import { adminReportId } from "./fixtures/admin-moderation";

const creator = adminCreatorDetailSchema.parse({
  id: "creator-fixture",
  name: "<script>Example creator</script>",
  email: "creator@example.test",
  role: "CREATOR",
  moderationStatus: "ACTIVE",
  createdAt: "2026-11-17T01:00:00.000Z",
  updatedAt: "2026-11-17T02:00:00.000Z",
  disabledAt: null,
  disabledReason: null,
  moderationVersion: 0,
  pageCount: 7,
  deletionRequestedAt: null,
  deletionJobId: null,
});

test("creator lookup works by keyboard and renders safe operational details", async ({
  page,
}, testInfo) => {
  await page.route("**/api/v1/admin/creators/creator-fixture", (route) =>
    route.fulfill({ json: creator }),
  );
  await page.route("**/api/v1/admin/creators/search", (route) => {
    const summary = adminCreatorSummarySchema.strip().parse(creator);
    return route.fulfill({ json: { items: [summary], nextCursor: null } });
  });
  await page.goto("/admin/creators");
  await page.getByRole("button", { name: "Search creators" }).click();
  await expect(
    page.getByText("Enter a valid value and check the filters."),
  ).toBeVisible();
  await page.getByLabel("Search value", { exact: true }).fill(creator.id);
  await page.getByLabel("Search value", { exact: true }).press("Enter");
  await page.getByRole("link", { name: creator.name, exact: true }).click();
  await expect(
    page.getByRole("heading", { name: creator.name, exact: true }),
  ).toBeVisible();
  await expect(page.getByText(creator.email, { exact: true })).toBeVisible();
  await expect(page.getByText("7", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View account audit history" }),
  ).toHaveAttribute(
    "href",
    "/admin/moderation/audit?targetType=USER&targetId=creator-fixture",
  );
  expect(
    await page
      .locator("[data-admin-root]")
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor),
  ).toBe("rgb(244, 246, 248)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("creator-details.png"),
    fullPage: true,
  });
});

test("mobile navigation traps focus and returns it after Escape", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/admin/creators");
  const trigger = page.getByRole("button", { name: "Open menu" });
  await trigger.focus();
  await trigger.press("Enter");
  const menu = page.getByRole("dialog", { name: "Administration menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Close menu" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    menu.getByRole("link", { name: "Creators", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("creator detail recovers from unavailable reads and missing targets", async ({
  page,
}) => {
  let status = 503;
  await page.route("**/api/v1/admin/creators/creator-fixture", (route) =>
    route.fulfill({
      status,
      json:
        status === 200
          ? creator
          : {
              statusCode: status,
              code: status === 404 ? "NOT_FOUND" : "SERVICE_UNAVAILABLE",
              message: "Resource unavailable",
              requestId: "54000000-0000-4000-8000-000000000001",
            },
    }),
  );
  await page.goto("/admin/creators/creator-fixture");
  await expect(
    page.getByRole("heading", { name: "Could not load this creator" }),
  ).toBeVisible();
  status = 200;
  await page.getByRole("button", { name: "Retry lookup" }).click();
  await expect(page.getByText(creator.email, { exact: true })).toBeVisible();
  status = 404;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Creator unavailable" }),
  ).toBeVisible();
  await expect(page.getByText(creator.email, { exact: true })).toHaveCount(0);
});

test("lost access clears visible creator identity and offers safe sign in", async ({
  page,
}) => {
  let expired = false;
  await page.route("**/api/v1/admin/creators/creator-fixture", (route) =>
    route.fulfill({
      status: expired ? 401 : 200,
      json: expired
        ? {
            statusCode: 401,
            code: "UNAUTHENTICATED",
            message: "Authentication required",
            requestId: "54000000-0000-4000-8000-000000000001",
          }
        : creator,
    }),
  );
  await page.goto("/admin/creators/creator-fixture");
  await expect(page.getByText(creator.email, { exact: true })).toBeVisible();
  expired = true;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to continue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute(
    "href",
    "/sign-in?returnTo=%2Fadmin%2Fcreators%2Fcreator-fixture",
  );
  await expect(
    page.getByRole("navigation", { name: "Administration" }),
  ).toHaveCount(0);
  await expect(page.getByText(creator.email, { exact: true })).toHaveCount(0);
});

test("server denial prevents creator console hydration", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: "fixture-admin-access", value: "denied", url: appOrigin },
  ]);
  let creatorReads = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/admin/creators/")) creatorReads += 1;
  });
  await page.goto("/admin/creators/creator-fixture");
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  expect(creatorReads).toBe(0);
});

test("losing access during moderation removes the admin workspace", async ({
  page,
}) => {
  await page.route(`**/api/v1/admin/reports/${adminReportId}/review`, (route) =>
    route.fulfill({
      status: 403,
      json: {
        statusCode: 403,
        code: "ADMIN_REQUIRED",
        message: "Administrator access required",
        requestId: "54000000-0000-4000-8000-000000000001",
      },
    }),
  );
  await page.goto(`/admin/moderation/reports?report=${adminReportId}`);
  await page
    .getByRole("button", { name: "Mark reviewed", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm action" }).click();
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Administration" }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the shell reflows across phone, tablet, and desktop widths", async ({
  page,
}) => {
  await page.route("**/api/v1/admin/creators/creator-fixture", (route) =>
    route.fulfill({
      json: {
        ...creator,
        name: "A".repeat(160),
        email: `${"a".repeat(100)}@example.test`,
      },
    }),
  );
  await page.goto("/admin/creators/creator-fixture");
  await expect(
    page.getByRole("heading", { name: "A".repeat(160), exact: true }),
  ).toBeVisible();
  for (const width of [320, 768, 1023, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const menu = page.getByRole("button", { name: "Open menu" });
    if (width < 1024) await expect(menu).toBeVisible();
    else await expect(menu).toBeHidden();
  }
});

test("admin theme leaves the public landing unchanged", async ({ page }) => {
  await page.goto("/");
  const baseline = await page.locator("body").evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    font: getComputedStyle(element).fontFamily,
  }));
  await page.goto("/admin/creators");
  await expect(
    page.getByRole("heading", { name: "Creators", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  expect(
    await page.locator("body").evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      font: getComputedStyle(element).fontFamily,
    })),
  ).toEqual(baseline);
  await expect(page.locator("[data-admin-root]")).toHaveCount(0);
});
