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
