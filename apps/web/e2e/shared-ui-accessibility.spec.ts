import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { uiPerformanceSurfaces } from "./support/ui-performance-surfaces";

const wcagAaTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const maxMotionWaitMs = 2500;

async function waitForFiniteMotion(page: Page): Promise<void> {
  await page.evaluate(async (motionWaitMs) => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const finiteAnimations = document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return (
        timing !== undefined &&
        Number.isFinite(timing.endTime) &&
        animation.playState === "running"
      );
    });
    await Promise.race([
      Promise.all(
        finiteAnimations.map((animation) =>
          animation.finished.catch(() => undefined),
        ),
      ).then(() => undefined),
      new Promise<void>((resolve) => window.setTimeout(resolve, motionWaitMs)),
    ]);
  }, maxMotionWaitMs);
}

for (const surface of uiPerformanceSurfaces) {
  test(`shared UI WCAG audit covers ${surface.name}`, async ({
    page,
  }, testInfo) => {
    await surface.prepare?.(page);
    await page.goto(surface.path);
    await surface.exercise(page);

    if (surface.name === "preview-secret-letter") {
      const firstChoice = page.locator("[data-choice-card]").first();
      await firstChoice.scrollIntoViewIfNeeded();
      await expect(firstChoice).toBeInViewport();
    }

    await waitForFiniteMotion(page);
    const results = await new AxeBuilder({ page })
      .withTags(wcagAaTags)
      .analyze();
    const report = {
      surface: surface.name,
      url: page.url(),
      browserProfile: testInfo.project.name,
      violations: results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
      incomplete: results.incomplete.map((rule) => ({
        id: rule.id,
        impact: rule.impact,
        help: rule.help,
        nodes: rule.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    };
    await testInfo.attach("axe-wcag-aa.json", {
      body: JSON.stringify(report, null, 2),
      contentType: "application/json",
    });

    const summary = report.violations
      .map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.help}\n${violation.nodes
            .map((node) => `  ${node.target.join(" ")}: ${node.summary ?? ""}`)
            .join("\n")}`,
      )
      .join("\n");
    expect(report.violations, summary).toEqual([]);
  });
}
