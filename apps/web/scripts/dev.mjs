/* global process */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const defaultApiOrigin = "http://localhost:3001";
const parsedTimeout = Number.parseInt(
  process.env.API_STARTUP_TIMEOUT_MS ?? "",
  10,
);
const apiStartupTimeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 120_000;
const apiRequestTimeoutMs = 1_000;
const apiPollIntervalMs = 250;

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getApiHealthUrl() {
  const apiOrigin = process.env.API_ORIGIN?.trim() || defaultApiOrigin;

  try {
    return new URL("/health", apiOrigin);
  } catch {
    throw new Error(`API_ORIGIN is not a valid URL: ${apiOrigin}`);
  }
}

async function isApiReady(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiRequestTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    if (url.hostname === "localhost") {
      try {
        const fallbackUrl = new URL(url.toString());
        fallbackUrl.hostname = "127.0.0.1";
        const fallbackController = new AbortController();
        const fallbackTimeout = setTimeout(
          () => fallbackController.abort(),
          apiRequestTimeoutMs,
        );
        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            signal: fallbackController.signal,
          });
          return fallbackResponse.ok;
        } finally {
          clearTimeout(fallbackTimeout);
        }
      } catch {
        return false;
      }
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForApi(url) {
  const startTime = Date.now();
  const deadline = startTime + apiStartupTimeoutMs;
  let lastReportedSeconds = 0;

  console.log(`Waiting for the API at ${url.origin} to become ready.`);

  while (Date.now() < deadline) {
    if (await isApiReady(url)) {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      console.log(
        `The API is ready after ${elapsedSeconds}s. Starting Next.js.`,
      );
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (elapsedSeconds >= lastReportedSeconds + 10) {
      lastReportedSeconds = elapsedSeconds;
      console.log(
        `Still waiting for the API at ${url.origin} (${elapsedSeconds}s elapsed)...`,
      );
    }

    await sleep(apiPollIntervalMs);
  }

  throw new Error(
    `The API did not become ready at ${url.origin} within ${apiStartupTimeoutMs} ms. Start it with pnpm --filter api dev, or run pnpm dev from the repository root.`,
  );
}

function startNextDev() {
  const nextCliPath = fileURLToPath(
    new URL("../node_modules/next/dist/bin/next", import.meta.url),
  );
  const nextProcess = spawn(
    process.execPath,
    [nextCliPath, "dev", "--port", "3000"],
    {
      env: process.env,
      stdio: "inherit",
    },
  );

  return new Promise((resolve, reject) => {
    const forwardSignal = (signal) => {
      if (!nextProcess.killed) {
        nextProcess.kill(signal);
      }
    };

    const cleanup = () => {
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
    };

    const onInterrupt = () => forwardSignal("SIGINT");
    const onTerminate = () => forwardSignal("SIGTERM");

    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onTerminate);

    nextProcess.once("error", (error) => {
      cleanup();
      reject(error);
    });

    nextProcess.once("exit", (code, signal) => {
      cleanup();
      resolve(signal ? 1 : (code ?? 1));
    });
  });
}

async function cleanStaleTurbopackArtifacts() {
  const staleAppPageDir = fileURLToPath(
    new URL("../.next/dev/server/app/page", import.meta.url),
  );

  try {
    const stat = await fs.stat(staleAppPageDir);
    if (stat.isDirectory()) {
      await fs.rm(staleAppPageDir, { recursive: true, force: true });
    }
  } catch {
    // Expected when no stale directory exists.
  }
}

async function main() {
  const apiHealthUrl = getApiHealthUrl();
  await waitForApi(apiHealthUrl);
  await cleanStaleTurbopackArtifacts();
  process.exitCode = await startNextDev();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
