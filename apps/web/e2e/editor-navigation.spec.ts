import { expect, test } from "@playwright/test";
import { ownerPage, pageId } from "./fixtures/owner-page";
import { installOwnerEditorRoutes } from "./support/owner-editor";

test.beforeEach(async ({ page }) => {
  await installOwnerEditorRoutes(page);
});

test("editor sections fill the available desktop workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);

  const nav = page.getByRole("navigation", {
    name: "Letter editor",
    exact: true,
  });
  await expect(nav).toBeVisible();
  const editor = page.locator("[data-editor-section]");
  const sections = [
    ["Write", "content"],
    ["Review & share", "overview"],
    ["Preview", "preview"],
    ["Settings", "settings"],
  ] as const;

  for (const [label, section] of sections) {
    const tab = nav.getByRole("tab", { name: label, exact: true });
    if (section !== "content") await tab.click();
    await expect(editor).toHaveAttribute("data-editor-section", section);

    const dimensions = await editor.evaluate((editorElement) => {
      const workspace = editorElement.parentElement?.parentElement;
      return {
        editorWidth: editorElement.getBoundingClientRect().width,
        workspaceWidth: workspace?.getBoundingClientRect().width ?? 0,
      };
    });

    expect(dimensions.workspaceWidth).toBeGreaterThan(1500);
    expect(dimensions.editorWidth).toBeGreaterThan(
      dimensions.workspaceWidth * 0.95,
    );
  }
});

test("editor navigation preserves control styles, breakpoints, keyboard and reduced motion", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/dashboard/pages/${pageId}/edit`);
  const canHover = await page.evaluate(
    () => matchMedia("(hover: hover)").matches,
  );
  const nav = page.getByRole("navigation", {
    name: "Letter editor",
    exact: true,
    includeHidden: true,
  });
  await expect(nav).toBeVisible();
  for (const width of [320, 896, 897, 1152, 1153, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const trigger = nav.getByRole("button", { name: "Open editor sections" });
    const preview = nav.getByRole("tab", { name: "Preview", exact: true });
    if (width <= 896) {
      await expect(preview).toBeHidden();
      await expect(trigger).toBeVisible();
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("menu")).toBeVisible();
      await expect(
        nav.getByRole("button", {
          name: "Open editor sections",
          includeHidden: true,
        }),
      ).toHaveCSS("background-color", "rgb(248, 232, 238)");
      await page
        .getByRole("menuitem", { name: "Settings", exact: true })
        .click();
      await expect(trigger).toBeFocused();
      await expect(page).toHaveURL(/section=settings/u);
      await trigger.press("Enter");
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      const bounds = await trigger.boundingBox();
      expect(bounds?.height).toBe(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
      await expect(trigger).toHaveCSS("border-top-width", "1px");
      await expect(trigger).toHaveCSS("border-radius", "999px");
    } else {
      await expect(trigger).toBeHidden();
      await expect(preview).toBeVisible();
      await preview.click();
      await expect(preview).toHaveAttribute("aria-selected", "true");
      await expect(preview).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(preview).toHaveCSS(
        "background-image",
        canHover
          ? "linear-gradient(rgb(152, 44, 79), rgb(113, 27, 56))"
          : "linear-gradient(rgb(165, 50, 86), rgb(125, 33, 63))",
      );
      await expect(preview).toHaveCSS(
        "font-size",
        width <= 1152 ? "13px" : "14px",
      );
      await expect(preview).toHaveCSS(
        "padding-inline-start",
        width <= 1152 ? "10px" : "14px",
      );
      await expect(preview).toHaveCSS("gap", width <= 1152 ? "7px" : "9px");
      const bounds = await preview.boundingBox();
      expect(bounds?.height).toBe(46);
      await preview.press("Home");
      const write = nav.getByRole("tab", { name: "Write", exact: true });
      await expect(write).toBeFocused();
      await expect(write).toHaveAttribute("aria-selected", "true");
      await write.press("End");
      const settings = nav.getByRole("tab", { name: "Settings", exact: true });
      await expect(settings).toBeFocused();
      await page.keyboard.press("Tab");
      await settings.focus();
      await expect(settings).toBeFocused();
      await expect(settings).toHaveCSS("outline-style", "solid");
      await expect(settings).toHaveCSS("outline-width", "2px");
      await expect(settings).toHaveCSS("outline-offset", "-3px");
      await preview.hover();
      await expect(preview).toHaveCSS(
        "background-color",
        canHover ? "rgb(248, 232, 238)" : "rgba(0, 0, 0, 0)",
      );
      await expect(preview).toHaveCSS(
        "color",
        canHover ? "rgb(132, 38, 71)" : "rgb(105, 92, 108)",
      );
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const write = nav.getByRole("tab", { name: "Write", exact: true });
  await expect(write).toHaveCSS("transition-property", "none");
  await write.hover();
  await page.mouse.down();
  await expect(write).toHaveCSS("transform", "none");
  await page.mouse.up();
  await page.setViewportSize({ width: 390, height: 900 });
  const trigger = nav.getByRole("button", { name: "Open editor sections" });
  await expect(trigger).toHaveCSS("transition-property", "none");
  await trigger.hover();
  await page.mouse.down();
  await expect(
    nav.getByRole("button", {
      name: "Open editor sections",
      includeHidden: true,
    }),
  ).toHaveCSS("transform", "none");
  await page.mouse.up();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});

test("response navigation retains published section links and mobile routing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(`**/api/v1/pages/${pageId}`, (route) =>
    route.fulfill({
      status: 200,
      json: {
        ...ownerPage(
          1,
          "Avery",
          "A message worth keeping.",
          "2026-08-20T00:05:00.000Z",
        ),
        status: "PUBLISHED",
        canonicalUrl: "http://127.0.0.1:3100/p/draft-test",
      },
    }),
  );
  await page.setViewportSize({ width: 1153, height: 900 });
  await page.goto(`/dashboard/pages/${pageId}/responses`);
  const canHover = await page.evaluate(
    () => matchMedia("(hover: hover)").matches,
  );
  const nav = page.getByRole("navigation", {
    name: "Letter sections",
    exact: true,
  });
  const overview = nav.getByRole("link", { name: "Overview", exact: true });
  await expect(overview).toHaveAttribute("aria-current", "location");
  await expect(overview).toHaveCSS("color", "rgb(255, 255, 255)");
  const write = nav.getByRole("link", { name: "Write", exact: true });
  await expect(write).toHaveAttribute(
    "href",
    `/dashboard/pages/${pageId}/edit?section=content`,
  );
  await expect(write).toHaveCSS("color", "rgb(105, 92, 108)");
  await write.hover();
  await expect(write).toHaveCSS(
    "color",
    canHover ? "rgb(132, 38, 71)" : "rgb(105, 92, 108)",
  );
  await expect(write).toHaveCSS(
    "background-color",
    canHover ? "rgb(248, 232, 238)" : "rgba(0, 0, 0, 0)",
  );
  await page.setViewportSize({ width: 896, height: 900 });
  const trigger = nav.getByRole("button", { name: "Open letter sections" });
  await trigger.click();
  const settings = page.getByRole("menuitem", {
    name: "Settings",
    exact: true,
  });
  await expect(settings).toHaveAttribute(
    "href",
    `/dashboard/pages/${pageId}/edit?section=settings`,
  );
  await settings.click();
  await expect(page).toHaveURL(
    new RegExp(`/dashboard/pages/${pageId}/edit\\?section=settings$`, "u"),
  );
  await expect(page.locator("[data-editor-section]")).toHaveAttribute(
    "data-editor-section",
    "settings",
  );
  expect(errors).toEqual([]);
});
