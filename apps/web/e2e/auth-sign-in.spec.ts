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

  test("defaults a normal OAuth sign in to the dashboard", async ({ page }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/sign-in/social", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.abort();
    });

    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Continue with Google" }).click();

    await expect
      .poll(() => requestBody)
      .toMatchObject({
        callbackURL: "/dashboard",
        errorCallbackURL: "/sign-in?returnTo=%2Fdashboard",
      });
  });
});
