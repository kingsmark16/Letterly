import { defineConfig } from "@playwright/test";
import fixtureConfig from "./playwright.fixtures.config";
import type { ZoomOptions } from "./e2e/support/browser-zoom";

export default defineConfig<ZoomOptions>({
  ...fixtureConfig,
  workers: 2,
  preserveOutput: "always",
  testMatch: "**/browser-zoom.spec.ts",
  projects: [656, 1456].map((zoomWindowWidth) => ({
    name: `chromium-zoom-${zoomWindowWidth}`,
    use: { browserName: "chromium", zoomWindowWidth },
  })),
});
