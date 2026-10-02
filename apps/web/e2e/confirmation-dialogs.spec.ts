import { expect, test, type Page } from "@playwright/test";

const pageId = "11111111-1111-4111-8111-111111111111";
const responseId = "44444444-4444-4444-8444-444444444444";
const date = "2026-10-01T00:00:00.000Z";

async function mockWorkspace(page: Page) {
  const state = {
    passwordRequests: 0,
    unpublishRequests: 0,
    responseDeletes: 0,
    responseDeleted: false,
  };
  const owner = {
    id: pageId,
    slug: "modal-test",
    canonicalUrl: "http://localhost:3000/p/modal-test",
    passwordProtected: true,
    recipientLabel: "Maria",
    status: "PUBLISHED",
    contentVersion: 1,
    content: {
      title: "For Maria",
      recipientName: "Maria",
      mainMessage: "A saved letter.",
      sections: [],
    },
    settings: {
      theme: "romantic",
      fontStyle: "handwritten",
      autoPlayMusic: false,
      music: null,
      responsesEnabled: false,
    },
    template: {
      id: "33333333-3333-4333-8333-333333333333",
      key: "secret-letter",
      name: "Secret Letter",
      templateVersionId: "22222222-2222-4222-8222-222222222222",
      version: 1,
      registryKey: "confession.secret-letter",
    },
    createdAt: date,
    updatedAt: date,
    images: [],
  };
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "modal-session",
          userId: "modal-creator",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        user: {
          id: "modal-creator",
          name: "Modal Creator",
          email: "modal@example.com",
          emailVerified: true,
          createdAt: date,
          updatedAt: date,
        },
      },
    }),
  );
  await page.route("**/api/v1/pages**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/password")) {
      state.passwordRequests++;
      expect(request.postDataJSON()).toEqual({ password: null });
      owner.passwordProtected = false;
      await route.fulfill({ json: { passwordProtected: false } });
    } else if (path.endsWith("/unpublish")) {
      state.unpublishRequests++;
      expect(request.postDataJSON()).toEqual({ confirm: true });
      owner.status = "UNPUBLISHED";
      await route.fulfill({
        json: {
          pageId,
          status: "UNPUBLISHED",
          slug: owner.slug,
          publicUrl: owner.canonicalUrl,
          publishedAt: null,
          unpublishedAt: date,
          contentVersion: 2,
          updatedAt: date,
        },
      });
    } else if (path.endsWith(`/submissions/${responseId}`)) {
      if (request.method() === "DELETE") {
        state.responseDeletes++;
        expect(request.postDataJSON()).toEqual({ confirm: true });
        state.responseDeleted = true;
        await route.fulfill({ json: { deleted: true } });
      } else {
        await route.fulfill({
          json: {
            id: responseId,
            pageId,
            readState: "READ",
            submittedAt: date,
            answers: [],
            visitorMessage: {
              promptSnapshot: "Private message",
              message: "A private note.",
            },
          },
        });
      }
    } else if (path.endsWith("/submissions")) {
      await route.fulfill({
        json: {
          items: state.responseDeleted
            ? []
            : [
                {
                  id: responseId,
                  readState: "READ",
                  submittedAt: date,
                  answerCount: 0,
                  hasVisitorMessage: true,
                },
              ],
          unreadCount: 0,
          nextCursor: null,
        },
      });
    } else if (path.endsWith("/questions")) {
      await route.fulfill({ json: [] });
    } else if (path === `/api/v1/pages/${pageId}`) {
      await route.fulfill({ json: owner });
    } else if (path === "/api/v1/pages") {
      await route.fulfill({ json: { items: [], nextCursor: null } });
    } else {
      await route.fulfill({
        status: 503,
        json: {
          code: "SERVICE_UNAVAILABLE",
          message: "Unavailable in this test.",
          requestId: "modal-test",
        },
      });
    }
  });
  page.on("dialog", () => {
    throw new Error("Unexpected native browser dialog");
  });
  return state;
}

test("letter deletion confirms, restores focus, fits every screen, and retries without duplicate requests", async ({
  page,
}) => {
  await mockWorkspace(page);
  let deletes = 0;
  let finishDelete: (() => void) | undefined;
  await page.route(`**/api/v1/pages/${pageId}`, async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    deletes++;
    if (deletes === 1) {
      await route.fulfill({
        status: 503,
        json: {
          statusCode: 503,
          code: "SERVICE_UNAVAILABLE",
          message: "Could not delete. Please try again.",
          requestId: "55555555-5555-4555-8555-555555555555",
        },
      });
    } else {
      await new Promise<void>((resolve) => {
        finishDelete = resolve;
      });
      await route.fulfill({ status: 204 });
    }
  });
  await page.goto(`/dashboard/pages/${pageId}/edit?section=settings`);
  const trigger = page.getByRole("button", {
    name: "Delete permanently",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("alertdialog", {
    name: "Delete this letter permanently?",
  });
  const cancel = dialog.getByRole("button", { name: "Keep letter" });
  await expect(cancel).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(700);
    for (const button of await dialog.getByRole("button").all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    if (width === 320 || width === 1440) {
      await dialog.screenshot({
        path: test.info().outputPath(`confirmation-${width}.png`),
      });
    }
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(deletes).toBe(0);
  await trigger.click();
  await cancel.click();
  expect(deletes).toBe(0);
  await trigger.click();
  await dialog
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("Could not delete");
  await dialog
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Deleting...", exact: true }),
  ).toBeDisabled();
  await expect(cancel).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect.poll(() => deletes).toBe(2);
  finishDelete!();
  await expect(page).toHaveURL(/\/dashboard\/pages$/u);
  expect(deletes).toBe(2);
});

test("unsaved edits remain on cancellation and leave only after confirmation", async ({
  page,
}) => {
  await mockWorkspace(page);
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  const message = page.getByLabel("Your message (required)", { exact: true });
  await message.fill("Unsaved new words.");
  const back = page.getByRole("link", { name: "Back", exact: true });
  await back.click();
  const dialog = page.getByRole("alertdialog", {
    name: "Leave with unsaved changes?",
  });
  await expect(
    dialog.getByRole("button", { name: "Keep editing" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(message).toHaveValue("Unsaved new words.");
  await expect(back).toBeFocused();
  await back.click();
  await dialog.getByRole("button", { name: "Leave page" }).click();
  await expect(page).toHaveURL(/\/dashboard\/pages$/u);
});

test("password removal and Settings unpublishing require deliberate confirmation", async ({
  page,
}) => {
  const state = await mockWorkspace(page);
  await page.goto(`/dashboard/pages/${pageId}/edit?section=settings`);
  const remove = page.getByRole("button", {
    name: "Remove password",
    exact: true,
  });
  await remove.click();
  const passwordDialog = page.getByRole("alertdialog", {
    name: "Remove the password?",
  });
  await passwordDialog.getByRole("button", { name: "Keep password" }).click();
  await expect(remove).toBeFocused();
  expect(state.passwordRequests).toBe(0);
  await remove.click();
  await passwordDialog.getByRole("button", { name: "Remove password" }).click();
  await expect(passwordDialog).toBeHidden();
  expect(state.passwordRequests).toBe(1);
  const unpublish = page.getByRole("button", {
    name: "Unpublish",
    exact: true,
  });
  await unpublish.click();
  const dialog = page.getByRole("alertdialog", {
    name: "Unpublish this letter?",
  });
  await dialog.getByRole("button", { name: "Keep published" }).click();
  expect(state.unpublishRequests).toBe(0);
  await unpublish.click();
  await dialog.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.unpublishRequests).toBe(1);
});

test("Overview unpublishing uses the shared confirmation", async ({ page }) => {
  const state = await mockWorkspace(page);
  await page.goto(`/dashboard/pages/${pageId}/edit?section=overview`);
  const unpublish = page.getByRole("button", {
    name: "Unpublish",
    exact: true,
  });
  await unpublish.click();
  const dialog = page.getByRole("alertdialog", {
    name: "Unpublish this letter?",
  });
  await expect(
    dialog.getByRole("button", { name: "Keep published" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(unpublish).toBeFocused();
  expect(state.unpublishRequests).toBe(0);
  await unpublish.click();
  await dialog.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(state.unpublishRequests).toBe(1);
});

test("response deletion opens above the response modal and cancellation restores it", async ({
  page,
}) => {
  const state = await mockWorkspace(page);
  await page.goto(
    `/dashboard/pages/${pageId}/responses?selected=${responseId}`,
  );
  const response = page.getByRole("dialog");
  await expect(response.getByText("A private note.")).toBeVisible();
  const trigger = response.getByRole("button", { name: "Delete response" });
  await trigger.click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Delete this response permanently?",
  });
  await expect(
    confirmation.getByRole("button", { name: "Keep response" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toBeHidden();
  await expect(response).toBeVisible();
  await expect(trigger).toBeFocused();
  expect(state.responseDeletes).toBe(0);
  await trigger.click();
  await confirmation.getByRole("button", { name: "Delete response" }).click();
  await expect(confirmation).toBeHidden();
  await expect(response).toBeHidden();
  expect(state.responseDeletes).toBe(1);
  await expect(
    page.getByRole("status").filter({ hasText: "Response deleted." }),
  ).toBeVisible();
});
