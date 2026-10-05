import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const fixtureApiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:3002";
const fixtureAppOrigin = process.env.APP_ORIGIN ?? "http://127.0.0.1:3100";
const fixtureAppPort = new URL(fixtureAppOrigin).port || "3100";

export default defineConfig({
  ...baseConfig,
  workers: 2,
  use: {
    ...baseConfig.use,
    baseURL: fixtureAppOrigin,
  },
  testMatch: [
    "**/landing-link-composition.spec.ts",
    "**/shared-link-composition.spec.ts",
    "**/image-editor.spec.ts",
    "**/auth-recovery-hydration.spec.ts",
    "**/auth-sign-in.spec.ts",
    "**/admin-confirmation.spec.ts",
    "**/landing-foundation.spec.ts",
    "**/workspace-navigation.spec.ts",
    "**/authenticated-draft-loop.spec.ts",
    "**/choose-your-heart-editor.spec.ts",
    "**/public-journey-adapter.spec.ts",
    "**/web-template-registration.spec.ts",
    "**/visitor-responses.spec.ts",
    "**/design-system-compatibility.spec.ts",
    "**/shared-ui-accessibility.spec.ts",
    "**/youtube-player-accessibility.spec.ts",
    "**/page-list-transport.spec.ts",
    "**/ui-performance.spec.ts",
    "**/legal-dialog.spec.ts",
    "**/editor-navigation.spec.ts",
    "**/editor-controls.spec.ts",
  ],
  webServer: [
    {
      command: "node --import tsx scripts/browser-catalog-fixture.ts",
      url: new URL("/health", fixtureApiOrigin).toString(),
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `pnpm exec next start --hostname 127.0.0.1 --port ${fixtureAppPort}`,
      url: fixtureAppOrigin,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        APP_ORIGIN: fixtureAppOrigin,
        API_ORIGIN: fixtureApiOrigin,
        LETTERLY_UI_TEST_FIXTURES: "1",
      },
    },
  ],
});
