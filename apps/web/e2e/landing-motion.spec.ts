import { expect, test } from "@playwright/test";

test("hero stays centered across screen sizes and fits standard desktop heights", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?uiFixture=long");
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [
    [320, 740],
    [375, 812],
    [768, 1024],
    [844, 390],
    [900, 600],
    [1024, 768],
    [1280, 720],
    [1515, 730],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    const layout = await page
      .locator('section[aria-labelledby="hero-title"]')
      .evaluate((element) => {
        const hero = element.getBoundingClientRect();
        const copy = element
          .querySelector("[data-hero-copy]")!
          .getBoundingClientRect();
        const scene = element
          .querySelector("[data-letter-scene]")!
          .getBoundingClientRect();
        const header = document
          .querySelector("header")!
          .getBoundingClientRect();
        return {
          heroCenter: hero.x + hero.width / 2,
          viewportCenter: document.documentElement.clientWidth / 2,
          copyCenter: copy.x + copy.width / 2,
          sceneCenter: scene.x + scene.width / 2,
          verticalDifference:
            copy.y + copy.height / 2 - scene.y - scene.height / 2,
          heroBottom: hero.bottom,
          heroTop: hero.top,
          headerBottom: header.bottom,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
    expect(Math.abs(layout.heroCenter - layout.viewportCenter)).toBeLessThan(1);
    expect(layout.overflow).toBe(false);
    expect(Math.abs(layout.heroTop - layout.headerBottom)).toBeLessThan(1);
    if (width <= 768) {
      expect(Math.abs(layout.copyCenter - layout.heroCenter)).toBeLessThan(1);
      expect(Math.abs(layout.sceneCenter - layout.heroCenter)).toBeLessThan(1);
    } else {
      expect(Math.abs(layout.verticalDifference)).toBeLessThan(1);
    }
    if (width >= 1024 && height >= 720) {
      expect(layout.heroBottom).toBeLessThanOrEqual(height + 1);
    }
  }
  await expect(
    page.getByRole("button", { name: /Pause|Resume|Motion off/i }),
  ).toHaveCount(0);
});

test("letter paper stays compact and aligned with the tilted envelope at every breakpoint", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [
    320, 375, 480, 481, 600, 768, 900, 1024, 1280, 1440, 1920,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?uiFixture=long");
    await page.evaluate(() => document.fonts.ready);
    const alignment = await page
      .locator("[data-letter-scene]")
      .evaluate((scene) => {
        const paperElement = scene.querySelector<HTMLElement>(
          "[data-sample-letter]",
        )!;
        const envelopeElement = scene.querySelector<HTMLElement>(
          "[data-envelope-front]",
        )!;
        const frame = scene.querySelector("[data-stationery]")!;
        const paper = paperElement.getBoundingClientRect();
        const envelope = envelopeElement.getBoundingClientRect();
        const tilt = new DOMMatrixReadOnly(getComputedStyle(frame).transform);
        const dx = envelope.x + envelope.width / 2 - paper.x - paper.width / 2;
        const dy =
          envelope.y + envelope.height / 2 - paper.y - paper.height / 2;
        return {
          axisError: Math.abs(dx * tilt.d - dy * tilt.c),
          paperHeightRatio:
            paperElement.offsetHeight / envelopeElement.offsetWidth,
        };
      });
    expect(
      alignment.axisError,
      `${width}px paper alignment along the envelope's tilted centerline`,
    ).toBeLessThan(0.5);
    expect(
      alignment.paperHeightRatio,
      `${width}px paper proportions`,
    ).toBeLessThan(width <= 480 ? 1.15 : 0.87);
  }
});

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

test("WebGL renders, pauses offscreen, and settles without a motion control", async ({
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
  await expect(
    page.getByRole("button", { name: /Pause animation|Resume animation/ }),
  ).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-webgl-running", "false", {
    timeout: 6000,
  });
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await canvas.evaluate((element) => {
    const stage = element.parentElement!;
    const bounds = stage.getBoundingClientRect();
    stage.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: bounds.x + bounds.width * 0.8,
        clientY: bounds.y + bounds.height * 0.3,
      }),
    );
  });
  await expect(canvas).toHaveAttribute("data-webgl-running", "true");
  await expect(canvas).toHaveAttribute("data-webgl-running", "false", {
    timeout: 6000,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveAttribute("data-webgl-state", "paused");
  await expect(page.locator("[data-landing-root]")).toHaveAttribute(
    "data-motion-paused",
    "true",
  );
});

test("ornamental WebGL border draws animated edge light and leaves the content clear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const border = page.locator("[data-hero-border]");
  const canvas = page.locator("[data-border-canvas]");
  await expect(border).toHaveAttribute("aria-hidden", "true");
  await expect(border).toHaveCSS("pointer-events", "none");
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  await expect(canvas).toHaveAttribute("data-webgl-running", "false", {
    timeout: 6000,
  });
  const light = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const gl = target.getContext("webgl")!;
    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
    const sample = (time: number, x: number, y: number) => {
      gl.uniform1f(gl.getUniformLocation(program, "u_time"), time);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      const pixel = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      return pixel[3]!;
    };
    const x = Math.floor(target.width * 0.25);
    return {
      linked: Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)),
      pixels: target.width * target.height,
      passingLight: sample(1, x, target.height - 1),
      afterLight: sample(3, x, target.height - 1),
      center: sample(1, x, Math.floor(target.height / 2)),
    };
  });
  expect(light.linked).toBe(true);
  expect(light.pixels).toBeLessThanOrEqual(802_000);
  expect(light.passingLight).toBeGreaterThan(20);
  expect(light.afterLight).toBeLessThan(5);
  expect(light.center).toBe(0);
  await border.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    element.parentElement!.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: bounds.x + bounds.width * 0.25,
        clientY: bounds.y + 1,
      }),
    );
  });
  await expect(canvas).toHaveAttribute("data-webgl-running", "true");
  await expect(canvas).toHaveAttribute("data-webgl-running", "false", {
    timeout: 6000,
  });
  const action = page.getByRole("link", { name: "Write your letter" }).first();
  await action.focus();
  await expect(action).toBeFocused();
  await expect(action).toHaveAttribute("href", "/sign-in");
});

test("template card borders animate on entry and share one WebGL light across hover and focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/?uiFixture=long");
  const cards = page.locator("[data-template-card]");
  await expect(cards).toHaveCount(3);
  await expect(page.locator("[data-card-border]")).toHaveCount(3);
  const canvas = page.locator("[data-card-canvas]");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("data-webgl-state", "idle");
  await cards.first().scrollIntoViewIfNeeded();
  const trace = cards.first().locator("[data-card-trace]");
  await expect
    .poll(async () =>
      Number(
        await trace.evaluate((element) => getComputedStyle(element).opacity),
      ),
    )
    .toBeGreaterThan(0);
  await expect(trace).toHaveCSS("opacity", "0", { timeout: 4000 });
  await cards.first().hover();
  await expect(cards.first()).toHaveAttribute("data-border-active", "true");
  await expect(canvas).toHaveAttribute("data-webgl-state", "ready");
  const context = await canvas.evaluateHandle((element) =>
    (element as HTMLCanvasElement).getContext("webgl"),
  );
  for (let index = 1; index < 3; index += 1) {
    await cards
      .nth(index)
      .getByRole("link", { name: "Preview", exact: true })
      .focus();
    await expect(cards.nth(index)).toHaveAttribute(
      "data-border-active",
      "true",
    );
    await expect(page.locator("[data-border-active]")).toHaveCount(1);
    expect(
      await canvas.evaluate(
        (element, shared) =>
          (element as HTMLCanvasElement).getContext("webgl") === shared,
        context,
      ),
    ).toBe(true);
    const placement = await page
      .locator("[data-card-light]")
      .evaluate((element) => {
        const active = element
          .parentElement!.querySelector("[data-border-active]")!
          .getBoundingClientRect();
        const overlay = element.getBoundingClientRect();
        return {
          x: overlay.x - active.x,
          y: overlay.y - active.y,
          width: overlay.width - active.width,
          height: overlay.height - active.height,
        };
      });
    expect(placement.x).toBeCloseTo(-6, 0);
    expect(placement.y).toBeCloseTo(-6, 0);
    expect(placement.width).toBeCloseTo(12, 0);
    expect(placement.height).toBeCloseTo(12, 0);
  }
  const light = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement;
    const gl = target.getContext("webgl")!;
    const program = gl.getParameter(gl.CURRENT_PROGRAM) as WebGLProgram;
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), 4);
    gl.uniform2f(gl.getUniformLocation(program, "u_pointer"), 0.5, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const alpha = (y: number) => {
      const pixel = new Uint8Array(4);
      gl.readPixels(
        Math.floor(target.width / 2),
        y,
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixel,
      );
      return pixel[3]!;
    };
    return {
      pixels: target.width * target.height,
      edge: alpha(target.height - 3),
      center: alpha(Math.floor(target.height / 2)),
    };
  });
  expect(light.pixels).toBeLessThanOrEqual(352_000);
  expect(light.edge).toBeGreaterThan(20);
  expect(light.center).toBe(0);
  await context.dispose();
  await page.mouse.move(0, 0);
  await page.getByRole("link", { name: "All categories", exact: true }).focus();
  await expect(page.locator("[data-card-light]")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-webgl-state", "paused");
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
  ).toHaveCount(0);
  await expect(page.locator("[data-silk-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "idle",
  );
  await expect(page.locator("[data-border-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "idle",
  );
  await expect(page.locator("[data-hero-border]")).toBeVisible();
  await page.locator("[data-template-card]").first().scrollIntoViewIfNeeded();
  await page.locator("[data-template-card]").first().hover();
  await expect(page.locator("[data-card-border]")).toHaveCount(3);
  await expect(page.locator("[data-card-canvas]")).toHaveAttribute(
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
  await expect(page.locator("[data-border-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "fallback",
  );
  await expect(page.locator("[data-hero-border]")).toBeVisible();
  await expect(page.locator("[data-sample-letter]")).toContainText(
    "To my favorite person,",
  );
  await expect(
    page.getByRole("link", { name: "Create draft with Secret Letter" }),
  ).toBeVisible();
  const card = page.locator("[data-template-card]").first();
  await card.hover();
  await expect(page.locator("[data-card-canvas]")).toHaveAttribute(
    "data-webgl-state",
    "fallback",
  );
  await expect(card.locator("[data-card-border]")).toBeVisible();
  const preview = card.getByRole("link", { name: "Preview", exact: true });
  await expect(preview).toHaveAttribute("data-preview-hydrated", "true");
  await preview.click();
  await expect(page.getByRole("dialog")).toBeVisible();
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
