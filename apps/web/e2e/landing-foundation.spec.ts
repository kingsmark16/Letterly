import { expect, test } from "@playwright/test";

test.describe("landing design system foundation", () => {
  test.describe.configure({ mode: "serial" });

  test("AC-5 renders the landing shell without horizontal overflow", async ({
    page,
  }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      await expect(
        page.getByRole("heading", {
          name: "Say what your heart has been holding.",
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Primary navigation" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Create a page" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          name: "Choose a shape for what you feel.",
        }),
      ).toBeVisible();

      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
    }
  });

  test("AC-9 covers catalog loading, empty, and recovery states", async ({
    page,
  }) => {
    await page.goto("/?uiFixture=loading");
    await expect(page.locator('main[aria-busy="true"]')).toBeVisible();
    await expect(page.getByText("Loading templates")).toBeAttached();

    await page.goto("/?uiFixture=empty");
    await expect(page.getByRole("status")).toContainText(
      "Something thoughtful is on its way.",
    );

    await page.goto("/?uiFixture=error");
    await expect(
      page.getByRole("alert").filter({ hasText: "Catalog unavailable" }),
    ).toContainText("Catalog unavailable");
    await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("AC-5 wraps long catalog content at narrow reflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/?uiFixture=long");

    await expect(
      page.getByText(/deliberately long category description/),
    ).toBeVisible();
    await expect(
      page.getByText(/capability-with-a-long-unbroken-token/).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test("AC-3 keeps the primary actions keyboard reachable", async ({
    page,
  }) => {
    await page.goto("/");

    const createLink = page.getByRole("link", { name: "Create a page" });
    await createLink.focus();
    await expect(createLink).toBeFocused();
    await expect(createLink).toHaveAttribute("href", "#create");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("AC-7 removes page scrolling motion when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      ),
    ).toBe("auto");
    await expect(
      page.getByRole("heading", {
        name: "Say what your heart has been holding.",
      }),
    ).toBeVisible();
  });

  test("AC-3 opens the template preview and returns focus to its trigger", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const preview = page.getByRole("link", { name: "Preview" }).first();
    const catalogHeading = page.getByRole("heading", { name: "Secret Letter" });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await page
        .goto("/?uiFixture=long", {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        })
        .catch(() => null);

      try {
        await expect(catalogHeading).toBeVisible({ timeout: 15_000 });
        await expect(preview).toBeVisible({ timeout: 15_000 });
        break;
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
      }
    }

    await preview.focus();
    await preview.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    const closeButton = dialog.getByRole("button", {
      name: /Close .* preview/,
    });
    const useTemplateLink = dialog.getByRole("link", {
      name: /Use this template/,
    });
    await expect(closeButton).toBeVisible();
    await expect(useTemplateLink).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
    expect(
      await page.evaluate(
        () => document.activeElement?.closest("dialog") !== null,
      ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await expect(useTemplateLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(preview).toBeFocused();
  });

  test("AC-9 keeps a real preview route available without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
      javaScriptEnabled: false,
    });
    const noScriptPage = await context.newPage();

    await noScriptPage.goto("/?uiFixture=long");

    const previewFallback = noScriptPage.getByRole("link", {
      name: "Preview",
    }).first();
    await expect(previewFallback).toBeVisible();
    await previewFallback.click();

    await expect(noScriptPage).toHaveURL(/\/preview\//u);
    await expect(noScriptPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      noScriptPage.getByText("What this template supports"),
    ).toBeVisible();

    await noScriptPage.goto("/preview/choose-your-heart");
    await expect(
      noScriptPage.getByRole("heading", { name: "Choose Your Heart" }),
    ).toBeVisible();

    await context.close();
  });

  test("AC-3 keeps the landing content usable in forced colors and at 200 percent zoom", async ({
    page,
  }) => {
    // A 320 CSS pixel viewport is the reflow equivalent of 200 percent zoom
    // for the desktop and mobile browser projects.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Say what your heart has been holding.",
      }),
    ).toBeVisible();
    const overflow = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      return Array.from(document.querySelectorAll<HTMLElement>("body *"))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            className: element.className,
            right: Math.round(rect.right),
            viewport,
          };
        })
        .filter(({ right }) => right > viewport + 1)
        .slice(0, 8);
    });

    expect(overflow).toEqual([]);
  });
});
