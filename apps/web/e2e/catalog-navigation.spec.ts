import { expect, test } from "@playwright/test";

test.describe("catalog navigation", () => {
  test("opens the authenticated overview with the workspace navigation", async ({
    page,
  }) => {
    await page.route("**/api/auth/get-session", async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          session: {
            id: "home-session",
            userId: "home-user",
            expiresAt: "2026-09-20T00:00:00.000Z",
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          user: {
            id: "home-user",
            name: "Home User",
            email: "home@example.com",
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

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: "Good to see you, Home." }),
    ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(
      navigation.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("href", "/dashboard");
    await expect(
      navigation.getByRole("link", { name: "My pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");
    await expect(
      navigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
    await expect(navigation).not.toHaveClass(/overflow-x-auto/u);
    const navigationWidth = await navigation.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(navigationWidth.scrollWidth).toBeLessThanOrEqual(
      navigationWidth.clientWidth,
    );
    if ((page.viewportSize()?.width ?? 0) >= 1024) {
      const sidebar = page.locator("aside");
      await expect(sidebar).toHaveCSS("position", "sticky");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect
        .poll(() =>
          sidebar.evaluate((element) => element.getBoundingClientRect().top),
        )
        .toBe(0);
    }
    await expect(
      page.getByText("Your pages stay yours until you decide to share them.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Private by default", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Make a little room for the words you want someone to keep.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "My pages" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your words stay in your hands." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recent replies" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Choose a shape for what's next." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Your first page starts with a feeling.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your private inbox is waiting." }),
    ).toBeVisible();

    await page.goto("/dashboard/home");
    await expect(page).toHaveURL(/\/dashboard$/u);
  });

  test("renders the complete template collection and category filter", async ({
    page,
  }) => {
    await page.goto("/templates");

    const navigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "My pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");
    await expect(
      page.getByRole("heading", {
        name: "Templates",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("A shape for what matters", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Start with the feeling, not a blank page.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Letterly catalog", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "All categories" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Make it unmistakably yours." }),
    ).toBeVisible();

    const categoryLink = page
      .getByRole("link", { name: /Confession\s+\d+ templates/u })
      .first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await expect(page).toHaveURL(/\/templates\?category=confession$/u);
    await expect(
      page.getByRole("heading", { name: "Templates for confession." }),
    ).toBeVisible();
  });
});
