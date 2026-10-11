import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const compatibilitySurfaces = [
  {
    name: "editor",
    path: "./editor/draft-editor.tsx",
    primitiveImport: "@repo/ui/button",
    preservedBoundary: "DraftEditor",
  },
  {
    name: "public template",
    path: "./public/secret-letter-presentation.tsx",
    primitiveImport: "@repo/ui/status",
    preservedBoundary: "SecretLetterPresentation",
  },
] as const;

for (const surface of compatibilitySurfaces) {
  test(`AC-10 keeps the ${surface.name} boundary on a shared primitive`, () => {
    const source = readFileSync(new URL(surface.path, import.meta.url), "utf8");

    assert.ok(source.includes(surface.primitiveImport));
    assert.ok(source.includes(surface.preservedBoundary));
    assert.doesNotMatch(source, /@letterly\/database|@prisma\/client/u);
    assert.doesNotMatch(
      source,
      /localStorage|sessionStorage|dangerouslySetInnerHTML/u,
    );
  });
}
