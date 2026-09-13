import { expect, test } from "@playwright/test";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const publishedSlug = process.env.PUBLIC_TEST_SLUG;

async function openReportSurface(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto(`/p/${publishedSlug}`);
  const openButton = page.getByRole("button", { name: "Open your letter" });
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
    await expect(page.getByRole("heading", { name: /^To / })).toBeFocused();
  }
  await expect(
    page.getByRole("heading", { name: "Report this page" }),
  ).toBeHidden();
  await page.getByRole("link", { name: "Report this letter" }).click();
  await expect(
    page.getByRole("dialog", { name: "Report this page" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Report this page" }),
  ).toBeVisible();
}

test.describe("public report flow", () => {
  test("opens as a modal and returns focus to the bottom report control", async ({
    page,
  }) => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );
    await openReportSurface(page);

    await page.keyboard.press("Escape");

    await expect(
      page.getByRole("dialog", { name: "Report this page" }),
    ).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Report this letter" }),
    ).toBeFocused();
  });

  test("validates a missing reason without sending a request", async ({
    page,
  }) => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );
    await openReportSurface(page);

    await page.getByRole("button", { name: "Send report" }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Choose a reason before sending your report." }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "What is wrong with this page?" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      page.getByRole("textbox", { name: /Additional details/u }),
    ).toHaveValue("");
  });

  test("submits a report and shows the private success state", async ({
    page,
  }) => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );
    await page.route(`**/p/${publishedSlug}/report`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          reportId: "77777777-7777-4777-8777-777777777777",
        }),
      });
    });
    await openReportSurface(page);

    await page.getByRole("radio", { name: "Spam" }).check();
    await page
      .getByRole("textbox", { name: /Additional details/u })
      .fill("A short safety report.");
    await page.getByRole("button", { name: "Send report" }).click();

    await expect(
      page.getByRole("heading", {
        name: "Thank you for helping keep Letterly safe.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "We will review the report without exposing your identity.",
      ),
    ).toBeVisible();
  });

  test("keeps report entries and reuses the form after a rate limit", async ({
    page,
  }) => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );
    let attempts = 0;
    await page.route(`**/p/${publishedSlug}/report`, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            statusCode: 429,
            code: "RATE_LIMITED",
            message: "Please wait before sending another report.",
            requestId: "88888888-8888-4888-8888-888888888888",
            details: { retryAfterSeconds: 30 },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accepted: true,
          reportId: "99999999-9999-4999-8999-999999999999",
        }),
      });
    });
    await openReportSurface(page);

    const message = "Please review this page.";
    await page.getByRole("radio", { name: "Other" }).check();
    await page
      .getByRole("textbox", { name: /Additional details/u })
      .fill(message);
    await page.getByRole("button", { name: "Send report" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "about 30 seconds" }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /Additional details/u }),
    ).toHaveValue(message);
    await expect(
      page.getByRole("button", { name: "Try sending again" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Try sending again" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Thank you for helping keep Letterly safe.",
      }),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });
});
