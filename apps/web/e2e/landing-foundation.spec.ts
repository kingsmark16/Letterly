import { expect, test } from "@playwright/test";

test.describe("Clerk inspired Letterly landing page", () => {
  test.describe.configure({ mode: "serial" });

  test("AC-5 declares smooth scroll handling for route transitions", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute(
      "data-scroll-behavior",
      "smooth",
    );
  });

  test("AC-5 renders the landing shell without horizontal overflow", async ({
    page,
  }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const heroHeading = page.getByRole("heading", {
        name: "Say what your heart has been holding.",
      });
      await expect(heroHeading).toBeVisible();
      await expect(
        page.locator("[data-landing-root] > header").getByRole("navigation"),
      ).toHaveCount(0);
      await expect(page.locator("[data-landing-root] > footer")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Sign up" }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Create a letter" }),
      ).toHaveAttribute("href", "/sign-in");
      await expect(
        page.getByRole("link", { name: "Explore templates" }),
      ).toHaveCount(0);
      await expect(page.locator("#templates-title")).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Frequently asked questions" }),
      ).toBeAttached();
      await expect(
        page.locator("#faq").getByText("FAQ", { exact: true }),
      ).toBeAttached();

      await expect(
        page.getByRole("heading", { name: "Made by you. Opened by them." }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Your words stay yours until you share them.",
        }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Some words deserve their own place.",
        }),
      ).toHaveCount(0);

      const heroFontSize = await heroHeading.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
      expect(heroFontSize).toBeLessThanOrEqual(width <= 768 ? 46 : 69);

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

  test("AC-5 keeps the compact catalog within narrow reflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/?uiFixture=long");

    await expect(
      page.getByRole("link", { name: "All categories" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Secret Letter" }),
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

    const signUpLink = page.getByRole("link", { name: "Sign up" }).first();
    await signUpLink.focus();
    await expect(signUpLink).toBeFocused();
    await expect(signUpLink).toHaveAttribute("href", "/sign-in");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("AC-7 removes page scrolling motion when reduced motion is requested", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?uiFixture=long");

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
    const reveal = page.locator("[data-reveal]").first();
    await expect(reveal).toHaveAttribute("data-reveal-state", "visible");
    await expect
      .poll(() =>
        reveal.evaluate((element) => getComputedStyle(element).animationName),
      )
      .toBe("none");

    const stackedCard = page.locator("[data-template-stack] > li").first();
    await expect
      .poll(() =>
        stackedCard.evaluate((element) => getComputedStyle(element).transform),
      )
      .toBe("none");
  });

  test("AC-6 reveals sections progressively and keeps pointer effects decorative", async ({
    page,
  }, testInfo) => {
    await page.goto("/?uiFixture=long");

    const landingRoot = page.locator("[data-landing-root]");
    await expect(landingRoot).toHaveAttribute("data-motion-ready", "true");

    const faqSection = page.locator("#faq");
    await faqSection.scrollIntoViewIfNeeded();
    const faqReveal = faqSection.locator('[data-reveal="right"]');
    await expect
      .poll(() => faqReveal.getAttribute("data-reveal-state"))
      .toBe("visible");

    if (testInfo.project.name !== "desktop") {
      return;
    }

    const startPrompt = page.locator('a[data-spotlight][href="#templates"]');
    await startPrompt.scrollIntoViewIfNeeded();
    await startPrompt.hover({ position: { x: 180, y: 24 } });
    await expect
      .poll(() =>
        startPrompt.evaluate((element) =>
          (element as HTMLElement).style.getPropertyValue("--spotlight-x"),
        ),
      )
      .not.toBe("");
  });

  test("AC-6 presents the Letterly flow as a scroll-led story", async ({
    page,
  }) => {
    await page.goto("/?uiFixture=long");

    const howItWorks = page.locator("#how-it-works");
    await expect(
      howItWorks.getByRole("heading", { name: "How Letterly works" }),
    ).toBeVisible();
    await expect(
      howItWorks.locator('[data-react-bits-pattern="scroll-story"]'),
    ).toHaveCount(1);
    await expect(howItWorks.locator("ol > li")).toHaveCount(4);
    await expect(howItWorks.locator("[data-scroll-progress-fill]")).toHaveCount(
      1,
    );
    await expect(
      howItWorks.locator(
        '[data-scroll-progress-marker][data-progress-state="active"]',
      ),
    ).toHaveCount(1);
    await expect(
      howItWorks.getByText("Make it your own", { exact: true }),
    ).toHaveCount(0);
    await expect(
      howItWorks.getByText(
        "Only relevant options appear for the chosen design.",
        {
          exact: true,
        },
      ),
    ).toBeAttached();

    const finalStep = howItWorks.locator("ol > li").last();
    await finalStep.scrollIntoViewIfNeeded();
    await expect
      .poll(() => finalStep.getAttribute("data-reveal-state"))
      .toBe("visible");
  });

  test("AC-3 and AC-6 presents the real catalog as a keyboard reachable template stack", async ({
    page,
  }, testInfo) => {
    await page.goto("/?uiFixture=long");

    const stack = page.locator("[data-template-stack]");
    await expect(stack).toHaveAttribute(
      "data-react-bits-pattern",
      "scroll-stack",
    );
    await expect(stack.locator(":scope > li")).toHaveCount(2);

    const chooseYourHeart = page.getByRole("link", {
      name: "Choose Your Heart",
      exact: true,
    });
    await chooseYourHeart.focus();
    await expect(chooseYourHeart).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/#template-choose-your-heart$/u);
    await expect(
      page.getByRole("heading", { name: "Choose Your Heart" }),
    ).toBeVisible();

    const firstCardPosition = await stack
      .locator(":scope > li")
      .first()
      .evaluate((element) => getComputedStyle(element).position);

    expect(firstCardPosition).toBe(
      testInfo.project.name === "desktop" ? "sticky" : "static",
    );
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

    const previewFallback = noScriptPage
      .getByRole("link", {
        name: "Preview",
      })
      .first();
    await expect(previewFallback).toBeVisible();
    await previewFallback.click();

    await expect(noScriptPage).toHaveURL(/\/preview\//u);
    await expect(noScriptPage.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      noScriptPage.getByText("What this template supports"),
    ).toBeVisible();

    await noScriptPage.goto("/?uiFixture=long");
    await expect(
      noScriptPage.getByRole("heading", { name: "Choose Your Heart" }),
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
