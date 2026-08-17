import { expect, test } from "@playwright/test";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const slug = process.env.PUBLIC_REAL_RESPONSE_SLUG;

test.describe("real public visitor response journey", () => {
  test("submits through the browser proxy and shows the delivered state", async ({
    page,
  }) => {
    test.skip(!slug, "Set PUBLIC_REAL_RESPONSE_SLUG for a writable DB journey");
    if (!slug) return;

    test.setTimeout(120_000);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.goto(`/p/${slug}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      if (
        await page.getByRole("heading", { name: "Leave a response" }).count()
      ) {
        break;
      }
      await page.waitForTimeout(2_000);
    }
    await expect(
      page.getByRole("heading", { name: "Leave a response" }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole("radio", { name: "The happy moments" }).check();
    await page
      .getByLabel(/Private message/)
      .fill(`Browser response ${Date.now()}`);

    const submission = page.waitForResponse(
      (response) =>
        response.url().includes(`/p/${slug}/responses`) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Send private response" }).click();
    await expect((await submission).status()).toBe(201);
    await expect(
      page.getByRole("heading", { name: "Thank you for sharing." }),
    ).toBeVisible();
  });
});
