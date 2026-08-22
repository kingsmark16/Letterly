import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const compatibilitySurfaces = [
  {
    name: "dashboard",
    path: "../app/dashboard/page.tsx",
    primitiveImport: "@repo/ui/status",
    preservedBoundary: "DraftDashboard",
  },
  {
    name: "editor",
    path: "../src/features/pages/components/draft-editor.tsx",
    primitiveImport: "@repo/ui/button",
    preservedBoundary: "DraftEditor",
  },
  {
    name: "public template",
    path: "../app/p/[slug]/page.tsx",
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
