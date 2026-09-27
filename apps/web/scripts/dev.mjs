/* global process */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultApiOrigin = "http://localhost:3001";
const apiStartupTimeoutMs = 60_000;
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
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForApi(url) {
  const deadline = Date.now() + apiStartupTimeoutMs;

  console.log(`Waiting for the API at ${url.origin} to become ready.`);

  while (Date.now() < deadline) {
    if (await isApiReady(url)) {
      console.log("The API is ready. Starting Next.js.");
      return;
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

async function main() {
  const apiHealthUrl = getApiHealthUrl();
  await waitForApi(apiHealthUrl);
  process.exitCode = await startNextDev();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
