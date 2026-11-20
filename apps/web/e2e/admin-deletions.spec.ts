import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  deletionAcceptRequestSchema,
  deletionRetryRequestSchema,
} from "@letterly/contracts/admin-deletions";
import {
  deletionJob,
  deletionPreview,
  deletionSummary,
} from "./fixtures/admin-deletions";
import { operationsPage } from "./fixtures/admin-operations";

const pagePath = `/admin/pages/${operationsPage.id}`,
  previewPath = `**/api/v1/admin/pages/${operationsPage.id}/deletion-preview`,
  acceptPath = `**/api/v1/admin/pages/${operationsPage.id}/deletions`,
  jobPath = `/admin/deletions/${deletionJob.id}`;
const unavailable = {
  statusCode: 503,
  code: "SERVICE_UNAVAILABLE",
  message: "Unavailable",
  requestId: "59000000-0000-4000-8000-000000000001",
};
test("typed confirmation freezes the complete uncertain request and opens retained progress", async ({
  page,
}, info) => {
  const requests: unknown[] = [],
    urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));
  await page.route(previewPath, (route) =>
    route.fulfill({ json: deletionPreview }),
  );
  await page.route(acceptPath, (route) => {
    requests.push(
      deletionAcceptRequestSchema.parse(route.request().postDataJSON()),
    );
    return requests.length === 1
      ? route.fulfill({ status: 503, json: unavailable })
      : route.fulfill({ status: 202, json: deletionSummary });
  });
  await page.goto(pagePath);
  await page
    .getByRole("button", { name: "Preview permanent deletion", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Permanently delete page",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Permanently delete page", exact: true })
    .click();
  await expect(
    dialog.getByText("Enter the exact page ID.", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: /Exact page ID/ })
    .fill(operationsPage.id);
  await dialog
    .getByRole("textbox", { name: "Internal note (optional)", exact: true })
    .fill("Synthetic deletion note.");
  await dialog
    .getByRole("checkbox", {
      name: "I understand this permanently deletes the page.",
      exact: true,
    })
    .check();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({
    path: info.outputPath("deletion-confirmation.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Permanently delete page", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry deletion request", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("textbox", {
      name: "Internal note (optional)",
      exact: true,
    }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Retry deletion request", exact: true })
    .click();
  await expect(page).toHaveURL(jobPath);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  expect(
    urls.some((url) => url.includes(deletionPreview.confirmationToken)),
  ).toBe(false);
  expect(
    await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    ),
  ).not.toContain("Synthetic deletion note.");
});
test("keyboard cancellation returns focus and starts no deletion", async ({
  page,
}) => {
  let mutations = 0;
  await page.route(previewPath, (route) =>
    route.fulfill({ json: deletionPreview }),
  );
  await page.route(acceptPath, (route) => {
    mutations++;
    return route.fulfill({ status: 202, json: deletionSummary });
  });
  await page.goto(pagePath);
  const trigger = page.getByRole("button", {
    name: "Preview permanent deletion",
    exact: true,
  });
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(mutations).toBe(0);
});
test("stale impact refreshes the page and requires a fresh preview and key", async ({
  page,
}) => {
  let version = 0;
  const bodies: Array<ReturnType<typeof deletionAcceptRequestSchema.parse>> =
    [];
  await page.route(`**/api/v1/admin/pages/${operationsPage.id}`, (route) =>
    route.fulfill({ json: { ...operationsPage, moderationVersion: version } }),
  );
  await page.route(previewPath, (route) =>
    route.fulfill({
      json: {
        ...deletionPreview,
        expectedModerationVersion: version,
        confirmationToken: `fixture-token-${version}`,
      },
    }),
  );
  await page.route(acceptPath, (route) => {
    bodies.push(
      deletionAcceptRequestSchema.parse(route.request().postDataJSON()),
    );
    if (bodies.length === 1) {
      version = 1;
      return route.fulfill({
        status: 409,
        json: {
          ...unavailable,
          statusCode: 409,
          code: "STALE_DELETION_IMPACT",
        },
      });
    }
    return route.fulfill({ status: 202, json: deletionSummary });
  });
  await page.goto(pagePath);
  for (let attempt = 0; attempt < 2; attempt++) {
    await page
      .getByRole("button", { name: "Preview permanent deletion", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: /Exact page ID/ })
      .fill(operationsPage.id);
    await dialog.getByRole("checkbox").check();
    await dialog
      .getByRole("button", { name: "Permanently delete page", exact: true })
      .click();
    if (!attempt)
      await expect(
        page.getByText(
          "The page or impact changed. Review the refreshed details and request a new preview.",
          { exact: true },
        ),
      ).toBeVisible();
  }
  await expect(page).toHaveURL(jobPath);
  expect(bodies[1]?.expectedModerationVersion).toBe(1);
  expect(bodies[1]?.idempotencyKey).not.toBe(bodies[0]?.idempotencyKey);
  expect(bodies[1]?.confirmationToken).not.toBe(bodies[0]?.confirmationToken);
});
test("deletion list filters, empty results, and errors have recovery controls", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/api/v1/admin/deletions?*", (route) =>
    fail
      ? route.fulfill({ status: 503, json: unavailable })
      : route.fulfill({
          json: {
            items: new URL(route.request().url()).searchParams.has("state")
              ? []
              : [deletionSummary],
            nextCursor: null,
          },
        }),
  );
  await page.goto("/admin/deletions");
  await expect(
    page.getByRole("link", { name: `Page ${operationsPage.id}`, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "State", exact: true })
    .selectOption("COMPLETED");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/state=COMPLETED/);
  await expect(
    page.getByRole("heading", { name: "No deletion jobs", exact: true }),
  ).toBeVisible();
  fail = true;
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry deletion list", exact: true }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Retry deletion list", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No deletion jobs", exact: true }),
  ).toBeVisible();
});
test("cleanup retry preserves its request and refreshes progress", async ({
  page,
}) => {
  let state = "NEEDS_ATTENTION";
  const attempts: unknown[] = [];
  await page.route(`**/api/v1/admin/deletions/${deletionJob.id}`, (route) =>
    route.fulfill({
      json: {
        ...deletionJob,
        state,
        version: 4,
        lastFailureCode: state === "NEEDS_ATTENTION" ? "DB_TIMEOUT" : null,
      },
    }),
  );
  await page.route(
    `**/api/v1/admin/deletions/${deletionJob.id}/retry`,
    (route) => {
      attempts.push(
        deletionRetryRequestSchema.parse(route.request().postDataJSON()),
      );
      if (attempts.length === 1)
        return route.fulfill({ status: 503, json: unavailable });
      state = "QUEUED";
      return route.fulfill({ status: 202, json: deletionSummary });
    },
  );
  await page.goto(jobPath);
  await page
    .getByRole("button", { name: "Retry cleanup", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Confirm retry", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Retry same request", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Retry same request", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await expect(
    page.getByRole("heading", { name: "Queued", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Deletion job", exact: true }),
  ).toBeFocused();
});

test("detail polling stops at completion and clears data when access is lost", async ({
  page,
}) => {
  let reads = 0;
  let accessLost = false;
  await page.route(`**/api/v1/admin/deletions/${deletionJob.id}`, (route) => {
    reads++;
    if (accessLost)
      return route.fulfill({
        status: 403,
        json: { ...unavailable, statusCode: 403, code: "FORBIDDEN" },
      });
    const done = reads > 1;
    return route.fulfill({
      json: {
        ...deletionJob,
        state: done ? "COMPLETED" : "QUEUED",
        completedAt: done ? deletionJob.requestedAt : null,
        pagesCompleted: done ? deletionJob.pagesTotal : 0,
      },
    });
  });
  await page.clock.install();
  await page.goto(jobPath);
  await expect(
    page.getByRole("heading", { name: "Queued", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(
    page.getByRole("heading", { name: "Completed", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(15_000);
  expect(reads).toBe(2);
  accessLost = true;
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Administrator access required",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(operationsPage.id, { exact: false })).toHaveCount(
    0,
  );
});
test("list and detail reflow accessibly and missing targets link only retained jobs", async ({
  page,
}, info) => {
  for (const path of ["/admin/deletions", jobPath]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(
        path === jobPath ? "deletion-detail.png" : "deletion-list.png",
      ),
      fullPage: true,
    });
  }
  await page.route(`**/api/v1/admin/pages/${operationsPage.id}`, (route) =>
    route.fulfill({
      status: 404,
      json: { ...unavailable, statusCode: 404, code: "NOT_FOUND" },
    }),
  );
  await page.goto(pagePath);
  await expect(
    page.getByRole("heading", { name: "Record unavailable", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "View retained deletion progress",
      exact: true,
    }),
  ).toHaveAttribute("href", jobPath);
});
