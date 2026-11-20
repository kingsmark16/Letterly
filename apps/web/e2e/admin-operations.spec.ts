import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  adminCreatorSearchSchema,
  adminPageListResponseSchema,
} from "@letterly/contracts/admin-operations";
import {
  adminPageDisableRequestSchema,
  adminAppealCreateRequestSchema,
} from "@letterly/contracts/moderation";
import {
  operationsCreator,
  operationsCreators,
  operationsPage,
  operationsAppeal,
} from "./fixtures/admin-operations";

test("email search accepts the padded boundary and keeps identity out of URLs and storage", async ({
  page,
}) => {
  const email = `a@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(63)}.${"e".repeat(56)}.com`;
  const seen: string[] = [];
  page.on("request", (request) => seen.push(request.url()));
  let calls = 0;
  await page.route("**/api/v1/admin/creators/search", (route) => {
    const body = adminCreatorSearchSchema.parse(route.request().postDataJSON());
    expect(body).toMatchObject({ field: "email", value: email });
    calls += 1;
    return route.fulfill({
      json: { items: [{ ...operationsCreator, email }], nextCursor: null },
    });
  });
  await page.goto("/admin/creators");
  await page
    .getByRole("combobox", { name: "Search by", exact: true })
    .selectOption("email");
  const input = page.getByLabel("Email address", { exact: true });
  await input.fill(`  ${email.toUpperCase()}  `);
  await expect(input).toHaveValue(`  ${email.toUpperCase()}  `);
  await page
    .getByRole("button", { name: "Search creators", exact: true })
    .click();
  await expect(
    page.getByText(email, { exact: false }).filter({ visible: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  expect(
    seen.some(
      (url) => url.includes(email) || url.includes(encodeURIComponent(email)),
    ),
  ).toBe(false);
  const storage = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(storage).not.toContain(email);
  await input.fill(`a${email}`);
  await page
    .getByRole("button", { name: "Search creators", exact: true })
    .click();
  await expect(
    page.getByText(
      "Enter a conventional email address of up to 254 characters after trimming.",
    ),
  ).toBeVisible();
  expect(calls).toBe(1);
});

test("search cursors stay in memory and reset when a new search is submitted", async ({
  page,
}) => {
  const cursors: Array<string | undefined> = [];
  await page.route("**/api/v1/admin/creators/search", (route) => {
    const body = adminCreatorSearchSchema.parse(route.request().postDataJSON());
    cursors.push(body.cursor);
    return route.fulfill({
      json: {
        ...operationsCreators,
        nextCursor: cursors.length === 1 ? "fixture-search-cursor" : null,
      },
    });
  });
  await page.goto("/admin/creators");
  await page
    .getByLabel("Search value", { exact: true })
    .fill(operationsCreator.id);
  await page
    .getByRole("button", { name: "Search creators", exact: true })
    .click();
  await page.getByRole("button", { name: "Next results", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "First results", exact: true }),
  ).toBeVisible();
  expect(page.url()).not.toContain("cursor");
  await page
    .getByLabel("Search value", { exact: true })
    .fill("another-creator");
  await page
    .getByRole("button", { name: "Search creators", exact: true })
    .click();
  await expect.poll(() => cursors.length).toBe(3);
  expect(cursors).toEqual([undefined, "fixture-search-cursor", undefined]);
});

test("page filters are resumable and invalid dates have a visible recovery state", async ({
  page,
}) => {
  await page.goto("/admin/pages");
  await page
    .getByRole("combobox", { name: "Publication state", exact: true })
    .selectOption("PUBLISHED");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await page
    .getByLabel("Created from (UTC instant)", { exact: true })
    .fill("not-a-date");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Record filters" }).getByRole("alert"),
  ).toContainText("Check the filters");
  expect(page.url()).not.toContain("not-a-date");
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
});

test("page moderation freezes an uncertain request, safely retries, and restores focus", async ({
  page,
}) => {
  let disabled = false;
  const attempts: unknown[] = [];
  await page.route(`**/api/v1/admin/pages/${operationsPage.id}`, (route) =>
    route.fulfill({
      json: {
        ...operationsPage,
        moderationStatus: disabled ? "DISABLED" : "ACTIVE",
        moderationVersion: disabled ? 1 : 0,
      },
    }),
  );
  await page.route(
    `**/api/v1/admin/pages/${operationsPage.id}/disable`,
    (route) => {
      attempts.push(
        adminPageDisableRequestSchema.parse(route.request().postDataJSON()),
      );
      if (attempts.length === 1)
        return route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "Unavailable",
            requestId: "54000000-0000-4000-8000-000000000001",
          },
        });
      disabled = true;
      return route.fulfill({
        json: {
          actionId: "57000000-0000-4000-8000-000000000002",
          targetType: "PAGE",
          targetId: operationsPage.id,
          moderationStatus: "DISABLED",
          moderationVersion: 1,
          replayed: true,
        },
      });
    },
  );
  await page.goto(`/admin/pages/${operationsPage.id}`);
  const trigger = page.getByRole("button", {
    name: "Disable page",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Disable page" });
  await dialog
    .getByRole("combobox", { name: "Reason", exact: true })
    .selectOption("SPAM");
  await dialog
    .getByLabel("Internal note", { exact: false })
    .fill("Reviewed safe metadata");
  await dialog
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText(
    "retry the same request",
  );
  await expect(
    dialog.getByLabel("Internal note", { exact: false }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Retry action", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await expect(
    page.getByRole("button", { name: "Restore page", exact: true }),
  ).toBeFocused();
});

test("stale page actions refresh the record and require a new confirmation", async ({
  page,
}) => {
  let stale = false;
  await page.route(`**/api/v1/admin/pages/${operationsPage.id}`, (route) =>
    route.fulfill({
      json: { ...operationsPage, moderationVersion: stale ? 2 : 0 },
    }),
  );
  await page.route(
    `**/api/v1/admin/pages/${operationsPage.id}/disable`,
    (route) => {
      stale = true;
      return route.fulfill({
        status: 409,
        json: {
          statusCode: 409,
          code: "STALE_MODERATION_VERSION",
          message: "State changed",
          requestId: "54000000-0000-4000-8000-000000000001",
        },
      });
    },
  );
  await page.goto(`/admin/pages/${operationsPage.id}`);
  await page.getByRole("button", { name: "Disable page", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("record changed");
  await page.getByRole("button", { name: "Disable page", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm action", exact: true }),
  ).toBeVisible();
});

test("appeal inbox filters targets, links safe details, and resolves with focus recovery", async ({
  page,
}) => {
  let resolved = false;
  await page.route(`**/api/v1/admin/appeals/${operationsAppeal.id}`, (route) =>
    route.fulfill({
      json: {
        ...operationsAppeal,
        status: resolved ? "ACCEPTED" : "REQUESTED",
        moderationVersion: resolved ? 1 : 0,
        resolutionNote: resolved ? "Reviewed appeal" : null,
      },
    }),
  );
  await page.route(
    `**/api/v1/admin/appeals/${operationsAppeal.id}/accept`,
    (route) => {
      resolved = true;
      return route.fulfill({
        json: {
          appealId: operationsAppeal.id,
          targetType: "APPEAL",
          targetId: operationsAppeal.id,
          status: "ACCEPTED",
          moderationVersion: 1,
          actionId: operationsAppeal.originalActionId,
          replayed: false,
        },
      });
    },
  );
  await page.goto(
    `/admin/moderation/appeals?targetType=PAGE&targetId=${operationsPage.id}`,
  );
  await expect(
    page.getByRole("combobox", { name: "Target type", exact: true }),
  ).toHaveValue("PAGE");
  await page
    .getByRole("link", { name: operationsAppeal.id, exact: true })
    .click();
  await expect(page.getByText("SUPPORT-42", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View target audit history", exact: true }),
  ).toHaveAttribute(
    "href",
    `/admin/moderation/audit?targetType=PAGE&targetId=${operationsPage.id}`,
  );
  await page
    .getByRole("button", { name: "Accept appeal", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Internal note", { exact: false })
    .fill("Reviewed appeal");
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Appeal decision", exact: true }),
  ).toBeFocused();
});

test("support intake reuses its exact body after an uncertain failure", async ({
  page,
}) => {
  const bodies: unknown[] = [];
  await page.route("**/api/v1/admin/appeals", (route) => {
    if (route.request().method() === "GET") return route.continue();
    bodies.push(
      adminAppealCreateRequestSchema.parse(route.request().postDataJSON()),
    );
    return bodies.length === 1
      ? route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "Unavailable",
            requestId: "54000000-0000-4000-8000-000000000001",
          },
        })
      : route.fulfill({
          json: {
            appealId: operationsAppeal.id,
            targetType: "APPEAL",
            targetId: operationsAppeal.id,
            status: "REQUESTED",
            moderationVersion: 0,
            actionId: operationsAppeal.originalActionId,
            replayed: true,
          },
        });
  });
  await page.goto("/admin/moderation/appeals");
  await page
    .getByLabel("Original action ID", { exact: true })
    .fill(operationsAppeal.originalActionId);
  await page
    .getByLabel("Support reference", { exact: true })
    .fill("SUPPORT-42");
  await page
    .getByRole("button", { name: "Record appeal intake", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry intake", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry intake", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open recorded appeal", exact: true }),
  ).toBeVisible();
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
});

test("new directories are accessible and reflow without duplicated active controls", async ({
  page,
}, testInfo) => {
  for (const path of [
    "/admin/creators",
    "/admin/pages",
    "/admin/moderation/appeals",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: path.endsWith("creators")
          ? operationsCreator.name
          : path.endsWith("pages")
            ? operationsPage.slug
            : operationsAppeal.id,
        exact: true,
      }),
    ).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${path.split("/").at(-1)}.png`),
      fullPage: true,
    });
  }
});

test("page list validates transport projection and preserves empty/error recovery", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/v1/admin/pages?**", (route) =>
    route.fulfill(
      fail
        ? {
            status: 503,
            json: {
              statusCode: 503,
              code: "SERVICE_UNAVAILABLE",
              message: "Unavailable",
              requestId: "54000000-0000-4000-8000-000000000001",
            },
          }
        : {
            json: adminPageListResponseSchema.parse({
              items: [],
              nextCursor: null,
            }),
          },
    ),
  );
  await page.goto("/admin/pages");
  await expect(
    page.getByRole("heading", { name: "Could not load pages", exact: true }),
  ).toBeVisible();
  fail = false;
  await page
    .getByRole("button", { name: "Retry results", exact: true })
    .click();
  await expect(page.getByText("No pages match these filters.")).toBeVisible();
});
