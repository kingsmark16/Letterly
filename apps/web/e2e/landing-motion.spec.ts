import { expect, test } from "@playwright/test";

test("sample letter opens, reverses, and survives rapid toggles", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const scene = page.locator("[data-sample-open]");
  const button = scene.getByRole("button");
  const letter = scene.locator("[data-sample-letter]");
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect
    .poll(() =>
      letter.evaluate(
        (element) =>
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
      ),
    )
    .toBeLessThan(-20);
  await expect
    .poll(() => letter.evaluate((element) => getComputedStyle(element).zIndex))
    .toBe("3");
  const lastLine = letter.locator("p").last();
  await lastLine.scrollIntoViewIfNeeded();
  expect(
    await lastLine.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      return hit === element || (hit !== null && element.contains(hit));
    }),
  ).toBe(true);
  for (let i = 0; i < 7; i++) await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() =>
      letter.evaluate((element) =>
        Math.abs(
          new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
        ),
      ),
    )
    .toBeLessThan(0.01);
  await expect(button).toBeFocused();
});

test("WebGL renders, pauses offscreen, and obeys the motion control", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const canvas = page.locator("[data-silk-canvas]");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await expect(canvas).toHaveAttribute("data-webgl-running", "true");
  const shader = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const gl = target.getContext("webgl")!;
    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
    return {
      linked: Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)),
      uniforms: gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number,
      pixels: target.width * target.height,
    };
  });
  expect(shader.linked).toBe(true);
  expect(shader.uniforms).toBe(3);
  expect(shader.pixels).toBeLessThanOrEqual(1_202_000);
  await page.locator("#faq").scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-running", "false");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-running", "true");
  await page
    .getByRole("button", { name: "Pause animation", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-webgl-state", "paused");
  await expect(page.locator("[data-landing-root]")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
  await page
    .getByRole("button", { name: "Resume animation", exact: true })
    .click();
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
});

test("reduced motion uses immediate letter states and never initializes WebGL", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?uiFixture=long");
  const button = page.locator("[data-sample-open] button");
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const y = await page
    .locator("[data-sample-letter]")
    .evaluate(
      (element) =>
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m42,
    );
  expect(y).toBeLessThan(-20);
  await expect(
    page.getByRole("button", { name: "Reduced motion enabled" }),
  ).toBeDisabled();
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "idle",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "ready",
  );
  await expect(button).toHaveAttribute("aria-expanded", "true");
});

test("unavailable WebGL leaves the sample and catalog usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  await page.locator("[data-silk-canvas]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "fallback",
  );
  await page.getByRole("button", { name: "Open the sample letter" }).click();
  await expect(
    page.getByRole("button", { name: "Close the sample letter" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("link", { name: "Create draft with Secret Letter" }),
  ).toBeVisible();
});

test("lost WebGL context stops rendering and restores without losing letter state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const canvas = page.locator("[data-silk-canvas]");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await page.getByRole("button", { name: "Open the sample letter" }).click();
  const extension = await canvas.evaluateHandle((element) => {
    const gl = (element as HTMLCanvasElement).getContext("webgl")!;
    return gl.getExtension("WEBGL_lose_context")!;
  });
  await extension.evaluate((value) => value.loseContext());
  await expect(canvas).toHaveAttribute("data-webgl-state", "fallback");
  await expect(canvas).toHaveAttribute("data-webgl-running", "false");
  await expect(
    page.getByRole("button", { name: "Close the sample letter" }),
  ).toHaveAttribute("aria-expanded", "true");
  await extension.evaluate((value) => value.restoreContext());
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await extension.dispose();
});
