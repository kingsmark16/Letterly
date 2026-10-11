import { expect, test } from "@playwright/test";
import { ownerPage, pageId } from "./fixtures/owner-page";
import { installOwnerEditorRoutes } from "./support/owner-editor";

test.beforeEach(async ({ page }) => {
  await installOwnerEditorRoutes(page);
});

test("owner error recovery uses the canonical button and opens saved content after retry", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let allowRead = false;
  await page.route(`**/api/v1/pages/${pageId}`, (route) =>
    allowRead
      ? route.fulfill({
          status: 200,
          json: ownerPage(
            1,
            "Avery",
            "A message worth keeping.",
            "2026-08-20T00:05:00.000Z",
          ),
        })
      : route.fulfill({
          status: 503,
          json: {
            statusCode: 503,
            code: "SERVICE_UNAVAILABLE",
            message:
              "The saved letter is temporarily unavailable. Please try again.",
            requestId: "44444444-4444-4444-8444-444444444444",
          },
        }),
  );
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "We could not open this letter." });
  await expect(alert).toContainText(
    "The saved letter is temporarily unavailable.",
  );
  await expect(alert).toContainText("44444444-4444-4444-8444-444444444444");
  const retry = alert.getByRole("button", { name: "Try again", exact: true });
  await expect(retry).toHaveAttribute("data-variant", "primary");
  await expect(retry).toHaveCSS("background-color", "rgb(139, 41, 70)");
  await expect(retry).toHaveCSS("color", "rgb(255, 253, 253)");
  await expect(retry).toHaveCSS("padding", "12px 24px");
  await expect(retry).toHaveCSS("border-radius", "12px");
  expect((await retry.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Tab");
  await retry.focus();
  await expect(retry).toHaveCSS("outline-style", "solid");
  await expect(retry).toHaveCSS("outline-width", "2px");
  allowRead = true;
  await retry.press("Enter");
  await expect(alert).toHaveCount(0);
  await expect(page.getByLabel("Your message")).toHaveValue(
    "A message worth keeping.",
  );
  await expect(page.getByLabel("To (required)")).toHaveValue("Avery");
  expect(errors).toEqual([]);
});

for (const status of ["DRAFT", "PUBLISHED"] as const) {
  test(`${status} review controls preserve compact geometry and checklist navigation`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(`**/api/v1/pages/${pageId}`, (route) =>
      route.fulfill({
        status: 200,
        json: {
          ...ownerPage(
            1,
            "Avery",
            "A message worth keeping.",
            "2026-08-20T00:05:00.000Z",
          ),
          status,
          canonicalUrl:
            status === "PUBLISHED"
              ? "http://127.0.0.1:3100/p/draft-test"
              : null,
        },
      }),
    );
    await page.goto(`/dashboard/pages/${pageId}/edit?section=overview`);
    const review = page.getByRole("region", {
      name: "Review and share",
      exact: true,
    });
    const card = review.locator('section[data-slot="card"]');
    await expect(card).toBeVisible();
    for (const [width, height, paddingBlock, paddingInline] of [
      [320, 640, 8, 8],
      [639, 900, 8, 8],
      [640, 900, 12, 12],
      [1023, 900, 12, 12],
      [1024, 900, 16, 16],
      [1151, 900, 16, 16],
      [1152, 639, 16, 16],
      [1152, 640, 6, 16],
      [1440, 900, 6, 16],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(card).toHaveCSS("padding-top", `${paddingBlock}px`);
      await expect(card).toHaveCSS("padding-bottom", `${paddingBlock}px`);
      await expect(card).toHaveCSS("padding-left", `${paddingInline}px`);
      await expect(card).toHaveCSS("border-radius", "16px");
      await expect(card).toHaveCSS("border-top-width", "0px");
      await expect(card).toHaveCSS("flex", "1 1 auto");
      await expect(card).toHaveCSS("align-self", "stretch");
      const edit = review.getByRole("button", {
        name: "Edit letter",
        exact: true,
      });
      await expect(edit).toHaveCSS("min-height", "44px");
      expect((await edit.boundingBox())?.height).toBeCloseTo(44, 2);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await review
      .getByRole("button", { name: "Edit letter", exact: true })
      .click();
    await expect(page).toHaveURL(/section=content/u);
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message worth keeping.",
    );
    expect(errors).toEqual([]);
  });
}
