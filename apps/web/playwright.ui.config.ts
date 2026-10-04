import { defineConfig } from "@playwright/test";
import fixtureConfig from "./playwright.fixtures.config";

export default defineConfig({
  ...fixtureConfig,
  testMatch: [
    "**/image-editor.spec.ts",
    "**/auth-recovery-hydration.spec.ts",
    "**/auth-sign-in.spec.ts",
    "**/admin-confirmation.spec.ts",
    "**/landing-foundation.spec.ts",
    "**/native-dialog.spec.ts",
    "**/legal-dialog.spec.ts",
    "**/editor-navigation.spec.ts",
    "**/editor-controls.spec.ts",
  ],
  projects: (["chromium", "firefox", "webkit"] as const).flatMap(
    (browserName) =>
      ([390, 1440] as const).map((width) => ({
        name: `${browserName}-${width}`,
        use: { browserName, viewport: { width, height: 900 } },
      })),
  ),
});
