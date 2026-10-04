import { expect, test } from "@playwright/test";

for (const mode of ["password-reset", "verification"] as const) {
  test(`${mode} waits for hydration before accepting recovery input`, async ({
    page,
  }) => {
    let releaseScripts: () => void = () => undefined;
    const scriptsReady = new Promise<void>((resolve) => {
      releaseScripts = resolve;
    });
    await page.route("**/_next/static/**", async (route) => {
      if (new URL(route.request().url()).pathname.endsWith(".js"))
        await scriptsReady;
      await route.continue();
    });
    const endpoint =
      mode === "verification"
        ? "send-verification-email"
        : "request-password-reset";
    let submittedEmail: unknown;
    await page.route(`**/api/auth/${endpoint}`, async (route) => {
      submittedEmail = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { status: true } });
    });
    try {
      await page.goto(
        mode === "verification"
          ? "/forgot-password?mode=verification"
          : "/forgot-password",
        { waitUntil: "commit" },
      );
      const email = page.getByLabel("Email address");
      const submit = page.getByRole("button", {
        name:
          mode === "verification"
            ? "Send verification email"
            : "Send reset email",
        exact: true,
      });
      await expect(email).toBeDisabled();
      await expect(submit).toBeDisabled();
      releaseScripts();
      await expect(email).toBeEnabled();
      await expect(submit).toBeEnabled();
      await email.fill("HYDRATION@Example.COM");
      await submit.click();
      await expect(page.getByRole("status")).toContainText("Check your inbox.");
      expect(submittedEmail).toEqual({ email: "hydration@example.com" });
    } finally {
      releaseScripts();
    }
  });
}
