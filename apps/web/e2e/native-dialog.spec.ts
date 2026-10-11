import { expect, test } from "@playwright/test";
import { appOrigin } from "./support/app-origin";

test("authentication footers consume the legal dialog owner and restore focus", async ({
  page,
}) => {
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({ json: null }),
  );
  for (const path of ["/sign-in", "/sign-up"]) {
    await page.goto(path);
    for (const [link, name] of [
      ["Privacy", "Privacy Policy"],
      ["Terms", "Terms and Conditions"],
    ]) {
      const trigger = page
        .getByRole("navigation", { name: "Footer navigation" })
        .getByRole("link", { name: link, exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name, exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog.locator("article > section")).toHaveCount(20);
      await dialog.getByRole("button", { name: `Close ${name}` }).click();
      await expect(trigger).toBeFocused();
    }
    await page.waitForLoadState("networkidle");
  }
});

test("legal composition preserves policy scrolling and responsive header styles", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const original = page.viewportSize() ?? { width: 1440, height: 900 };
  for (const viewport of [
    original,
    { width: 320, height: 640 },
    { width: 480, height: 900 },
    { width: 481, height: 900 },
    { width: 768, height: 900 },
    { width: 769, height: 900 },
    { width: 390, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const [link, name] of [
      ["Privacy", "Privacy Policy"],
      ["Terms", "Terms and Conditions"],
    ]) {
      const trigger = page
        .locator("[data-landing-root] > footer")
        .getByRole("link", { name: link, exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name, exact: true });
      const header = dialog.locator("> div > header");
      const title = header.getByRole("heading", { name, exact: true });
      const description = header.locator("p");
      await expect(dialog).toBeVisible();
      const bounds = await dialog.boundingBox();
      expect(bounds).not.toBeNull();
      if (viewport.width <= 768) {
        expect(bounds).toEqual({
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        });
        await expect(dialog).toHaveCSS("border-radius", "0px");
      } else {
        expect(
          Math.abs(bounds!.x - (viewport.width - bounds!.width) / 2),
        ).toBeLessThanOrEqual(1);
        expect(bounds!.width).toBe(Math.min(992, viewport.width - 48));
        expect(bounds!.height).toBeCloseTo(
          Math.min(896, viewport.height * 0.88),
          0,
        );
      }
      const narrow = viewport.width <= 480;
      await expect(header).toHaveCSS(
        "padding-left",
        viewport.width > 768 ? "28px" : narrow ? "12px" : "16px",
      );
      await expect(header).toHaveCSS(
        "padding-top",
        viewport.width > 768 ? "24px" : narrow ? "12px" : "16px",
      );
      await expect(description).toHaveCSS("font-weight", "400");
      await expect(description).toHaveCSS("text-transform", "none");
      await expect(description).toHaveCSS("letter-spacing", "normal");
      await expect(title).toHaveCSS("text-align", "start");
      if (viewport.width <= 768) {
        const expectedSize = narrow
          ? Math.max(21.6, Math.min(26.4, viewport.width * 0.068))
          : Math.max(28.8, Math.min(36, viewport.width * 0.08));
        expect(
          await title.evaluate((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          ),
        ).toBeCloseTo(expectedSize, 1);
        await expect(description).toHaveCSS(
          "font-size",
          narrow ? "12.8px" : "14px",
        );
      }
      const body = dialog.locator("> div > div");
      await expect(body).toHaveCSS("overflow-y", "auto");
      await expect(dialog.locator("article > section")).toHaveCount(20);
      await dialog.locator("article > section").last().scrollIntoViewIfNeeded();
      expect(
        await body.evaluate((element) => element.scrollTop),
      ).toBeGreaterThan(0);
      const close = dialog.getByRole("button", { name: `Close ${name}` });
      await expect(close).toBeInViewport();
      await close.click();
      await expect(trigger).toBeFocused();
    }
    await page.waitForLoadState("networkidle");
  }
});

test("catalog previews use composed desktop and full screen compact layouts", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const original = page.viewportSize() ?? { width: 1440, height: 900 };
  for (const viewport of [
    original,
    { width: 320, height: 640 },
    { width: 768, height: 900 },
    { width: 769, height: 900 },
    { width: 390, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/templates/confession");
    for (const name of ["Secret Letter", "Choose Your Heart"]) {
      const card = page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      const trigger = card.getByRole("link", { name: "Preview", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name, exact: true });
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: `Close ${name} preview` }),
      ).toBeVisible();
      const bounds = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          radius: getComputedStyle(element).borderRadius,
          border: getComputedStyle(element).borderTopWidth,
        };
      });
      if (viewport.width <= 768) {
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(viewport.width);
        expect(bounds.height).toBe(viewport.height);
        expect(bounds.radius).toBe("0px");
        expect(bounds.border).toBe("0px");
      } else {
        expect(
          Math.abs(bounds.x - (viewport.width - bounds.width) / 2),
        ).toBeLessThanOrEqual(1);
        expect(bounds.width).toBeLessThanOrEqual(
          Math.min(1120, viewport.width - 28),
        );
        expect(bounds.height).toBeLessThanOrEqual(
          Math.min(832, viewport.height - 28),
        );
      }
      const region = dialog.getByRole("region", {
        name:
          name === "Secret Letter"
            ? "Secret Letter sample preview"
            : "Template sample preview",
        exact: true,
      });
      await expect(region).toBeVisible();
      await expect(region).toHaveCSS("overflow-y", "auto");
      expect(
        await region.evaluate((element) => element.clientHeight),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await dialog
        .getByRole("button", { name: `Close ${name} preview` })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
    await page.waitForLoadState("networkidle");
  }
});

test("legal and preview close controls share target size and interaction colors", async ({
  page,
}) => {
  for (const surface of ["legal", "preview"] as const) {
    await page.goto(surface === "legal" ? "/" : "/templates/confession");
    const trigger =
      surface === "legal"
        ? page
            .locator("[data-landing-root] > footer")
            .getByRole("link", { name: "Privacy", exact: true })
        : page.getByRole("link", { name: "Preview", exact: true }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    const close = dialog.getByRole("button", {
      name: surface === "legal" ? "Close Privacy Policy" : /Close .+ preview/u,
    });
    await expect(close).toBeVisible();
    await expect(close).toHaveAttribute("data-dialog-close", "icon-only");
    await page.mouse.move(1, 1);
    await expect(close).toHaveCSS("width", "44px");
    await expect(close).toHaveCSS("height", "44px");
    await expect(close).toHaveCSS("border-radius", "9999px");
    await expect(close).toHaveCSS("color", "rgb(139, 41, 70)");
    await expect(close).toHaveCSS("background-color", "rgb(255, 253, 253)");
    await close.hover();
    await expect(close).toHaveCSS("color", "rgb(255, 253, 253)");
    await expect(close).toHaveCSS("background-color", "rgb(139, 41, 70)");
    await page.mouse.move(1, 1);
    await page.keyboard.press("Tab");
    await close.focus();
    expect(
      await close.evaluate((element) => element.matches(":focus-visible")),
    ).toBe(true);
    await expect(close).toHaveCSS("background-color", "rgb(139, 41, 70)");
    await expect(close).toHaveCSS("outline-style", "solid");
    await close.hover();
    await page.mouse.down();
    await expect(close).toHaveCSS("background-color", "rgb(111, 31, 56)");
    await page.mouse.up();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.waitForLoadState("networkidle");
  }
});

test("native legal modal keeps background inert through keyboard movement and restores its trigger", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page
    .locator("[data-landing-root] > footer")
    .getByRole("link", { name: "Privacy", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Privacy Policy" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    expect(
      await dialog.evaluate(
        (element) =>
          document.activeElement === document.body ||
          element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await dialog.getByRole("button", { name: "Close Privacy Policy" }).focus();
  await trigger.evaluate((element) => element.focus());
  expect(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("preview modal ignores the overlay and returns focus after visible close", async ({
  page,
}) => {
  await page.goto("/templates/confession");
  const trigger = page
    .getByRole("link", { name: "Preview", exact: true })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) > 768) {
    await page.mouse.click(1, 1);
    await expect(dialog).toBeVisible();
  }
  await dialog.getByRole("button", { name: /Close .+ preview/u }).click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("unsupported native modal enhancement preserves legal and preview route navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) =>
    errors.push(`${new URL(page.url()).pathname}: ${error.message}`),
  );
  await page.addInitScript(() => {
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: undefined,
    });
  });
  for (const [name, path] of [
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as const) {
    await page.goto("/");
    // Let automatic link prefetches finish before testing a full document navigation.
    await page.waitForLoadState("networkidle");
    await page
      .locator("[data-landing-root] > footer")
      .getByRole("link", { name, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`, "u"));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");
  }
  await page.goto("/templates/confession");
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("link", { name: "Preview", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/preview\//u);
  await expect(
    page.getByRole("heading", { name: "Secret Letter", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("legal and preview content stays reachable without JavaScript", async ({
  browser,
  viewport,
}) => {
  const context = await browser.newContext({
    baseURL: appOrigin,
    javaScriptEnabled: false,
    viewport,
  });
  try {
    const page = await context.newPage();
    for (const [name, path] of [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ] as const) {
      await page.goto("/");
      await page
        .locator("[data-landing-root] > footer")
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${path}$`, "u"));
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/templates/confession");
    await page
      .getByRole("link", { name: "Preview", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/preview\//u);
    await expect(
      page.getByRole("heading", { name: "Secret Letter", exact: true }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
