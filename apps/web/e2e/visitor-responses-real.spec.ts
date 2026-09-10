import { expect, test } from "@playwright/test";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const slug = process.env.PUBLIC_REAL_RESPONSE_SLUG;

async function openResponseForm(page: import("@playwright/test").Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(`/p/${encodeURIComponent(slug ?? "")}?opening=1`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const openingButton = page.locator("[data-envelope-button]");
    if (
      (await openingButton.count()) > 0 &&
      (await openingButton.first().isVisible())
    ) {
      await openingButton.first().click();
      await expect(openingButton.first()).toBeHidden({ timeout: 30_000 });
    }
    if (await page.getByRole("heading", { name: "Leave a response" }).count()) {
      break;
    }
    await page.waitForTimeout(2_000);
  }

  await expect(
    page.getByRole("heading", { name: "Leave a response" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.locator('[data-opened="true"][data-revealed="true"]'),
  ).toHaveCount(1, { timeout: 10_000 });
  await expect(
    page.locator('[data-question-card], button[aria-label="Send my response"]'),
  ).toBeVisible({ timeout: 30_000 });
}

async function answerAllQuestions(page: import("@playwright/test").Page) {
  for (let answered = 0; answered < 20; answered += 1) {
    const choice = page.locator("[data-choice-card]").first();
    const textAnswer = page.getByLabel("Your answer");

    if ((await choice.count()) > 0) {
      await choice.click();
      await expect(choice.locator('input[type="radio"]')).toBeChecked();
    } else if ((await textAnswer.count()) > 0) {
      await textAnswer.fill(`Browser answer ${answered}`);
    } else {
      break;
    }

    const continueButton = page.getByRole("button", {
      name: "Continue to the next question",
    });
    if ((await continueButton.count()) === 0) break;
    await continueButton.click();
  }
}

test.describe("real public visitor response journey", () => {
  test("submits through the browser proxy and shows the delivered state", async ({
    page,
  }) => {
    test.skip(!slug, "Set PUBLIC_REAL_RESPONSE_SLUG for a writable DB journey");
    if (!slug) return;

    test.setTimeout(120_000);
    await openResponseForm(page);

    await answerAllQuestions(page);
    const privateMessage = page.getByLabel(/Private message/);
    if ((await privateMessage.count()) > 0) {
      await privateMessage.fill(`Browser response ${Date.now()}`);
    }

    const submission = page.waitForResponse(
      (response) =>
        response.url().includes(`/p/${slug}/responses`) &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Send my response" }).click();
    await expect((await submission).status()).toBe(201);
    await expect(
      page.getByRole("heading", { name: "Thank you for sharing." }),
    ).toBeVisible();
  });

  test("submits a private message without a question answer", async ({
    page,
  }) => {
    test.skip(!slug, "Set PUBLIC_REAL_RESPONSE_SLUG for a writable DB journey");
    if (!slug) return;

    test.setTimeout(120_000);
    await openResponseForm(page);

    for (let skipped = 0; skipped < 20; skipped += 1) {
      const skipButton = page.getByRole("button", {
        name: "Skip this question",
      });
      if ((await skipButton.count()) === 0) break;
      await skipButton.click();
    }

    const message = page.getByLabel(/Private message/);
    if ((await message.count()) === 0) {
      test.skip(true, "This page does not enable private visitor messages");
      return;
    }
    await expect(message).toBeVisible();
    await message.fill(`Message-only response ${Date.now()}`);

    const submission = page.waitForResponse(
      (response) =>
        response.url().includes(`/p/${slug}/responses`) &&
        response.request().method() === "POST",
    );
    await expect(
      page.getByRole("button", { name: "Send my response" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Send my response" }).click();
    await expect((await submission).status()).toBe(201);
    await expect(
      page.getByRole("heading", { name: "Thank you for sharing." }),
    ).toBeVisible();
  });
});
