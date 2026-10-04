import { expect, test, type Page } from "@playwright/test";
import {
  adminModerationActionResponseSchema,
  adminReportActionRequestSchema,
  adminReportDetailSchema,
  type AdminReportActionRequest,
} from "@letterly/contracts/moderation";
import {
  adminReportDetailFixture,
  adminReportId,
} from "./fixtures/admin-moderation";

async function openReview(page: Page) {
  await page.goto(`/admin/moderation/reports?report=${adminReportId}`);
  const trigger = page.getByRole("button", {
    name: "Mark reviewed",
    exact: true,
  });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Review report" });
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

test("confirmation freezes the exact payload during pending and retry, then restores focus", async ({
  page,
}) => {
  const attempts: AdminReportActionRequest[] = [];
  let release: (() => void) | undefined;
  await page.route(
    `**/api/v1/admin/reports/${adminReportId}/review`,
    async (route) => {
      attempts.push(
        adminReportActionRequestSchema.parse(route.request().postDataJSON()),
      );
      expect(route.request().headers()["x-csrf-token"]).toBe(
        "letterly-admin-action",
      );
      if (attempts.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        await route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message: "Fixture action is unavailable.",
            requestId: "54000000-0000-4000-8000-000000000001",
          },
        });
      } else {
        await route.fulfill({
          json: adminModerationActionResponseSchema.parse({
            actionId: "55000000-0000-4000-8000-000000000001",
            targetType: "REPORT",
            targetId: adminReportId,
            moderationVersion: 2,
            replayed: true,
          }),
        });
      }
    },
  );
  const { trigger, dialog } = await openReview(page);
  const reason = dialog.getByLabel("Reason");
  const note = dialog.getByLabel("Internal note", { exact: false });
  await reason.selectOption("OTHER");
  await note.fill("  Fixture moderation note.  ");
  await dialog.getByRole("button", { name: "Confirm action" }).click();
  await expect.poll(() => attempts.length).toBe(1);
  await expect(reason).toBeDisabled();
  await expect(note).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  if (!release) throw new Error("Missing pending fixture mutation");
  release();
  const retry = dialog.getByRole("button", { name: "Retry action" });
  await expect(retry).toBeEnabled();
  await expect(reason).toBeDisabled();
  await expect(note).toBeDisabled();
  await retry.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "Moderation action saved.",
  );
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  expect(attempts[0]).toMatchObject({
    confirm: true,
    expectedModerationVersion: 1,
    reason: "OTHER",
    note: "Fixture moderation note.",
  });
});

test("stale confirmation refreshes detail and requires a fresh version and key", async ({
  page,
}) => {
  let version = 1;
  const attempts: AdminReportActionRequest[] = [];
  await page.route(`**/api/v1/admin/reports/${adminReportId}`, (route) =>
    route.fulfill({
      json: { ...adminReportDetailFixture, moderationVersion: version },
    }),
  );
  await page.route(
    `**/api/v1/admin/reports/${adminReportId}/review`,
    (route) => {
      attempts.push(
        adminReportActionRequestSchema.parse(route.request().postDataJSON()),
      );
      if (attempts.length === 1) {
        version = 2;
        return route.fulfill({
          status: 409,
          json: {
            statusCode: 409,
            code: "STALE_MODERATION_VERSION",
            message: "Fixture moderation state changed.",
            requestId: "54000000-0000-4000-8000-000000000001",
          },
        });
      }
      return route.fulfill({
        json: adminModerationActionResponseSchema.parse({
          actionId: "55000000-0000-4000-8000-000000000002",
          targetType: "REPORT",
          targetId: adminReportId,
          moderationVersion: 3,
          replayed: false,
        }),
      });
    },
  );
  const { trigger, dialog } = await openReview(page);
  const refreshed = page.waitForResponse(
    async (response) =>
      response.url().endsWith(`/api/v1/admin/reports/${adminReportId}`) &&
      response.request().method() === "GET" &&
      adminReportDetailSchema.parse(await response.json()).moderationVersion ===
        2,
  );
  await dialog.getByRole("button", { name: "Confirm action" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("status")).toContainText(
    "This record changed while you were reviewing it.",
  );
  await refreshed;
  await trigger.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm action" }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts).toHaveLength(2);
  expect(attempts[0]?.expectedModerationVersion).toBe(1);
  expect(attempts[1]?.expectedModerationVersion).toBe(2);
  expect(attempts[1]?.idempotencyKey).not.toBe(attempts[0]?.idempotencyKey);
});

test("confirmation cancels with the keyboard and returns focus without a mutation", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/api/v1/admin/**", (route) => {
    if (route.request().method() === "POST") writes++;
    return route.continue();
  });
  const { trigger, dialog } = await openReview(page);
  const reason = dialog.getByLabel("Reason");
  await expect(reason).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Confirm action" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(reason).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(writes).toBe(0);
});

test("completed moderation returns focus to the heading when the refreshed trigger is disabled", async ({
  page,
}) => {
  let completed = false;
  await page.route(`**/api/v1/admin/reports/${adminReportId}`, (route) =>
    route.fulfill({
      json: {
        ...adminReportDetailFixture,
        status: completed ? "REVIEWED" : "OPEN",
        moderationVersion: completed ? 2 : 1,
      },
    }),
  );
  await page.route(
    `**/api/v1/admin/reports/${adminReportId}/review`,
    (route) => {
      completed = true;
      return route.fulfill({
        json: adminModerationActionResponseSchema.parse({
          actionId: "55000000-0000-4000-8000-000000000003",
          targetType: "REPORT",
          targetId: adminReportId,
          moderationVersion: 2,
          replayed: false,
        }),
      });
    },
  );
  const { trigger, dialog } = await openReview(page);
  await dialog.getByRole("button", { name: "Confirm action" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Report queue", exact: true }),
  ).toBeFocused();
});
