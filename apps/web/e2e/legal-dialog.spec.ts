import { expect, test } from "@playwright/test";

test.describe("Letterly legal dialogs", () => {
  test("opens the privacy policy in a scrollable dialog and restores focus", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page
      .locator("[data-landing-root] > footer")
      .getByRole("link", { name: "Privacy" });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Privacy Policy" }),
    ).toBeVisible();
    await expect(dialog.locator("article > section")).toHaveCount(20);
    await expect(
      dialog.getByRole("link", { name: "Open full page" }),
    ).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Close Privacy Policy" }),
    ).toBeVisible();
    expect(
      await dialog.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return (
          Math.abs(bounds.left - (window.innerWidth - bounds.width) / 2) <= 1
        );
      }),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("opens the terms and conditions in the same dialog surface", async ({
    page,
  }) => {
    await page.goto("/");

    const trigger = page
      .locator("[data-landing-root] > footer")
      .getByRole("link", { name: "Terms" });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Terms and Conditions" }),
    ).toBeVisible();
    await expect(dialog.locator("article > section")).toHaveCount(20);

    await dialog
      .getByRole("button", { name: "Close Terms and Conditions" })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test("keeps legal dialogs within the viewport on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page
      .locator("[data-landing-root] > footer")
      .getByRole("link", { name: "Privacy" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await dialog
        .locator("article > section")
        .evaluateAll((sections) =>
          sections.every(
            (section) => section.getBoundingClientRect().width > 0,
          ),
        ),
    ).toBe(true);
  });
});
