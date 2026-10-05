import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import baseline from "./fixtures/landing-link-controls.json" with { type: "json" };

const properties = [
  "display",
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "line-height",
  "min-height",
  "padding",
  "gap",
  "border-top-width",
  "border-top-color",
  "border-radius",
  "text-decoration-line",
  "text-underline-offset",
  "box-shadow",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
];

test("landing links retain hover and pressed states", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const signIn = page
    .getByRole("banner")
    .getByRole("link", { name: "Sign in", exact: true });
  await signIn.hover();
  await expect(signIn).toHaveCSS("color", "rgb(139, 41, 70)");
  for (const link of [
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign up", exact: true }),
    page.getByRole("link", { name: /Get started/ }),
  ]) {
    await link.hover();
    await expect(link).toHaveCSS("background-color", "rgb(111, 31, 56)");
    await expect(link).toHaveCSS("border-top-color", "rgb(111, 31, 56)");
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.down();
    await expect(link).toHaveCSS("transform", "matrix(0.98, 0, 0, 0.98, 0, 0)");
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  const prompt = page.getByRole("link", { name: /Start with a category/ });
  await prompt.hover();
  await expect(prompt).toHaveCSS("border-top-color", "rgb(139, 41, 70)");
  await expect(prompt).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, -2)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(prompt).toHaveCSS("transform", "none");
  await page.goto("/?uiFixture=error");
  const recovery = page.getByRole("link", { name: "Try again", exact: true });
  await recovery.hover();
  await expect(recovery).toHaveCSS("color", "rgb(139, 41, 70)");
  await expect(recovery).toHaveAttribute("href", "/");
});

test("landing link composition retains its rendered control baseline", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observations = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const links = [
      page
        .getByRole("complementary", { name: "Letterly note" })
        .getByRole("link"),
      page
        .getByRole("banner")
        .getByRole("link", { name: "Sign in", exact: true }),
      page
        .getByRole("banner")
        .getByRole("link", { name: "Sign up", exact: true }),
      page.getByRole("link", { name: /Get started/ }),
      page.getByRole("link", { name: /Start with a category/ }),
    ];
    const states = [];
    for (const link of links) {
      await page.mouse.move(0, 0);
      states.push(
        await link.evaluate(
          (element, names) =>
            names.map((name) =>
              getComputedStyle(element).getPropertyValue(name),
            ),
          properties,
        ),
      );
      await link.focus();
      await expect(link).toBeFocused();
      await expect(link).toHaveCSS("outline-style", "solid");
    }
    await page.goto("/?uiFixture=error");
    const recovery = page.getByRole("link", { name: "Try again", exact: true });
    states.push(
      await recovery.evaluate(
        (element, names) =>
          names.map((name) => getComputedStyle(element).getPropertyValue(name)),
        properties,
      ),
    );
    observations.push({ width, states });
  }
  await writeFile(
    testInfo.outputPath("landing-link-controls.json"),
    JSON.stringify(
      { profile: testInfo.project.name, properties, observations },
      null,
      2,
    ),
  );
  for (const observation of observations) {
    const expected = baseline.observations.find(
      (entry) => entry.width === observation.width,
    )!;
    observation.states.forEach((state, linkIndex) =>
      state.forEach((value, propertyIndex) => {
        const expectedValue = expected.states[linkIndex]![propertyIndex]!;
        if (properties[propertyIndex] === "line-height") {
          expect(
            Math.abs(parseFloat(value) - parseFloat(expectedValue)),
          ).toBeLessThan(0.02);
        } else {
          expect(
            value,
            `${observation.width}px link ${linkIndex} ${properties[propertyIndex]}`,
          ).toBe(expectedValue);
        }
      }),
    );
  }
});
