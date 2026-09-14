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

  test("defaults a normal OAuth sign in to the Overview workspace", async ({
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
        callbackURL: "/dashboard",
        errorCallbackURL: "/sign-in?returnTo=%2Fdashboard",
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
        callbackURL: "/dashboard/home",
        errorCallbackURL: "/sign-in?returnTo=%2Fdashboard%2Fhome",
      });
  });

  test("exposes forgot-password and verification resend actions in the existing sign-in design", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await expect(
      page.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
    await expect(
      page.getByRole("link", { name: "Resend verification email" }),
    ).toHaveAttribute("href", "/forgot-password?mode=verification");
  });

  test("signs in with a valid email and password and preserves the return path", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({ status: 200, json: null });
    });
    await page.route("**/api/auth/sign-in/email", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: {
          token: "session-token",
          user: {
            id: "email-user",
            name: "Email User",
            email: "creator@example.com",
          },
        },
      });
    });

    await page.goto("/sign-in?returnTo=%2F");
    await page.getByLabel("Email address").fill("  CREATOR@Example.COM ");
    await page
      .getByLabel("Password", { exact: true })
      .fill("a secure passphrase");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect
      .poll(() => requestBody)
      .toMatchObject({
        email: "creator@example.com",
        password: "a secure passphrase",
      });
    await expect(page).toHaveURL(/\/$/u);
  });

  test("shows a safe message when email sign in is rejected", async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({ status: 200, json: null });
    });
    await page.route("**/api/auth/sign-in/email", async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password",
        },
      });
    });

    await page.goto("/sign-in?returnTo=%2F");
    await page.getByLabel("Email address").fill("creator@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("a secure passphrase");
    await page.getByRole("button", { name: "Sign in" }).click();

    const alert = page.getByRole("alert").filter({
      hasText: "We could not sign you in.",
    });
    await expect(alert).toContainText(
      "We could not sign you in. Check your email and password and try again.",
    );
    await expect(alert).not.toContainText("Invalid email or password");
  });

  test("blocks invalid email credentials before making a request", async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({ status: 200, json: null });
    });
    await page.route("**/api/auth/sign-in/email", async (route) => {
      requestCount += 1;
      await route.abort();
    });

    await page.goto("/sign-in?returnTo=%2F");
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Enter a valid email address" }),
    ).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "Use at least 6 characters" }),
    ).toBeVisible();
    expect(requestCount).toBe(0);
  });

  test("creates an account with a valid email and password", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({ status: 200, json: null });
    });
    await page.route("**/api/auth/sign-up/email", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: {
          token: null,
          user: {
            id: "new-user",
            name: "Letterly Creator",
            email: "creator@example.com",
          },
        },
      });
    });

    await page.goto("/sign-up?returnTo=%2Fdashboard%2Fhome");
    await page.getByLabel("Your name").fill("  Letterly Creator  ");
    await page.getByLabel("Email address").fill("  CREATOR@Example.COM ");
    await page
      .getByLabel("Password", { exact: true })
      .fill("a secure passphrase");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "type",
      "text",
    );
    await page.getByRole("button", { name: "Hide password" }).click();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Check your email to continue.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Continue to sign in" }),
    ).toHaveAttribute("href", "/sign-in?returnTo=%2Fdashboard%2Fhome");
    await expect
      .poll(() => requestBody)
      .toMatchObject({
        name: "Letterly Creator",
        email: "creator@example.com",
        password: "a secure passphrase",
      });
  });

  test("shows a safe rate-limit message after too many email sign-in attempts", async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({ status: 200, json: null });
    });
    await page.route("**/api/auth/sign-in/email", async (route) => {
      await route.fulfill({
        status: 429,
        json: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        },
      });
    });

    await page.goto("/sign-in?returnTo=%2F");
    await page.getByLabel("Email address").fill("creator@example.com");
    await page
      .getByLabel("Password", { exact: true })
      .fill("a secure passphrase");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText: "Too many attempts. Please try again later.",
      }),
    ).toContainText("Too many attempts. Please try again later.");
  });

  test("shows the generic completion state after requesting a password reset", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/request-password-reset", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: { status: true },
      });
    });

    await page.goto("/forgot-password");
    await expect(
      page.getByRole("heading", { name: "Request a password reset" }),
    ).toBeVisible();
    await page.getByLabel("Email address").fill("  CREATOR@Example.COM ");
    await page.getByRole("button", { name: "Send reset email" }).click();

    await expect(page.getByRole("status")).toContainText("Check your inbox.");
    await expect(page.getByRole("status")).toContainText(
      "If an account matches that email, check your inbox for next steps.",
    );
    await expect
      .poll(() => requestBody)
      .toEqual({
        email: "creator@example.com",
      });
  });

  test("uses the same generic completion state for verification resend", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/send-verification-email", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: { status: true },
      });
    });

    await page.goto("/forgot-password?mode=verification");
    await expect(
      page.getByRole("heading", { name: "Resend your verification email" }),
    ).toBeVisible();
    await page.getByLabel("Email address").fill("creator@example.com");
    await page.getByRole("button", { name: "Send verification email" }).click();

    await expect(page.getByRole("status")).toContainText("Check your inbox.");
    await expect
      .poll(() => requestBody)
      .toEqual({
        email: "creator@example.com",
      });
  });

  test("removes reset tokens from the browser URL and blocks mismatched confirmation before submit", async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route("**/api/auth/reset-password", async (route) => {
      requestCount += 1;
      await route.fulfill({ status: 200, json: { status: true } });
    });

    const response = await page.goto("/reset-password?token=secret-token");
    await expect(page).toHaveURL(/\/reset-password$/u);
    await expect(response).not.toBeNull();
    const responseBody = await response?.text();
    expect(responseBody).not.toContain("secret-token");
    expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(response?.headers()["cache-control"]).toContain("no-store");
    await expect(
      page.getByRole("heading", { name: "Choose a new password" }),
    ).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill("secret1");
    await page.getByLabel("Confirm new password").fill("secret2");
    await page.getByRole("button", { name: "Save new password" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Passwords must match" }),
    ).toBeVisible();
    expect(requestCount).toBe(0);
    await expect(page.locator("body")).not.toContainText("secret-token");
  });

  test("submits a matching reset password while keeping the token out of rendered content", async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | null = null;

    await page.route("**/api/auth/reset-password", async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: { status: true },
      });
    });

    await page.goto("/reset-password?token=secret-token");
    await expect(page).toHaveURL(/\/reset-password$/u);
    await page
      .getByLabel("New password", { exact: true })
      .fill("secure-password");
    await page.getByLabel("Confirm new password").fill("secure-password");
    await page.getByRole("button", { name: "Save new password" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Your password has been reset.",
    );
    await expect(page.locator("body")).not.toContainText("secret-token");
    await expect
      .poll(() => requestBody)
      .toEqual({
        newPassword: "secure-password",
        token: "secret-token",
      });
  });

  test("renders a safe verification error without exposing the provider detail", async ({
    page,
  }) => {
    await page.goto(
      "/verify-email?error=provider_internal_error_and_sensitive_details",
    );

    await expect(
      page.getByRole("heading", { name: "This link is no longer valid." }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "provider_internal_error_and_sensitive_details",
    );
  });

  test("renders one safe reset error when the token is missing", async ({
    page,
  }) => {
    await page.goto("/reset-password");

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "This password reset link is invalid or expired." }),
    ).toContainText("This password reset link is invalid or expired.");
    await expect(
      page.getByRole("textbox", { name: "New password" }),
    ).toHaveCount(0);
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

    await expect(page).toHaveURL(/\/dashboard$/u);
    await expect(
      page.getByRole("heading", { name: "Good to see you, Signed." }),
    ).toBeVisible();
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
    const dashboardNavigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(
      dashboardNavigation.getByRole("link", { name: "My pages" }),
    ).toBeVisible();
    await expect(
      dashboardNavigation.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("href", "/dashboard");
    await expect(
      dashboardNavigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");

    await dashboardNavigation
      .getByRole("button", { name: "Sign out" })
      .click();
    await expect.poll(() => signOutMethod).toBe("POST");
    await expect(page).toHaveURL(/\/$/u);
  });
});
