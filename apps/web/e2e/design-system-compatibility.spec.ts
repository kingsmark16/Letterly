import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mountSharedPrimitiveFixture } from "./support/shared-primitive-fixture";
import { adminPageId, adminReportId } from "./fixtures/admin-moderation";

test("shared native dialog resolves desktop and inclusive compact layout styles", async ({
  page,
}) => {
  await mountSharedPrimitiveFixture(page);
  const dialog = page.locator("#shared-dialog-probe");
  await dialog.evaluate((element) =>
    (element as HTMLDialogElement).showModal(),
  );
  await expect(dialog).toHaveAccessibleName("Fixture dialog");
  await expect(dialog).toHaveAccessibleDescription(
    "Fixture dialog description",
  );
  for (const width of [390, 768, 769, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const style = await dialog.evaluate((element) => {
      const css = getComputedStyle(element);
      const shell = getComputedStyle(element.firstElementChild!);
      const title = getComputedStyle(element.querySelector("h2")!);
      return {
        width: element.getBoundingClientRect().width,
        maxHeight: css.maxHeight,
        radius: css.borderRadius,
        border: css.borderTopWidth,
        padding: shell.padding,
        gap: shell.gap,
        titleSize: title.fontSize,
        backdrop: getComputedStyle(element, "::backdrop").backgroundColor,
      };
    });
    expect(style.width).toBeCloseTo(
      width <= 768 ? width : Math.min(768, width - 28),
      0,
    );
    expect(style.maxHeight).toBe(width <= 768 ? "900px" : "872px");
    expect(style.radius).toBe(width <= 768 ? "0px" : "16px");
    expect(style.border).toBe(width <= 768 ? "0px" : "1px");
    expect(style.padding).toBe(width <= 768 ? "24px" : "28px");
    expect(style.gap).toBe("24px");
    expect(style.titleSize).toBe("32px");
    expect(style.backdrop).toBe("rgba(50, 28, 37, 0.38)");
  }
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  await dialog.evaluate((element) => (element as HTMLDialogElement).close());
});

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

test("admin action buttons keep shared variants, focus, and target size", async ({
  page,
}) => {
  await mountSharedPrimitiveFixture(page);
  const actions = page.getByRole("region", { name: "Administrator actions" });
  const primary = actions.getByRole("button", {
    name: "Mark reviewed",
    exact: true,
  });
  const secondary = actions.getByRole("button", {
    name: "Dismiss",
    exact: true,
  });
  const tertiary = actions.getByRole("button", {
    name: "Try again",
    exact: true,
  });
  const disabled = actions.getByRole("button", {
    name: "Restore creator",
    exact: true,
  });
  const administratorId = actions.getByRole("textbox", {
    name: "Administrator ID",
  });

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const button of [primary, secondary, tertiary]) {
      await expect(button).toBeVisible();
      const height = await button.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      expect(height).toBeGreaterThanOrEqual(44);
    }
    await expect(disabled).toBeDisabled();
    await expect(administratorId).toHaveValue("admin-fixture");
    const inputHeight = await administratorId.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(inputHeight).toBeGreaterThanOrEqual(44);
  }

  await primary.focus();
  await expect(primary).toBeFocused();
  await expect(primary).toHaveCSS("outline-style", "solid");
  await administratorId.focus();
  await expect(administratorId).toBeFocused();
  await expect(administratorId).toHaveCSS("outline-style", "solid");
});

test("admin sources retain shared control usage", async () => {
  for (const [file, component] of [
    ["admin-report-console.tsx", "AdminReportConsole"],
    ["admin-audit-console.tsx", "AdminAuditConsole"],
  ] as const) {
    const source = await readFile(
      new URL(`../src/features/admin/${file}`, import.meta.url),
      "utf8",
    );
    expect(source).toContain('import { Button } from "@repo/ui/button";');
    expect(source).toContain('import { Input } from "@repo/ui/input";');
    expect(source).toMatch(/<Button\b/u);
    expect(source).toMatch(/<Input\b/u);
    expect(source).toContain(`export function ${component}`);
  }
});

test("the report console renders shared controls and restores dialog focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/moderation/reports");

  await expect(
    page.getByRole("heading", { name: "Report queue" }),
  ).toBeVisible();
  const pageId = page.getByRole("textbox", { name: "Page ID" });
  const applyFilter = page.getByRole("button", {
    name: "Apply",
    exact: true,
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(pageId).toBeVisible();
    await expect(applyFilter).toBeVisible();
    expect(
      await pageId.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await applyFilter.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.locator("html").evaluate((element) => element.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }

  await pageId.focus();
  await expect(pageId).toBeFocused();
  await expect(pageId).toHaveCSS("outline-style", "solid");

  const report = page
    .getByRole("list", { name: "Reports" })
    .getByRole("button");
  await expect(report).toContainText("Spam");
  await report.click();
  await expect(page).toHaveURL(new RegExp(`report=${adminReportId}`));
  await expect(
    page.getByText("Synthetic report note for the administrator fixture."),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic private page content must not render.", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Synthetic private visitor response must not render.", {
      exact: true,
    }),
  ).toHaveCount(0);

  const markReviewed = page.getByRole("button", {
    name: "Mark reviewed",
    exact: true,
  });
  await expect(markReviewed).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(markReviewed).toBeFocused();
  await expect(markReviewed).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Enter");

  const confirmation = page.getByRole("dialog", { name: "Review report" });
  await expect(confirmation).toBeVisible();
  const reason = confirmation.getByLabel("Reason");
  await expect(reason).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    confirmation.getByRole("button", { name: "Confirm action" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(reason).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(confirmation).toHaveCount(0);
  await expect(markReviewed).toBeFocused();
});

test("the audit console applies URL backed filters through shared controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/moderation/audit");

  await expect(
    page.getByRole("heading", { name: "Audit history" }),
  ).toBeVisible();
  const targetId = page.getByRole("textbox", { name: "Target ID" });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(targetId).toBeVisible();
    expect(
      await targetId.evaluate(
        (element) => element.getBoundingClientRect().height,
      ),
    ).toBeGreaterThanOrEqual(44);
    expect(
      await page.locator("html").evaluate((element) => element.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }

  await targetId.focus();
  await expect(targetId).toBeFocused();
  await expect(targetId).toHaveCSS("outline-style", "solid");
  await expect(page.getByText("Report Created", { exact: true })).toBeVisible();
  await targetId.fill(adminPageId);
  await page.getByRole("button", { name: "Apply target filter" }).click();

  await expect(page).toHaveURL(new RegExp(`targetId=${adminPageId}`));
  await expect(page.getByText("Page Disabled", { exact: true })).toBeVisible();
  await expect(page.getByText("Report Created", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/targetId=/u);
  await expect(page.getByText("Report Created", { exact: true })).toBeVisible();
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
