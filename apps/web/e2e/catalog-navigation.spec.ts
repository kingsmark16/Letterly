import { expect, test } from "@playwright/test";

test.describe("catalog navigation", () => {
  test("redirects the dashboard root and keeps the workspace Home route", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/templates$/u);
    await expect(
      page.getByRole("heading", { name: "Categories for Every Story" }),
    ).toBeVisible();

    const navigation = page.getByRole("navigation", {
      name: "Workspace navigation",
    });
    await expect(
      navigation.getByRole("link", { name: "Dashboard" }),
    ).toHaveCount(0);
    await expect(
      navigation.getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
    await expect(
      navigation.getByRole("link", { name: "Pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");

    await page.goto("/dashboard/home");
    await expect(page).toHaveURL(/\/dashboard\/home$/u);
    await expect(
      page.getByRole("heading", { name: "Sign in to open your pages." }),
    ).toBeVisible();
  });

  test("renders the category gallery and category filter", async ({ page }) => {
    await page.goto("/templates");

    const navigation = page.getByRole("navigation", {
      name: "Workspace navigation",
    });
    await expect(navigation).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Dashboard" }),
    ).toHaveCount(0);
    await expect(
      navigation.getByRole("link", { name: "Pages" }),
    ).toHaveAttribute("href", "/dashboard/pages");
    await expect(
      page.getByRole("heading", {
        name: "Categories for Every Story",
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
      page.getByRole("link", { name: "All Categories" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Make it unmistakably yours." }),
    ).toHaveCount(0);
    const categoryThumbnails = page.locator(
      '[data-category-thumbnail="confession"]',
    );
    await expect(categoryThumbnails).toHaveCount(2);
    for (const thumbnail of await categoryThumbnails.all()) {
      await expect(thumbnail).toBeVisible();
    }

    const categoryLink = page
      .getByRole("link", { name: "Confession", exact: true })
      .first();
    await expect(categoryLink).toBeVisible();
    await categoryLink.click();
    await expect(page).toHaveURL(/\/templates\?category=confession$/u);
    await expect(
      page.getByRole("heading", { name: "Designs for confession" }),
    ).toBeVisible();
  });
});
