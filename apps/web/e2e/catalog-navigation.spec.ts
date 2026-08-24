import { expect, test } from "@playwright/test";

test.describe("catalog navigation", () => {
  test("opens the authenticated Home workspace with the shared header", async ({
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

    await page.goto("/dashboard/home");

    await expect(
      page.getByRole("heading", { name: "Good to see you, Home." }),
    ).toBeVisible();
    const navigation = page.getByRole("navigation", {
      name: "Dashboard navigation",
    });
    await expect(
      navigation.getByRole("link", { name: "Home" }),
    ).toHaveAttribute("href", "/dashboard/home");
    await expect(
      navigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
  });

  test("renders the complete template collection and category filter", async ({
    page,
  }) => {
    await page.goto("/templates");

    await expect(
      page.getByRole("heading", {
        name: "Templates",
      }),
    ).toBeVisible();
    await expect(page.getByText("A shape for what matters", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Start with the feeling, not a blank page.", {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByText("Letterly catalog", { exact: true })).toHaveCount(0);
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
