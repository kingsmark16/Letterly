import { expect, test } from "@playwright/test";

test("landing actions provide hover, pressed, and reduced motion states", async ({
  page,
}) => {
  test.skip(
    !(await page.evaluate(() => matchMedia("(hover: hover)").matches)),
    "Requires a hover-capable pointer.",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const action = page
    .locator("#main-content > section")
    .first()
    .getByRole("link", { name: "Write your letter" });
  await action.hover();
  await expect(action).toHaveCSS("background-color", "rgb(111, 31, 56)");
  await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
  await page.mouse.down();
  await expect(action).toHaveCSS("transform", "matrix(0.98, 0, 0, 0.98, 0, 0)");
  await page.mouse.move(0, 0);
  await page.mouse.up();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(action).toHaveCSS("transition-duration", "0s");
});

test("landing links have usable targets, destinations, and focus at every width", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const actions = [
      page
        .getByRole("banner")
        .getByRole("link", { name: "Sign in", exact: true }),
      page
        .getByRole("banner")
        .getByRole("link", { name: "Sign up", exact: true }),
      ...(await page.getByRole("link", { name: "Write your letter" }).all()),
      page.getByRole("link", { name: "Find your inspiration" }),
    ];
    for (const action of actions) {
      const target = await action.boundingBox();
      expect(target!.width).toBeGreaterThanOrEqual(44);
      expect(target!.height).toBeGreaterThanOrEqual(44);
      await action.focus();
      await expect(action).toBeFocused();
      await expect(action).toHaveCSS("outline-style", "solid");
      await expect(action).toHaveAttribute("href", /^(\/sign-in|#templates)$/u);
    }
    await page.goto("/?uiFixture=error");
    const recovery = page.getByRole("link", { name: "Try again", exact: true });
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await expect(recovery).toHaveAttribute("href", "/");
    expect((await recovery.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});
