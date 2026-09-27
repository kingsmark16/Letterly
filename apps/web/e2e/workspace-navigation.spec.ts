import { expect, test } from "@playwright/test";

const session = {
  session: {
    id: "navigation-test",
    userId: "navigation-creator",
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  user: {
    id: "navigation-creator",
    name: "Navigation Test",
    email: "navigation@example.com",
    emailVerified: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/get-session")) {
      await route.fulfill({ json: session });
    } else if (new URL(route.request().url()).pathname.endsWith("/sign-out")) {
      await route.fulfill({
        status: 500,
        json: { message: "Test sign-out failure" },
      });
    } else {
      await route.continue();
    }
  });
  await page.route("**/api/v1/pages?*", (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
});

test("reference navigation reflows and the mobile menu restores focus", async ({
  page,
}) => {
  await page.goto("/dashboard/pages");
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const mobile = width < 1024;
    if (mobile)
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    const navigation = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .filter({ visible: true });
    await expect(
      navigation.getByRole("link", { name: "Templates", exact: true }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("href", "/dashboard/home");
    await expect(
      navigation.getByRole("link", { name: "Create Page", exact: true }),
    ).toHaveCount(0);
    await expect(
      navigation.getByText("Favorites", { exact: true }),
    ).toBeAttached();
    await expect(navigation.getByText("Coming soon")).toHaveCount(5);
    await expect(
      page
        .getByRole("button", { name: "Open account menu" })
        .filter({ visible: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (!mobile) {
      const sidebar = page.locator("aside");
      const dimensions = await sidebar.evaluate((element) => ({
        borderRadius: window.getComputedStyle(element).borderRadius,
        clientHeight: element.clientHeight,
        left: element.getBoundingClientRect().left,
        scrollHeight: element.scrollHeight,
        top: element.getBoundingClientRect().top,
      }));
      expect(dimensions.left).toBe(0);
      expect(dimensions.top).toBe(0);
      expect(dimensions.borderRadius).toBe("0px");
      expect(dimensions.scrollHeight).toBeLessThanOrEqual(
        dimensions.clientHeight,
      );
      await expect(navigation).toHaveCSS("justify-content", "space-evenly");
    }
    if (mobile) {
      const dialog = page.getByRole("dialog", { name: "Workspace menu" });
      for (let index = 0; index < 12; index++) {
        await page.keyboard.press("Tab");
        expect(
          await dialog.evaluate((element) =>
            element.contains(document.activeElement),
          ),
        ).toBe(true);
      }
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(
        page.getByRole("button", { name: "Menu", exact: true }),
      ).toBeFocused();
    }
  }

  await page.setViewportSize({ width: 1440, height: 768 });
  const shortSidebar = page.locator("aside");
  await expect(shortSidebar).toBeVisible();
  expect(
    await shortSidebar.evaluate(
      (element) => element.scrollHeight <= element.clientHeight,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 1440, height: 600 });
  const shortNavigation = page
    .getByRole("navigation", { name: "Workspace navigation" })
    .filter({ visible: true });
  await shortNavigation.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    shortNavigation.getByRole("link", { name: "Archive", exact: true }),
  ).toBeVisible();
});

test("workspace Home opens the reference based creation page", async ({
  page,
}) => {
  await page.goto("/dashboard/home");

  await expect(page).toHaveURL(/\/dashboard\/home$/u);
  await expect(
    page.getByRole("heading", {
      name: "Create, Personalize, Share with Love.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a Letter", exact: true }),
  ).toHaveAttribute("href", "/templates");
  await expect(
    page.getByRole("link", { name: "Browse Categories", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Browse Confession category" }),
  ).toHaveAttribute("href", "/templates?category=confession");

  const heroFigure = page.locator('figure[aria-label^="A pink envelope"]');
  const heroIllustration = heroFigure.locator("img");
  await heroIllustration.evaluate(async (image: HTMLImageElement) =>
    image.decode(),
  );
  const benefits = page.getByLabel("Why choose Letterly");
  for (const heading of [
    "Thoughtful Designs",
    "Personalize Your Page",
    "Share Easily",
    "Made for Meaning",
  ]) {
    await expect(
      benefits.getByRole("heading", { name: heading }),
    ).toBeVisible();
  }

  const howSection = page.getByRole("region", {
    name: "How Letterly works",
  });
  await expect(howSection).toBeVisible();
  for (const heading of [
    "Start with a category.",
    "Build around your message.",
    "See the finished experience.",
    "Share it when ready.",
  ]) {
    await expect(
      howSection.getByRole("heading", { name: heading }),
    ).toBeVisible();
  }
  await expect(howSection.getByRole("link")).toHaveCount(4);
  for (const link of await howSection.getByRole("link").all()) {
    await expect(link).toHaveAttribute("href", "/templates");
  }

  const faqSection = page.getByRole("region", {
    name: "Frequently asked questions",
  });
  await expect(faqSection).toBeVisible();
  const firstQuestion = faqSection.getByText("What is Letterly?", {
    exact: true,
  });
  await firstQuestion.click();
  await expect(
    faqSection.getByText("Letterly gives meaningful words their own place.", {
      exact: false,
    }),
  ).toBeVisible();

  const categoryImages = page.locator("[data-category-thumbnail]");
  await expect(categoryImages).toHaveCount(4);

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(heroIllustration).toBeVisible();
    const illustrationBox = await heroFigure.boundingBox();
    expect(illustrationBox).not.toBeNull();
    expect(
      Math.abs(
        (illustrationBox?.width ?? 0) / (illustrationBox?.height ?? 1) -
          856 / 480,
      ),
    ).toBeLessThan(0.02);

    const [pageBox, benefitsBox] = await Promise.all([
      page.locator("main#dashboard-content").boundingBox(),
      benefits.boundingBox(),
    ]);
    expect(pageBox).not.toBeNull();
    expect(benefitsBox).not.toBeNull();
    expect((benefitsBox?.width ?? 0) / (pageBox?.width ?? 1)).toBeGreaterThan(
      0.84,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const imageBoxes = await categoryImages.evaluateAll((images) =>
      images.map((image) => {
        const box = image.getBoundingClientRect();
        return { left: Math.round(box.left), ratio: box.width / box.height };
      }),
    );
    expect(new Set(imageBoxes.map((box) => box.left)).size).toBe(
      width >= 1280 ? 4 : width >= 768 ? 2 : 1,
    );
    for (const box of imageBoxes) {
      expect(Math.abs(box.ratio - 4 / 3)).toBeLessThan(0.02);
    }
  }
});

test("draft and archive links select working filters and account errors remain visible", async ({
  page,
}) => {
  await page.goto("/dashboard/pages");
  for (const [label, filter] of [
    ["Drafts", "Draft"],
    ["Archive", "Archived"],
  ] as const) {
    if ((page.viewportSize()?.width ?? 0) < 1024)
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .getByRole("link", { name: label, exact: true })
      .filter({ visible: true })
      .click();
    await expect(
      page.getByRole("button", { name: filter, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("dialog", { name: "Workspace menu" }),
    ).toBeHidden();
  }
  if ((page.viewportSize()?.width ?? 0) < 1024)
    await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Open account menu" })
    .filter({ visible: true })
    .click();
  await page.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "We could not sign you out",
  );
});

test("header search navigates and notifications disclose availability", async ({
  page,
}) => {
  await page.goto("/dashboard/pages");
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(
    page.getByText("Notifications are not available yet.", { exact: false }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("searchbox", { name: "Search categories and designs" })
    .fill("no-matching-template-test");
  await page
    .getByRole("searchbox", { name: "Search categories and designs" })
    .press("Enter");
  await expect(page).toHaveURL(/\/templates\?q=no-matching-template-test$/u);
  await expect(
    page.getByRole("heading", { name: "No designs match your search." }),
  ).toBeVisible();
});
