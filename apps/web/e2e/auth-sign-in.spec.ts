import { expect, test } from "@playwright/test";

for (const mode of ["sign-in", "sign-up"] as const) {
  test(`${mode} fits portrait, landscape, and narrow screens with OAuth only entry points`, async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({ json: null }),
    );
    for (const error of [false, true]) {
      await page.goto(
        `/${mode}?returnTo=%2Ftemplates${error ? "&error=oauth" : ""}`,
      );
      await expect(
        page.getByRole("button", { name: "Continue with Google" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continue with Facebook" }),
      ).toBeVisible();
      await expect(page.getByText(/email and password/i)).toHaveCount(0);
      await expect(page.locator("input")).toHaveCount(0);
      for (const [width, height] of [
        [320, 480],
        [320, 568],
        [390, 844],
        [768, 1024],
        [1024, 768],
        [1440, 900],
        [844, 390],
        [568, 320],
        [480, 320],
        [320, 320],
        [256, 720],
      ] as const) {
        await page.setViewportSize({ width, height });
        await expect
          .poll(() =>
            page.evaluate(() => ({
              width: document.documentElement.scrollWidth,
              height: document.documentElement.scrollHeight,
            })),
          )
          .toEqual({ width, height });
        for (const control of await page
          .locator("main button:visible, main a:visible, footer a:visible")
          .all()) {
          const box = await control.boundingBox();
          expect(box).not.toBeNull();
          // Browser geometry can round integer CSS sizes by a tiny fraction.
          expect(box!.height + 0.001).toBeGreaterThanOrEqual(44);
          expect(box!.y + 0.001).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height).toBeLessThanOrEqual(height + 0.001);
        }
      }
    }
  });

  test(`${mode} preserves social callbacks, retry, keyboard access, and the return path`, async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", (route) =>
      route.fulfill({ json: null }),
    );
    let requestBody: Record<string, unknown> | null = null;
    await page.route("**/api/auth/sign-in/social", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 503,
        json: { message: "Provider unavailable" },
      });
    });
    await page.goto(`/${mode}?returnTo=%2Fdashboard%2Fpages`);
    const google = page.getByRole("button", { name: "Continue with Google" });
    await expect(google).toBeVisible();
    await page
      .getByRole("link", { name: "Letterly home", exact: true })
      .focus();
    await page.keyboard.press("Tab");
    await expect(google).toBeFocused();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => requestBody)
      .toMatchObject({
        provider: "google",
        callbackURL: "/dashboard/pages",
        errorCallbackURL: "/sign-in?returnTo=%2Fdashboard%2Fpages",
      });
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "We could not start Google sign in" }),
    ).toBeVisible();
    await expect(google).toBeEnabled();
    const facebook = page.getByRole("button", {
      name: "Continue with Facebook",
    });
    await facebook.click();
    await expect
      .poll(() => requestBody)
      .toMatchObject({ provider: "facebook", callbackURL: "/dashboard/pages" });
    await expect(facebook).toBeEnabled();
    const switchLink = page.getByRole("link", {
      name: mode === "sign-in" ? "Create an account" : "Sign in",
      exact: true,
    });
    await expect(switchLink).toHaveAttribute(
      "href",
      `${mode === "sign-in" ? "/sign-up" : "/sign-in"}?returnTo=%2Fdashboard%2Fpages`,
    );
    await page.getByRole("link", { name: "Privacy", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Privacy Policy" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("link", { name: "Privacy", exact: true }),
    ).toBeFocused();
  });
}

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

  test("defaults a normal OAuth sign in to Templates", async ({ page }) => {
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
        callbackURL: "/templates",
        errorCallbackURL: "/sign-in?returnTo=%2Ftemplates",
      });
  });

  test("keeps the Facebook OAuth request on the existing callback path", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/sign-in/social", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.abort();
    });

    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Continue with Facebook" }).click();

    await expect
      .poll(() => requestBody)
      .toMatchObject({
        provider: "facebook",
        callbackURL: "/templates",
        errorCallbackURL: "/sign-in?returnTo=%2Ftemplates",
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

    await expect(page).toHaveURL(/\/templates$/u);
    await expect(
      page.getByRole("heading", { name: "Browse templates", exact: true }),
    ).toBeAttached();
  });

  test("logs out from the workspace sidebar", async ({ page }) => {
    let signOutMethod: string | null = null;
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
      signOutMethod = route.request().method();
      await route.fulfill({ status: 200, json: {} });
    });

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/templates$/u);
    const menu = page.getByRole("button", { name: "Menu", exact: true });
    if ((page.viewportSize()?.width ?? 1440) < 1024) await menu.click();
    const dashboardNavigation = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .filter({ visible: true });
    await expect(
      dashboardNavigation.getByRole("link", { name: "Pages" }),
    ).toBeVisible();
    await expect(
      dashboardNavigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
    await expect(dashboardNavigation.getByRole("link").first()).toHaveText(
      "Home",
    );

    await page
      .getByRole("button", { name: "Open account menu", exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
    await expect.poll(() => signOutMethod).toBe("POST");
    await expect(page).toHaveURL(/\/$/u);
  });
});
