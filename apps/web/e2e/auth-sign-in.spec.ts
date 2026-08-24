import { expect, test } from "@playwright/test";

test.describe("sign in error handling", () => {
  test("shows a safe message for an OAuth callback error", async ({ page }) => {
    await page.goto(
      "/sign-in?error=oauth&returnTo=%2F&error=account_not_linked",
    );

    await expect(
      page.getByRole("alert").filter({
        hasText: "We could not complete sign in. Please try again.",
      }),
    ).toContainText(
      "We could not complete sign in. Please try again.",
    );
  });
});
