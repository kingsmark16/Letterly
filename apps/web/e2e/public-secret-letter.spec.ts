import { expect, test } from "@playwright/test";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const publishedSlug = process.env.PUBLIC_TEST_SLUG;

test.describe("public Secret Letter route", () => {
  test("AC-7 renders a generic unavailable page without private details", async ({
    page,
  }) => {
    const response = await page.goto("/p/dashboard");

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);
    expect(response?.headers()["cache-control"]).toContain("no-store");
    expect(response?.headers()["x-robots-tag"]).toBe(
      "noindex, nofollow, noarchive",
    );

    await expect(
      page.getByRole("heading", { name: "This letter is not available." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Return to Letterly" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("creatorId");
    await expect(page.locator("body")).not.toContainText("contentVersion");
    await expect(page).toHaveTitle("Letter unavailable | Letterly");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow, noarchive",
    );
  });

  test.describe("published letter", () => {
    test.skip(
      !publishedSlug,
      "Set PUBLIC_TEST_SLUG to a current published page for this journey",
    );

    test("AC-6 and AC-9 render the published letter and keep the opening keyboard accessible", async ({
      page,
    }) => {
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await expect(
        page.getByRole("heading", {
          name: /I’ve been meaning to tell you/u,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).toBeVisible();
      await expect(page.getByText("For My Dearest")).toBeVisible();
      await expect(page.getByText("Tap to open")).toBeVisible();

      await page.getByRole("button", { name: "Open your letter" }).click();
      const content = page.locator("[data-letter-content-wrapper]");
      expect(
        await content.evaluate((element) => getComputedStyle(element).opacity),
      ).toBe("0");
      await expect(page.getByRole("heading", { name: /^To / })).toBeFocused();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).not.toBeVisible();
    });

    test("opens when the visible tap instruction is tapped", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      const openingHint = page.getByText("Tap to open", { exact: true });
      await expect(openingHint).toBeVisible();
      await openingHint.click();

      await expect(page.locator('[data-opening="true"]')).toHaveCount(1);
    });

    test("keeps lower sections hidden until the hero reveal completes", async ({
      page,
    }) => {
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);
      await page.getByRole("button", { name: "Open your letter" }).click();
      await expect(
        page.locator('[data-opened="true"][data-revealed="false"]'),
      ).toHaveCount(1);

      const lowerSectionOpacities = await page
        .locator("[data-letter-content-wrapper]")
        .evaluate((content) =>
          [...content.querySelectorAll("article > section, article > footer")]
            .slice(1)
            .map((section) => getComputedStyle(section).opacity),
        );
      expect(lowerSectionOpacities).toHaveLength(5);
      expect(lowerSectionOpacities.every((opacity) => opacity === "0")).toBe(
        true,
      );
    });

    test("reveals the letter without a long opening handoff", async ({
      page,
    }) => {
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);
      await page.getByRole("button", { name: "Open your letter" }).click();

      await expect(
        page.locator('[data-opened="true"][data-revealed="true"]'),
      ).toHaveCount(1, { timeout: 1_700 });
    });

    test("keeps memory images lazy while the letter opens", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 500 });
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      const memorySection = page
        .locator("section")
        .filter({ hasText: "Every version of life" });
      const memoryImages = memorySection.locator("img");
      await expect(memoryImages).not.toHaveCount(0);
      expect(
        await memoryImages.evaluateAll((images) =>
          images.every(
            (image) => (image as HTMLImageElement).loading === "lazy",
          ),
        ),
      ).toBe(true);

      await page.getByRole("button", { name: "Open your letter" }).click();
      await expect(
        page.locator('[data-opened="true"][data-revealed="true"]'),
      ).toHaveCount(1);
      await memorySection.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          memoryImages.evaluateAll((images) =>
            images.every(
              (image) => (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
        )
        .toBe(true);

      const firstMemoryCard = memorySection.locator("figure").first();
      await expect(firstMemoryCard.locator("figcaption")).not.toHaveAttribute(
        "title",
      );
      await page.evaluate(() =>
        window.scrollTo({ top: 220, left: 0, behavior: "auto" }),
      );
      await expect
        .poll(() =>
          firstMemoryCard.evaluate((card) =>
            Number.parseFloat(getComputedStyle(card).opacity),
          ),
        )
        .toBe(1);
      await page.evaluate(() =>
        window.scrollTo({ top: 0, left: 0, behavior: "auto" }),
      );
      await page.waitForTimeout(200);
      expect(
        await firstMemoryCard.evaluate((card) =>
          Number.parseFloat(getComputedStyle(card).opacity),
        ),
      ).toBe(1);
    });

    // Covers AC-8, AC-10, and AC-11.
    test("keeps the creative question stage progressive and keyboard friendly", async ({
      page,
    }) => {
      await page.goto(
        `/p/${encodeURIComponent(publishedSlug ?? "")}?opening=1`,
      );

      const questionSection = page.locator("[data-question-section]");
      await expect(questionSection).toBeVisible();
      await questionSection.scrollIntoViewIfNeeded();
      await expect(
        questionSection.getByText("A little question, just for us"),
      ).toBeVisible();
      await expect(
        questionSection.getByText("Choose from the heart"),
      ).toHaveCount(0);

      const progress = questionSection.getByRole("progressbar", {
        name: "Response progress",
      });
      if ((await progress.count()) === 0) {
        test.skip(true, "The published fixture has no enabled questions");
        return;
      }

      await expect(progress).toBeVisible();
      await expect(progress).toHaveAttribute("aria-valuenow", "0");

      const answerControl = questionSection
        .locator("[data-choice-card], textarea")
        .first();
      await expect(answerControl).toBeVisible();

      const choiceCard = questionSection.locator("[data-choice-card]").first();
      if ((await choiceCard.count()) > 0) {
        const radio = choiceCard.getByRole("radio");
        await radio.focus();
        await expect(radio).toBeFocused();
        await page.keyboard.press("Space");
        await expect(radio).toBeChecked();
        await expect(
          questionSection.getByRole("button", {
            name: "Continue to the next question",
          }),
        ).toBeEnabled();
        return;
      }

      const textAnswer = questionSection.getByLabel("Your answer");
      await expect(textAnswer).toBeVisible();
      await textAnswer.fill("A thought worth keeping close.");
      await expect(
        questionSection.getByRole("button", {
          name: "Continue to the next question",
        }),
      ).toBeEnabled();
    });

    test("does not offer a private message in the completed Secret Letter response", async ({
      page,
    }) => {
      await page.goto(
        `/p/${encodeURIComponent(publishedSlug ?? "")}?opening=1`,
      );

      const questionSection = page.locator("[data-question-section]");
      const progress = questionSection.getByRole("progressbar", {
        name: "Response progress",
      });
      if ((await progress.count()) === 0) {
        test.skip(true, "The published fixture has no enabled questions");
        return;
      }

      const skipButton = questionSection.getByRole("button", {
        name: "Skip this question",
      });
      await expect(skipButton).toBeVisible({ timeout: 10_000 });
      await skipButton.click();

      await expect(
        questionSection.getByRole("heading", { name: "You reached the end." }),
      ).toBeVisible();
      await expect(questionSection.locator("#visitor-message")).toHaveCount(0);
      await expect(questionSection.getByLabel(/Private message/)).toHaveCount(
        0,
      );
      await expect(questionSection).not.toContainText(
        "Only the page creator can read this message",
      );
      await expect(
        questionSection.getByRole("button", { name: "Send my response" }),
      ).toBeDisabled();
    });

    test("paginates a long message and reveals its writing slowly", async ({
      page,
    }) => {
      await page.goto(
        `/p/${encodeURIComponent(publishedSlug ?? "")}?opening=1`,
      );

      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      const reader = page.locator("[data-message-reader]");
      await reader.scrollIntoViewIfNeeded();

      const pagination = page.getByRole("navigation", {
        name: "Message pages",
      });
      await expect(pagination).toBeVisible();
      await expect(pagination.getByText(/Page 1 of/u)).toBeVisible();

      const visualMessage = page.locator("[data-message-visual]");
      const firstLength = (await visualMessage.textContent())?.length ?? 0;
      await expect
        .poll(async () => (await visualMessage.textContent())?.length ?? 0)
        .toBeGreaterThan(firstLength);

      const fullPageLength =
        (await page.locator("[data-message-full]").textContent())?.length ?? 0;
      expect(fullPageLength).toBeGreaterThan(firstLength);
      await expect(
        page.getByRole("button", { name: "Show full message" }),
      ).toBeVisible();

      await pagination
        .getByRole("button", { name: "Next message page" })
        .click();
      await expect(pagination.getByText(/Page 2 of/u)).toBeVisible();
      await expect(
        pagination.getByRole("button", { name: "Previous message page" }),
      ).toBeEnabled();
      await expect(
        page.locator("[data-message-page]").evaluate((element) => ({
          overflow: getComputedStyle(element).overflow,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
        })),
      ).resolves.toMatchObject({ overflow: "visible" });
    });

    test("AC-11 keeps the published letter readable with reduced motion", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await expect(
        page.getByRole("heading", {
          name: /I’ve been meaning to tell you/u,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Replay opening" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Skip animation" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("checkbox", { name: "Reduce motion" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Open your letter" }).click();
      await expect(page.getByRole("heading", { name: /^To / })).toBeFocused();
      await expect(
        page.getByRole("link", { name: "Letterly home" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Create your own letter" }),
      ).toBeVisible();
    });

    test("opens a reloaded published letter at the top", async ({ page }) => {
      await page.goto(
        `/p/${encodeURIComponent(publishedSlug ?? "")}?opening=1`,
      );

      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      await expect(page.locator('[data-revealed="true"]')).toHaveCount(1);
      await page.evaluate(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
      });
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(0);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /^To / })).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    });

    test("AC-14 keeps the letter readable when public images fail", async ({
      page,
    }) => {
      await page.route(
        `**/p/${encodeURIComponent(publishedSlug ?? "")}/media/*`,
        async (route) => {
          await route.fulfill({ status: 503, body: "unavailable" });
        },
      );

      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

      await page.getByRole("button", { name: "Open your letter" }).click();
      await page
        .getByRole("heading", { name: /Every version of life/u })
        .scrollIntoViewIfNeeded();

      await expect(
        page.getByText("This image is unavailable right now.").first(),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: /I’ve been meaning to tell you/u,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Letterly home" }),
      ).toBeVisible();
    });

    test("AC-9 keeps decoded public WebP images available after reload", async ({
      page,
    }) => {
      test.setTimeout(120_000);
      const mediaResponsePromise = page.waitForResponse((response) =>
        /\/p\/[^/]+\/media\/[^/?]+/.test(response.url()),
      );
      await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`, {
        waitUntil: "domcontentloaded",
      });
      const mediaResponse = await mediaResponsePromise;
      const images = page.locator("main figure img");

      expect(mediaResponse.status()).toBe(200);
      expect(mediaResponse.headers()["content-type"]).toContain("image/webp");
      expect(mediaResponse.headers()["cache-control"]).toContain("no-store");
      await page.getByRole("button", { name: "Open your letter" }).click();
      await page
        .getByRole("heading", { name: /Every version of life/u })
        .scrollIntoViewIfNeeded();
      await expect(images.first()).toBeVisible();
      await expect
        .poll(
          () =>
            images.evaluateAll((elements) =>
              elements.every(
                (element) => (element as HTMLImageElement).naturalWidth > 0,
              ),
            ),
          { timeout: 60_000 },
        )
        .toBe(true);

      await expect
        .poll(async () =>
          (await page.context().cookies()).some(
            (cookie) => cookie.name === "letterly_browser",
          ),
        )
        .toBe(true);

      await page.reload({ waitUntil: "domcontentloaded" });

      await expect(images.first()).toBeVisible();
      await expect
        .poll(
          () =>
            images.evaluateAll((elements) =>
              elements.every(
                (element) => (element as HTMLImageElement).naturalWidth > 0,
              ),
            ),
          { timeout: 60_000 },
        )
        .toBe(true);
    });
  });
});

test.describe("public Secret Letter without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test.skip(
    !publishedSlug,
    "Set PUBLIC_TEST_SLUG to a current published page for this journey",
  );

  test("AC-9 keeps the letter content in the document without client scripts", async ({
    page,
  }) => {
    await page.goto(`/p/${encodeURIComponent(publishedSlug ?? "")}`);

    await expect(
      page.locator("#letter-content").getByRole("heading", {
        level: 2,
        name: /I’ve been meaning to tell you/u,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Letterly home" }),
    ).toBeVisible();
  });
});
