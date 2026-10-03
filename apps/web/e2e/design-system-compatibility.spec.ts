import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

async function mountSharedPrimitiveFixture(page: Page): Promise<void> {
  const markup = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      fileURLToPath(new URL("./fixtures/shared-layout.tsx", import.meta.url)),
    ],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL("../tsconfig.test.json", import.meta.url),
        ),
      },
    },
  );
  await page.goto("/");
  await page.evaluate((html) => {
    const host = document.createElement("div");
    host.id = "shared-layout-host";
    host.innerHTML = html;
    document.body.append(host);
  }, markup);
}

test("AC-9 covers catalog loading, empty, and recovery states", async ({
  page,
}) => {
  await page.goto("/?uiFixture=loading");
  await expect(page.locator('main[aria-busy="true"]')).toBeVisible();
  await expect(page.getByText("Loading categories")).toBeAttached();
  await page.goto("/?uiFixture=empty");
  await expect(page.getByRole("status")).toContainText(
    "Something thoughtful is on its way.",
  );
  await page.goto("/?uiFixture=error");
  await expect(
    page.getByRole("alert").filter({ hasText: "Catalog unavailable" }),
  ).toContainText("Catalog unavailable");
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "/",
  );
});

test("shared icon and status primitives retain accessible feedback and token styles", async ({
  page,
}) => {
  await mountSharedPrimitiveFixture(page);
  const button = page.getByRole("button", {
    name: "Fixture action",
    exact: true,
  });
  await expect(button).toBeEnabled();
  const style = await button.evaluate((element) => {
    const css = getComputedStyle(element);
    const icon = getComputedStyle(element.firstElementChild!);
    return {
      width: css.width,
      height: css.height,
      radius: css.borderRadius,
      iconWidth: icon.width,
      iconHeight: icon.height,
    };
  });
  expect(style).toEqual({
    width: "44px",
    height: "44px",
    radius: "9999px",
    iconWidth: "24px",
    iconHeight: "24px",
  });
  await page.keyboard.press("Tab");
  await button.focus();
  expect(
    await button.evaluate((element) => getComputedStyle(element).outlineWidth),
  ).toBe("2px");
  const busy = page.getByRole("button", { name: "Fixture busy action" });
  await expect(busy).toBeDisabled();
  await expect(busy).toHaveAttribute("aria-busy", "true");
  expect(
    await busy.evaluate((element) => getComputedStyle(element).cursor),
  ).toBe("wait");
  const host = page.locator("#shared-feedback-probe");
  for (const [text, state] of [
    ["Fixture loading", "loading"],
    ["Fixture empty", "empty"],
    ["Fixture error", "error"],
  ] as const) {
    const status = host.getByRole("status").filter({ hasText: text });
    await expect(status).toHaveAttribute("aria-live", "polite");
    await expect(status).toHaveAttribute("data-state", state);
    const css = await status.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        gap: style.gap,
        padding: style.padding,
        radius: style.borderRadius,
        border: style.borderTopColor,
      };
    });
    expect(css.gap).toBe("12px");
    expect(css.padding).toBe("24px");
    expect(css.radius).toBe("12px");
    if (state === "error") expect(css.border).toBe("rgb(163, 58, 80)");
    const cue = status.locator('[aria-hidden="true"]');
    expect(
      await cue.evaluate((element) => getComputedStyle(element).width),
    ).toBe("16px");
    if (state === "loading")
      expect(
        await cue.evaluate(
          (element) => getComputedStyle(element).borderRightColor,
        ),
      ).toBe("rgba(0, 0, 0, 0)");
  }
  const actionable = host.getByRole("alert");
  await expect(actionable).toHaveAttribute("aria-live", "assertive");
  await expect(
    actionable.getByRole("link", { name: "Fixture recovery" }),
  ).toHaveAttribute("href", "#shared-controls-probe");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    Number.parseFloat(
      await button.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test("shared text controls retain semantics, token styles, and invalid focus states", async ({
  page,
}) => {
  await mountSharedPrimitiveFixture(page);
  const input = page.getByRole("textbox", { name: "Fixture recipient" });
  const textarea = page.getByRole("textbox", { name: "Fixture message" });
  await expect(input).toHaveValue("Avery");
  await expect(input).toHaveAttribute("aria-required", "true");
  await expect(input).toHaveAccessibleDescription("Shown on the letter");
  await expect(textarea).toHaveAttribute("aria-invalid", "true");
  await expect(textarea).toHaveAccessibleDescription("A message is required");
  await expect(
    page.getByRole("alert").filter({ hasText: "A message is required" }),
  ).toBeVisible();
  await expect(page.getByText("0 / 2000", { exact: true })).toBeVisible();
  for (const control of [input, textarea]) {
    const style = await control.evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        minHeight: css.minHeight,
        padding: css.padding,
        radius: css.borderRadius,
        font: css.fontSize,
        background: css.backgroundColor,
      };
    });
    expect(Number.parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(style.padding).toBe("12px 16px");
    expect(style.radius).toBe("8px");
    expect(style.font).toBe("16px");
    expect(style.background).toBe("rgb(255, 253, 253)");
  }
  expect(
    await textarea.evaluate((element) => getComputedStyle(element).minHeight),
  ).toBe("128px");
  await textarea.hover();
  expect(
    await textarea.evaluate(
      (element) => getComputedStyle(element).borderTopColor,
    ),
  ).toBe("rgb(163, 58, 80)");
  await page.keyboard.press("Tab");
  await textarea.focus();
  const focus = await textarea.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      style: css.outlineStyle,
      width: css.outlineWidth,
      offset: css.outlineOffset,
    };
  });
  expect(focus).toEqual({ style: "solid", width: "2px", offset: "2px" });
  for (const name of ["Loading recipient", "Loading message"]) {
    const control = page.getByRole("textbox", { name });
    await expect(control).toBeDisabled();
    await expect(control).toHaveAttribute("aria-busy", "true");
    expect(
      await control.evaluate((element) => getComputedStyle(element).cursor),
    ).toBe("not-allowed");
  }
  const callerStyle = await page
    .getByRole("textbox", { name: "Caller styled recipient" })
    .evaluate((element) => {
      const css = getComputedStyle(element);
      return {
        padding: css.paddingLeft,
        font: css.fontSize,
        radius: css.borderRadius,
      };
    });
  expect(callerStyle).toEqual({ padding: "8px", font: "14px", radius: "12px" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    Number.parseFloat(
      await input.evaluate(
        (element) => getComputedStyle(element).transitionDuration,
      ),
    ),
  ).toBeLessThanOrEqual(0.001);
});

test("shared layout primitives resolve tokens in the production stylesheet", async ({
  page,
}) => {
  await mountSharedPrimitiveFixture(page);
  const container = page.locator("#shared-layout-probe");
  for (const [width, padding] of [
    [390, 24],
    [768, 28],
    [1024, 40],
    [1440, 40],
    [1920, 40],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await container.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      padding: getComputedStyle(element).paddingLeft,
    }));
    expect(metrics.padding).toBe(`${padding}px`);
    expect(metrics.width).toBe(Math.min(width, 1760));
  }
  const stack = page.locator("#shared-stack-probe");
  const stackStyle = await stack.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      display: style.display,
      direction: style.flexDirection,
      gap: style.gap,
      align: style.alignItems,
      justify: style.justifyContent,
      wrap: style.flexWrap,
    };
  });
  expect(stackStyle).toEqual({
    display: "flex",
    direction: "row",
    gap: "24px",
    align: "center",
    justify: "space-between",
    wrap: "wrap",
  });
  expect(
    await page
      .locator("#shared-content-probe")
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBe(720);
  expect(
    await page
      .locator("#shared-full-probe")
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBe(1760);
  for (const [index, pixels] of [4, 8, 12, 16, 24, 28, 40, 52, 72].entries()) {
    expect(
      await page
        .locator(`#shared-gap-${index + 1}`)
        .evaluate((element) => getComputedStyle(element).gap),
    ).toBe(`${pixels}px`);
  }
  await page
    .locator("#shared-layout-host")
    .evaluate((element) => element.remove());
});

test("keeps the hero action a keyboard reachable link at every layout width", async ({
  page,
}) => {
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const action = page.getByRole("link", { name: "Get started" });
    await expect(action).toHaveAttribute("href", "/sign-in");
    await expect(action).toBeVisible();
    await action.focus();
    await expect(action).toBeFocused();
    const style = await action.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        padding: computed.paddingLeft,
        radius: computed.borderRadius,
        fontSize: computed.fontSize,
        outline: computed.outlineStyle,
        nestedInteractive: element.querySelector("button, a") !== null,
      };
    });
    expect(style.height).toBeGreaterThanOrEqual(44);
    expect(style.padding).toBe("24px");
    expect(Number.parseFloat(style.radius)).toBeGreaterThanOrEqual(
      style.height / 2,
    );
    expect(Number.parseFloat(style.fontSize)).toBeCloseTo(12.48, 1);
    expect(style.outline).toBe("solid");
    expect(style.nestedInteractive).toBe(false);
  }
});

const compatibilitySurfaces = [
  {
    name: "editor",
    path: "../src/features/pages/editor/draft-editor.tsx",
    primitiveImport: "@repo/ui/button",
    preservedBoundary: "DraftEditor",
  },
  {
    name: "public template",
    path: "../src/features/pages/public/template-content.tsx",
    primitiveImport: "@repo/ui/status",
    preservedBoundary: "SecretLetterRenderer",
  },
] as const;

for (const surface of compatibilitySurfaces) {
  test(`AC-10 preserves the ${surface.name} boundary while importing a shared primitive`, async () => {
    const source = await readFile(
      new URL(surface.path, import.meta.url),
      "utf8",
    );

    expect(source).toContain(surface.primitiveImport);
    expect(source).toContain(surface.preservedBoundary);
    expect(source).not.toMatch(/@letterly\/database|@prisma\/client/u);
    expect(source).not.toMatch(
      /localStorage|sessionStorage|dangerouslySetInnerHTML/u,
    );
  });
}

test("AC-10 keeps the removed dashboard route on the template entry point", async () => {
  const source = await readFile(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain('redirect("/templates")');
  expect(source).not.toContain("DashboardHome");
  expect(source).not.toMatch(/@letterly\/database|@prisma\/client/u);
  expect(source).not.toMatch(
    /localStorage|sessionStorage|dangerouslySetInnerHTML/u,
  );
});
