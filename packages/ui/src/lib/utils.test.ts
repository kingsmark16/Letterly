import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("shared utility class composition", () => {
  it("lets caller padding, background, and radius utilities win", () => {
    expect(
      cn("p-5 bg-surface rounded-medium", "p-2 bg-wine rounded-full"),
    ).toBe("p-2 bg-wine rounded-full");
  });

  it("keeps semantic typography separate from text color", () => {
    expect(cn("text-small text-ink", "text-wine")).toBe("text-small text-wine");
    expect(cn("text-heading-3 text-wine", "text-body")).toBe(
      "text-wine text-body",
    );
  });

  it("replaces token-backed target, motion, and shadow utilities", () => {
    expect(
      cn(
        "min-h-target duration-fast shadow-low",
        "min-h-11 duration-200 shadow-none",
      ),
    ).toBe("min-h-11 duration-200 shadow-none");
  });

  it("replaces semantic font sizes with caller sizes", () => {
    expect(cn("text-small", "text-[0.78rem]")).toBe("text-[0.78rem]");
  });

  it("merges conditions and retains CSS module classes", () => {
    expect(
      cn("p-5", false, undefined, { editor_card_abc: true }, ["p-2"]),
    ).toBe("editor_card_abc p-2");
  });

  it("keeps responsive and state overrides scoped to their modifier", () => {
    expect(cn("p-5 sm:p-3 hover:bg-wine", "sm:p-4 hover:bg-surface")).toBe(
      "p-5 sm:p-4 hover:bg-surface",
    );
  });

  it("keeps important overrides and normal styles in separate groups", () => {
    expect(cn("px-5 !px-3", "!px-4")).toBe("px-5 !px-4");
  });
});
