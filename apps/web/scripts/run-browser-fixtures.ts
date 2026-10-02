import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const env = {
  ...process.env,
  APP_ORIGIN: "http://127.0.0.1:3100",
  API_ORIGIN: "http://127.0.0.1:3002",
  LETTERLY_UI_TEST_FIXTURES: "1",
};

const build = spawnSync(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "build"],
  {
    env,
    stdio: "inherit",
  },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const tests = spawnSync(
  process.execPath,
  [
    require.resolve("@playwright/test/cli"),
    "test",
    "--config",
    "playwright.fixtures.config.ts",
    ...process.argv.slice(2),
  ],
  { env, stdio: "inherit" },
);
if (tests.error) throw tests.error;
process.exit(tests.status ?? 1);
