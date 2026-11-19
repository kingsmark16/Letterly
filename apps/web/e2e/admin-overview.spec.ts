import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  adminOverviewResponseSchema,
  type AdminOverviewPeriod,
} from "@letterly/contracts/admin-overview";

const endpoint = "**/api/v1/admin/overview?*";
function fixture(period: AdminOverviewPeriod, coverage = true) {
  const today = Date.UTC(2026, 10, 19);
  const start = today - (period - 1) * 86_400_000;
  const split = { active: "2", disabled: "1", total: "3" };
  return adminOverviewResponseSchema.parse({
    period,
    asOf: "2026-11-19T16:00:00.000Z",
    periodStart: new Date(start).toISOString(),
    periodEndExclusive: "2026-11-20T00:00:00.000Z",
    coverageStartedAt: coverage ? "2026-11-18T12:00:00.000Z" : null,
    workload: {
      openReports: "1",
      requestedAppeals: "2",
      unfinishedDeletions: "3",
      deletionsNeedingAttention: "1",
    },
    creators: split,
    pages: {
      ...split,
      byPublication: {
        DRAFT: split,
        PUBLISHED: split,
        UNPUBLISHED: split,
        ARCHIVED: split,
      },
    },
    buckets: Array.from({ length: period }, (_, index) => {
      const date = new Date(start + index * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const available = coverage && index >= period - 2;
      return {
        date,
        available,
        partial: available,
        creatorSignups: available ? "1" : null,
        pagesCreated: available ? "2" : null,
        publishActions: available ? "4" : null,
        pageViews: available
          ? index === period - 1
            ? "9007199254740993"
            : "1"
          : null,
        dailyPageVisits: available ? "6" : null,
      };
    }),
  });
}

test("overview shows exact activity, accessible alternatives, and UTC periods", async ({
  page,
}, testInfo) => {
  await page.route(endpoint, (route) => {
    const period = Number(
      new URL(route.request().url()).searchParams.get("period"),
    ) as AdminOverviewPeriod;
    return route.fulfill({ json: fixture(period) });
  });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/overview$/);
  await expect(
    page.getByRole("heading", { name: "Work needing attention" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Current platform totals" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "30 days", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await expect(page).toHaveURL(/period=7$/);
  const trend = page.getByRole("region", {
    name: "Page views and daily visits",
    exact: true,
  });
  await expect(
    trend.getByTestId("overview-chart").locator("svg.recharts-surface"),
  ).toBeVisible();
  await expect(
    trend.getByText("9,007,199,254,740,994", { exact: true }),
  ).toBeVisible();
  await trend.getByText("View daily data", { exact: true }).focus();
  await page.keyboard.press("Enter");
  const table = trend.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(
    table.getByText("9,007,199,254,740,993", { exact: true }),
  ).toBeVisible();
  await expect(table.getByText("Partial day", { exact: true })).toHaveCount(2);
  await expect(table.getByText("Unavailable", { exact: true })).toHaveCount(10);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("admin-overview.png"),
    fullPage: true,
  });
});

test("overview recovers from unavailable data without inventing history", async ({
  page,
}) => {
  let available = false;
  await page.route(endpoint, (route) =>
    available
      ? route.fulfill({ json: fixture(30, false) })
      : route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "ANALYTICS_UNAVAILABLE",
            message: "Platform activity is temporarily unavailable",
            requestId: "fixture-request",
          },
        }),
  );
  await page.goto("/admin/overview");
  await expect(
    page.getByRole("heading", { name: "Could not load the overview" }),
  ).toBeVisible();
  available = true;
  await page.getByRole("button", { name: "Retry overview" }).click();
  await expect(
    page.getByRole("heading", { name: "Work needing attention" }),
  ).toBeVisible();
  await expect(
    page.getByText("History is unavailable until activity capture starts."),
  ).toBeVisible();
  await expect(page.getByTestId("overview-chart")).toHaveCount(0);
});

test("overview pauses its periodic refresh while hidden", async ({ page }) => {
  let reads = 0;
  await page.clock.install();
  await page.route(endpoint, (route) => {
    reads++;
    return route.fulfill({ json: fixture(30, false) });
  });
  await page.goto("/admin/overview");
  await expect(
    page.getByRole("heading", { name: "Work needing attention" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
  await page.clock.fastForward(120_000);
  expect(reads).toBe(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));
  });
  await expect.poll(() => reads).toBe(2);
  await page.clock.fastForward(60_000);
  await expect.poll(() => reads).toBeGreaterThanOrEqual(3);
});
