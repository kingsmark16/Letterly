import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

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
