import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const fixtureDistDir = `.next-fixtures-${randomUUID()}`;
const webRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixtureDistPath = resolve(webRoot, fixtureDistDir);

if (
  dirname(fixtureDistPath) !== webRoot ||
  basename(fixtureDistPath) !== fixtureDistDir
) {
  throw new Error("The browser fixture build directory must stay in apps/web.");
}

const env = {
  ...process.env,
  APP_ORIGIN: process.env.APP_ORIGIN ?? "http://127.0.0.1:3100",
  API_ORIGIN: process.env.API_ORIGIN ?? "http://127.0.0.1:3002",
  LETTERLY_NEXT_DIST_DIR: fixtureDistDir,
  LETTERLY_UI_TEST_FIXTURES: "1",
};

try {
  const build = spawnSync(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "build"],
    {
      env,
      stdio: "inherit",
    },
  );
  if (build.error) throw build.error;

  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
  } else {
    const testArgs = process.argv.slice(2);
    const configArgs = testArgs.some(
      (argument) => argument === "--config" || argument.startsWith("--config="),
    )
      ? []
      : ["--config", "playwright.fixtures.config.ts"];
    const tests = spawnSync(
      process.execPath,
      [
        require.resolve("@playwright/test/cli"),
        "test",
        ...configArgs,
        ...testArgs,
      ],
      { env, stdio: "inherit" },
    );
    if (tests.error) throw tests.error;
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(fixtureDistPath, { recursive: true, force: true });
}
