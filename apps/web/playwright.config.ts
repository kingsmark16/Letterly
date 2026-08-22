import { defineConfig, devices } from "@playwright/test";

// eslint-disable-next-line turbo/no-undeclared-env-vars
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const chromiumLaunchOptions = chromiumExecutablePath
  ? { executablePath: chromiumExecutablePath }
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: chromiumLaunchOptions,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api start",
      url: "http://127.0.0.1:3001/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "pnpm --filter web exec next start --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        APP_ORIGIN: "http://127.0.0.1:3100",
        API_ORIGIN: "http://127.0.0.1:3001",
        LETTERLY_UI_TEST_FIXTURES: "1",
      },
    },
  ],
});
