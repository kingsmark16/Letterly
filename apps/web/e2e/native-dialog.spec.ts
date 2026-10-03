import { expect, test } from "@playwright/test";

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
    baseURL: "http://127.0.0.1:3100",
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
