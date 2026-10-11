import { expect, test } from "@playwright/test";

test("recovery footer preserves its full and short viewport link composition", async ({
  page,
}) => {
  await page.goto("/forgot-password");
  const privacy = page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Privacy", exact: true });
  for (const [width, height, fontSize, minimumHeight] of [
    [390, 900, "12.48px", 44],
    [390, 600, "10.56px", 40],
    [1440, 900, "12.48px", 44],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect(privacy).toHaveCSS("font-size", fontSize);
    await expect(privacy).toHaveCSS("min-height", `${minimumHeight}px`);
    await privacy.focus();
    await expect(privacy).toHaveCSS("outline-color", "rgb(111, 31, 56)");
    await expect(privacy).toHaveCSS("outline-offset", "2px");
  }
});

test("sign in legal links retain compact styles and dialog focus return", async ({
  page,
}) => {
  await page.goto("/sign-in");
  const privacy = page
    .getByRole("navigation", { name: "Footer navigation" })
    .getByRole("link", { name: "Privacy", exact: true });
  await expect(privacy).toHaveAttribute("href", "/privacy");
  await expect(privacy).toHaveCSS("font-size", "12px");
  await expect(privacy).toHaveCSS("color", "rgb(114, 90, 100)");
  await privacy.focus();
  await expect(privacy).toHaveCSS("outline-color", "rgb(111, 31, 56)");
  await expect(privacy).toHaveCSS("outline-width", "2px");
  await expect(privacy).toHaveCSS("outline-offset", "2px");
  await privacy.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(privacy).toBeFocused();
});

test("preview back links preserve presentation and keyboard navigation", async ({
  page,
}) => {
  for (const key of ["secret-letter", "choose-your-heart"]) {
    await page.goto(`/preview/${key}`);
    const back = page.getByRole("link", { name: /Return to categories/ });
    await expect(back).toHaveAttribute("href", "/templates");
    await expect(back).toHaveCSS("color", "rgb(139, 41, 70)");
    await expect(back).toHaveCSS("font-size", "14px");
    await expect(back).toHaveCSS("font-weight", "700");
    await expect(back).toHaveCSS("text-decoration-line", "underline");
    await expect(back).toHaveCSS("text-underline-offset", "2.8px");
    await expect(back).toHaveCSS("margin-bottom", "24px");
    await back.focus();
    await expect(back).toBeFocused();
    await expect(back).toHaveCSS("outline-style", "solid");
    expect(
      await back.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await back.press("Enter");
    await expect(page).toHaveURL(/\/templates$/);
  }
});

test("landing footer preserves navigation, focus and legal return", async ({
  page,
}) => {
  await page.goto("/");
  const supportsHover = await page.evaluate(
    () => window.matchMedia("(hover: hover)").matches,
  );
  const footer = page.getByRole("navigation", { name: "Footer navigation" });
  for (const name of [
    "Categories",
    "How it works",
    "FAQ",
    "Privacy",
    "Terms",
    "Sign in",
  ]) {
    const link = footer.getByRole("link", { name, exact: true });
    await page.mouse.move(0, 0);
    await expect(link).toHaveCSS("color", "rgb(114, 90, 100)");
    await expect(link).toHaveCSS("font-size", "12.48px");
    await expect(link).toHaveCSS("text-decoration-line", "none");
    expect(
      await link.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS("outline-width", "2px");
    await expect(link).toHaveCSS("outline-offset", "3px");
    if (supportsHover) {
      await expect(async () => {
        await link.hover();
        await expect(link).toHaveCSS("color", "rgb(139, 41, 70)", {
          timeout: 500,
        });
      }).toPass({ timeout: 5000 });
    }
  }
  const privacy = footer.getByRole("link", { name: "Privacy", exact: true });
  await privacy.press("Space");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(privacy).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("dashboard footer preserves native routes and explicit link styles", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "footer-session",
          userId: "footer-creator",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        user: {
          id: "footer-creator",
          name: "Footer Creator",
          email: "footer@example.com",
          emailVerified: true,
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      },
    }),
  );
  await page.route("**/api/v1/pages?*", (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } }),
  );
  await page.goto("/dashboard/pages");
  const supportsHover = await page.evaluate(
    () => window.matchMedia("(hover: hover)").matches,
  );
  const footer = page.getByRole("navigation", {
    name: "Workspace footer navigation",
  });
  for (const [name, href] of [
    ["Privacy and safety", "/privacy"],
    ["Terms", "/terms"],
  ]) {
    const link = footer.getByRole("link", { name, exact: true });
    await page.mouse.move(0, 0);
    await expect(link).toHaveAttribute("href", href!);
    await expect(link).toHaveCSS("color", "rgb(114, 90, 100)");
    await expect(link).toHaveCSS("font-size", "12.48px");
    await expect(link).toHaveCSS("text-decoration-line", "none");
    await link.focus();
    await expect(link).toHaveCSS("outline-style", "solid");
    await expect(link).toHaveCSS("outline-width", "2px");
    await expect(link).toHaveCSS("outline-offset", "3px");
    if (supportsHover) {
      await expect(async () => {
        await link.hover();
        await expect(link).toHaveCSS("color", "rgb(139, 41, 70)", {
          timeout: 500,
        });
      }).toPass({ timeout: 5000 });
    }
  }
});
