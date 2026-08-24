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
    ).toContainText("We could not complete sign in. Please try again.");
  });

  test("defaults a normal OAuth sign in to the Home workspace", async ({
    page,
  }) => {
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
        callbackURL: "/dashboard/home",
        errorCallbackURL: "/sign-in?returnTo=%2Fdashboard%2Fhome",
      });
  });

  test("redirects an already signed in user away from sign in", async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "signed-in-session",
            userId: "signed-in-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "signed-in-user",
            name: "Signed In User",
            email: "signed-in@example.com",
            emailVerified: true,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        },
      });
    });
    await page.route("**/api/v1/pages**", async (route) => {
      await route.fulfill({
        status: 200,
        json: { items: [], nextCursor: null },
      });
    });

    await page.goto("/sign-in");

    await expect(page).toHaveURL(/\/dashboard\/home$/u);
    await expect(
      page.getByRole("heading", { name: "Good to see you, Signed." }),
    ).toBeVisible();
  });

  test("logs out from the dashboard header", async ({ page }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "dashboard-session",
            userId: "dashboard-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "dashboard-user",
            name: "Dashboard User",
            email: "dashboard@example.com",
            emailVerified: true,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
        },
      });
    });
    await page.route("**/api/v1/pages**", async (route) => {
      await route.fulfill({
        status: 200,
        json: { items: [], nextCursor: null },
      });
    });
    await page.route("**/api/auth/sign-out", async (route) => {
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "My letters" }),
    ).toBeVisible();
    const dashboardNavigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(
      dashboardNavigation.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("href", "/dashboard/home");
    await expect(
      dashboardNavigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/$/u);
  });
});
