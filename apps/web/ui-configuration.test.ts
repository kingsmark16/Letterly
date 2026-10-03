import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";

const globals = readFileSync(
  new URL("./app/globals.css", import.meta.url),
  "utf8",
);
const tokens = readFileSync(
  new URL("../../packages/ui/src/tokens.css", import.meta.url),
  "utf8",
);

test("responsive variants stay aligned with canonical breakpoint tokens", () => {
  for (const name of ["tablet", "desktop", "wide"]) {
    const token = tokens.match(
      new RegExp(`--letterly-breakpoint-${name}:\\s*([^;]+);`, "u"),
    );
    const variant = globals.match(
      new RegExp(
        `@custom-variant ${name} \\(@media \\(min-width:\\s*([^\\)]+)\\)\\);`,
        "u",
      ),
    );
    assert.ok(token, `Missing ${name} token`);
    assert.ok(variant, `Missing ${name} variant`);
    assert.equal(variant[1]?.trim(), token[1]?.trim());
    if (name === "tablet") {
      const dialog = readFileSync(
        new URL("../../packages/ui/src/dialog.tsx", import.meta.url),
        "utf8",
      );
      assert.ok(dialog.includes(`[@media(max-width:${token[1]?.trim()})]`));
    }
  }
});

test("shared motion and target utilities read canonical tokens", () => {
  for (const name of ["fast", "standard", "slow"]) {
    assert.match(
      globals,
      new RegExp(
        `@utility duration-${name}\\s*\\{\\s*transition-duration: var\\(--letterly-motion-${name}\\);\\s*\\}`,
        "u",
      ),
    );
  }
  assert.match(
    globals,
    /@utility min-h-target\s*\{\s*min-height: var\(--letterly-target-min\);\s*\}/u,
  );
  assert.match(globals, /@source "\.\.\/\.\.\/\.\.\/packages\/ui\/src";/u);
});

test("source generator settings share the package owner and real stylesheet", () => {
  type SourceConfig = {
    style: string;
    rsc: boolean;
    tsx: boolean;
    tailwind: {
      config: string;
      css: string;
      baseColor: string;
      cssVariables: boolean;
    };
    aliases: { ui: string; utils: string };
  };
  const web = JSON.parse(
    readFileSync(new URL("./components.json", import.meta.url), "utf8"),
  ) as SourceConfig;
  const uiUrl = new URL("../../packages/ui/components.json", import.meta.url);
  const ui = JSON.parse(readFileSync(uiUrl, "utf8")) as SourceConfig;
  assert.equal(ui.style, web.style);
  assert.equal(ui.tailwind.baseColor, web.tailwind.baseColor);
  for (const config of [web, ui]) {
    assert.equal(config.rsc, true);
    assert.equal(config.tsx, true);
    assert.equal(config.tailwind.config, "");
    assert.equal(config.tailwind.cssVariables, true);
    assert.equal(config.aliases.ui, "@repo/ui");
    assert.equal(config.aliases.utils, "@repo/ui/lib/utils");
  }
  assert.equal(
    new URL(ui.tailwind.css, uiUrl).href,
    new URL(web.tailwind.css, new URL("./components.json", import.meta.url))
      .href,
  );
  assert.ok(existsSync(new URL(ui.tailwind.css, uiUrl)));
});

test("shadcn semantic aliases reference the existing Letterly values", () => {
  const colors = {
    background: "canvas",
    foreground: "ink",
    card: "surface",
    "card-foreground": "ink",
    popover: "surface",
    "popover-foreground": "ink",
    primary: "wine",
    "primary-foreground": "surface",
    "primary-hover": "wine-hover",
    secondary: "surface-muted",
    "secondary-foreground": "ink",
    muted: "surface-muted",
    "muted-foreground": "ink-muted",
    accent: "rose",
    "accent-foreground": "ink",
    destructive: "error",
    "destructive-foreground": "surface",
    border: "border",
    input: "border",
    ring: "focus",
  };
  for (const [name, token] of Object.entries(colors)) {
    assert.ok(
      globals.includes(`--color-${name}: var(--letterly-color-${token});`),
      name,
    );
  }
  for (const [name, token] of Object.entries({
    sm: "small",
    md: "medium",
    lg: "large",
    full: "round",
  })) {
    assert.ok(
      globals.includes(`--radius-${name}: var(--letterly-radius-${token});`),
      name,
    );
  }
  for (const [name, token] of Object.entries({ sm: "low", md: "medium" })) {
    assert.ok(
      globals.includes(`--shadow-${name}: var(--letterly-shadow-${token});`),
      name,
    );
  }
});
