import { expect, test } from "@playwright/test";

test("sample artwork has no opening button and keeps its message visible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?uiFixture=long");
    const scene = page.locator("[data-letter-scene]");
    await expect(scene.getByRole("button")).toHaveCount(0);
    const lastLine = scene.locator("[data-sample-letter] p").last();
    await lastLine.scrollIntoViewIfNeeded();
    expect(
      await lastLine.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const front = element
          .closest("figure")!
          .querySelector<HTMLElement>("[data-envelope-front]")!;
        const original = front.style.pointerEvents;
        front.style.pointerEvents = "auto";
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        front.style.pointerEvents = original;
        const transparentViewport =
          hit?.tagName.toLowerCase() === "svg" &&
          hit.getAttribute("fill") === "none";
        return (
          hit === element ||
          (hit !== null && element.contains(hit)) ||
          transparentViewport
        );
      }),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
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

test("reduced motion leaves the letter visible without initializing WebGL", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?uiFixture=long");
  await expect(page.locator("[data-sample-letter]")).toBeVisible();
  await expect(page.locator("[data-letter-scene] button")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Reduced motion enabled" }),
  ).toBeDisabled();
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "idle",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("[data-silk-canvas]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "ready",
  );
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
  await expect(page.locator("[data-sample-letter]")).toContainText(
    "To my favorite person,",
  );
  await expect(
    page.getByRole("link", { name: "Create draft with Secret Letter" }),
  ).toBeVisible();
});

test("lost WebGL context stops rendering and restores with the artwork intact", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const canvas = page.locator("[data-silk-canvas]");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  const extension = await canvas.evaluateHandle((element) =>
    (element as HTMLCanvasElement)
      .getContext("webgl")!
      .getExtension("WEBGL_lose_context")!,
  );
  await extension.evaluate((value) => value.loseContext());
  await expect(canvas).toHaveAttribute("data-webgl-state", "fallback");
  await expect(canvas).toHaveAttribute("data-webgl-running", "false");
  await expect(page.locator("[data-sample-letter]")).toBeVisible();
  await extension.evaluate((value) => value.restoreContext());
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await extension.dispose();
});
