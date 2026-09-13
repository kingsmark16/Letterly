import { expect, test } from "@playwright/test";

test.describe("Letterly terms page", () => {
  test("presents the complete legal document and footer navigation", async ({
    page,
  }) => {
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { name: "Terms and Conditions" }),
    ).toBeVisible();
    await expect(page.locator("article > section")).toHaveCount(20);
    await expect(
      page.getByRole("link", { name: "Contact Letterly legal" }),
    ).toHaveAttribute("href", "mailto:legal@letterly.app");
    await expect(
      page.locator("footer").getByRole("link", { name: "Terms" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("keeps the document usable at supported widths", async ({ page }) => {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/terms");

      await expect(
        page.getByRole("heading", { name: "Terms and Conditions" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator("article > section")
          .evaluateAll((sections) =>
            sections.every(
              (section) => section.getBoundingClientRect().width > 0,
            ),
          ),
      ).toBe(true);
    }
  });

  test("is reachable from the landing footer", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("[data-landing-root] > footer").getByRole("link", {
        name: "Terms",
      }),
    ).toHaveAttribute("href", "/terms");
  });
});
