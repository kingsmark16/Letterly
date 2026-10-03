import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  workers: 2,
  testMatch: [
    "**/workspace-navigation.spec.ts",
    "**/authenticated-draft-loop.spec.ts",
    "**/choose-your-heart-editor.spec.ts",
    "**/public-journey-adapter.spec.ts",
    "**/web-template-registration.spec.ts",
    "**/visitor-responses.spec.ts",
    "**/design-system-compatibility.spec.ts",
    "**/page-list-transport.spec.ts",
    "**/ui-performance.spec.ts",
  ],
  webServer: [
    {
      command: "node --import tsx scripts/browser-catalog-fixture.ts",
      url: "http://127.0.0.1:3002/health",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "pnpm exec next start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        APP_ORIGIN: "http://127.0.0.1:3100",
        API_ORIGIN: "http://127.0.0.1:3002",
        LETTERLY_UI_TEST_FIXTURES: "1",
      },
    },
  ],
});
