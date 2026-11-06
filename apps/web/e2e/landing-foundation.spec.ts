import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { appOrigin } from "./support/app-origin";

test.describe("Letterly romantic landing page", () => {
  test("filters actual templates on the landing page and supports browser back", async ({
    page,
  }) => {
    await page.goto("/?uiFixture=long");
    const categories = page.getByRole("navigation", {
      name: "Browse categories",
    });
    const cards = page.locator("[data-template-card]");
    await categories
      .getByRole("link", { name: "Confession", exact: true })
      .click();
    await expect(page).toHaveURL(
      /\/?\?uiFixture=long&category=confession#templates$/,
    );
    await expect(cards).toHaveCount(2);
    await expect(
      categories.getByRole("link", { name: "Confession", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-landing-root]")).toBeVisible();
    await categories
      .getByRole("link", { name: "Celebration", exact: true })
      .click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Celebration Note");
    await categories
      .getByRole("link", { name: "All categories", exact: true })
      .click();
    await expect(cards).toHaveCount(3);
    expect(new URL(page.url()).pathname).toBe("/");
    await page.goBack();
    await expect(cards).toHaveCount(1);
    await expect(
      categories.getByRole("link", { name: "Celebration", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-card-border]")).toHaveCount(1);
  });

  test("browses every template beyond the preview limit without leaving the landing page", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?uiFixture=growth");
    await expect(
      page.getByRole("link", { name: "Preview", exact: true }).first(),
    ).toHaveAttribute("data-preview-hydrated", "true");
    const categories = page.getByRole("navigation", {
      name: "Browse categories",
    });
    const cards = page.locator("[data-template-card]");
    await expect(cards).toHaveCount(20);
    await categories
      .getByRole("link", { name: "Confession", exact: true })
      .click();
    await expect(
      categories.getByRole("link", { name: "Confession", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(cards).toHaveCount(20);
    const firstPage = await cards.evaluateAll((elements) =>
      elements.map((element) => element.dataset.templateCard),
    );
    await page.getByRole("link", { name: "Next designs", exact: true }).click();
    await expect(cards).toHaveCount(5);
    const lastPage = await cards.evaluateAll((elements) =>
      elements.map((element) => element.dataset.templateCard),
    );
    expect(new Set([...firstPage, ...lastPage]).size).toBe(25);
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(
      page.getByRole("link", { name: "Next designs", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("link", { name: "Previous designs", exact: true })
      .click();
    await expect(cards).toHaveCount(20);
    expect(
      await cards.evaluateAll((elements) =>
        elements.map((element) => element.dataset.templateCard),
      ),
    ).toEqual(firstPage);
    await categories
      .getByRole("link", { name: "All categories", exact: true })
      .click();
    await expect(
      categories.getByRole("link", { name: "All categories", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(cards).toHaveCount(20);
    expect(new URL(page.url()).searchParams.has("cursor")).toBe(false);
    expect(new URL(page.url()).searchParams.has("category")).toBe(false);
  });

  test("keeps landing category filters keyboard usable without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: appOrigin,
      javaScriptEnabled: false,
    });
    try {
      const page = await context.newPage();
      await page.goto("/?uiFixture=long");
      const categories = page.getByRole("navigation", {
        name: "Browse categories",
      });
      await categories
        .getByRole("link", { name: "Confession", exact: true })
        .press("Enter");
      await expect(page).toHaveURL(/category=confession#templates$/);
      await page.waitForLoadState("load");
      await expect(page.locator("[data-template-card]")).toHaveCount(2);
      expect(new URL(page.url()).pathname).toBe("/");
      await categories
        .getByRole("link", { name: "Celebration", exact: true })
        .press("Enter");
      await expect(page).toHaveURL(/category=celebration#templates$/);
      await page.waitForLoadState("load");
      await expect(page.locator("[data-template-card]")).toHaveCount(1);
      await categories
        .getByRole("link", { name: "All categories", exact: true })
        .press("Enter");
      await expect(page).toHaveURL(/\?uiFixture=long#templates$/);
      await page.waitForLoadState("load");
      await expect(page.locator("[data-template-card]")).toHaveCount(3);
    } finally {
      await context.close();
    }
  });

  test("renders the real catalog and readable composition across viewport widths", async ({
    page,
  }) => {
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?uiFixture=long");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Say what your heart has been holding.",
      );
      await expect(
        page.getByRole("figure", {
          name: "A sample letter, tucked into a rose envelope",
        }),
      ).toBeVisible();
      await expect(page.locator("#templates-title")).toHaveText(
        "A place for every feeling.",
      );
      await expect(
        page
          .getByRole("list", { name: "Available Letterly designs" })
          .locator(":scope > li"),
      ).toHaveCount(3);
      await expect(
        page.getByRole("link", { name: "Celebration", exact: true }),
      ).toHaveAttribute(
        "href",
        "/?uiFixture=long&category=celebration#templates",
      );
      await expect(page.locator("#how-it-works ol > li")).toHaveCount(4);
      await expect(page.locator("#final-title")).toHaveText(
        "You have the words.Give them a place.",
      );
      await expect(page.locator("[data-landing-root] > footer")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test("keeps primary actions and the skip link keyboard reachable", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Preview", exact: true }).first(),
    ).toHaveAttribute("data-preview-hydrated", "true");
    await page.bringToFront();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await expect(skip).toHaveAttribute("href", "#main-content");
    for (const action of [
      page.getByRole("link", { name: "Sign up", exact: true }),
      ...(await page.getByRole("link", { name: "Write your letter" }).all()),
    ]) {
      await expect(action).toHaveAttribute("href", "/sign-in");
      await action.focus();
      await expect(action).toBeFocused();
      await expect(action).toHaveCSS("outline-style", "solid");
    }
    const inspiration = page.getByRole("link", {
      name: "Find your inspiration",
    });
    await inspiration.click();
    await expect(page).toHaveURL(/#templates$/u);
    await expect(page.locator("#templates-title")).toBeInViewport();
  });

  test("keeps native FAQ answers accessible by keyboard", async ({ page }) => {
    await page.goto("/");
    const question = page.locator("#faq summary").first();
    await question.focus();
    await page.keyboard.press("Enter");
    const answer = page.locator("#faq details").first();
    await expect(answer).toHaveAttribute("open", "");
    await expect(answer.locator("p")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(answer).not.toHaveAttribute("open", "");
  });

  test("keeps empty and recoverable error catalog states", async ({ page }) => {
    await page.goto("/?uiFixture=empty");
    await expect(page.locator("#templates").getByRole("status")).toContainText(
      "Something thoughtful is on its way.",
    );
    await page.goto("/?uiFixture=error");
    await expect(page.locator("#templates").getByRole("alert")).toContainText(
      "The category collection is temporarily unavailable.",
    );
    await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("shared loading state reflows and respects reduced motion", async ({
    page,
  }) => {
    await page.goto("/?uiFixture=loading");
    const loading = page.locator('main[data-page-loading="true"]');
    await expect(loading.getByRole("status")).toContainText(
      "Loading categories",
    );
    await page.evaluate(() => {
      const footer = document.createElement("footer");
      footer.textContent = "Loading footer check";
      document.body.append(footer);
    });
    await expect(page.getByText("Loading footer check")).not.toBeVisible();
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 568, height: 320 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(loading.getByRole("heading")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(loading.locator("svg g")).toHaveCSS("animation-name", "none");
    await loading.evaluate((element) => element.remove());
    await expect(page.getByText("Loading footer check")).toBeVisible();
  });

  test("keeps all content readable with reduced motion and forced colors", async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: "reduce",
      forcedColors: "active",
    });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/?uiFixture=long");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Create draft with Secret Letter" }),
    ).toBeVisible();
    const hero = page.locator("#main-content > section").first();
    await expect(hero).toHaveCSS("animation-name", "none");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

  test("opens preview with focus containment and restores focus on close", async ({
    page,
  }) => {
    await page.goto("/?uiFixture=long");
    const preview = page
      .getByRole("link", { name: "Preview", exact: true })
      .first();
    await expect(preview).toHaveAttribute("data-preview-hydrated", "true");
    await preview.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    const useTemplate = dialog.getByRole("button", {
      name: /Use this template/,
    });
    await expect(useTemplate).toBeVisible();
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () => document.activeElement?.closest("dialog") !== null,
        ),
      ).toBe(true);
      if (
        await useTemplate.evaluate(
          (element) => element === document.activeElement,
        )
      )
        break;
    }
    await expect(useTemplate).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(preview).toBeFocused();
  });

  test("retains real preview navigation and content without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: appOrigin,
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    try {
      await page.goto("/?uiFixture=long");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("#how-it-works ol > li")).toHaveCount(4);
      await page.locator('[data-creation-step="2"]').press("Enter");
      await expect(page).toHaveURL(/#creation-step-3$/);
      await expect(page.locator("#creation-step-copy-3")).toBeVisible();
      await expect(page.locator("[data-journey-canvas]")).toHaveAttribute(
        "data-webgl-state",
        "idle",
      );
      await page
        .getByRole("link", { name: "Preview", exact: true })
        .first()
        .press("Enter");
      await expect(page).toHaveURL(/\/preview\//u);
      await expect(
        page.getByRole("heading", { name: "Secret Letter", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("What this design supports")).toBeVisible();
      await page.goto("/preview/choose-your-heart");
      await expect(
        page
          .getByRole("region", { name: "Template sample preview", exact: true })
          .getByRole("heading", { name: "Choose Your Heart", exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("meets automated accessibility checks on the rendered landing and open FAQ", async ({
    page,
  }) => {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/?uiFixture=long");
      await page.locator("#faq summary").first().click();
      const results = await new AxeBuilder({ page })
        .include("[data-landing-root]")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });
});
