import { chromium, test as base, type Page } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

export interface ZoomOptions {
  zoomWindowWidth: number;
}

interface Geometry {
  width: number;
  height: number;
  dpr: number;
  cssZoom: string;
}

export interface ZoomFixtures {
  actualZoom: (
    page: Page,
  ) => Promise<{ factor: number; before: Geometry; after: Geometry }>;
}

async function removeOwnedProfile(
  owned: string,
  temporaryRoot: string,
): Promise<void> {
  if (
    dirname(owned) !== temporaryRoot ||
    !basename(owned).startsWith("letterly-browser-zoom-")
  ) {
    throw new Error("Invalid browser zoom cleanup path");
  }
  await rm(owned, { recursive: true, force: true });
}

export const test = base.extend<ZoomOptions & ZoomFixtures>({
  zoomWindowWidth: [1456, { option: true }],
  context: async ({ baseURL, zoomWindowWidth }, provide) => {
    if (
      !baseURL ||
      !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
    ) {
      throw new Error("Browser zoom fixtures require a localhost application");
    }
    const temporaryRoot = await realpath(tmpdir());
    const owned = await mkdtemp(join(temporaryRoot, "letterly-browser-zoom-"));
    const extension = join(owned, "extension");
    try {
      await mkdir(extension);
      await writeFile(
        join(extension, "manifest.json"),
        JSON.stringify({
          manifest_version: 3,
          name: "Letterly local zoom verification",
          version: "1.0",
          host_permissions: ["http://127.0.0.1/*", "http://localhost/*"],
          background: { service_worker: "worker.js" },
        }),
      );
      await writeFile(
        join(extension, "worker.js"),
        "chrome.runtime.onInstalled.addListener(() => {});",
      );
      const context = await chromium.launchPersistentContext(
        join(owned, "profile"),
        {
          channel: "chromium",
          headless: true,
          viewport: null,
          baseURL,
          reducedMotion: "reduce",
          args: [
            `--window-size=${zoomWindowWidth},1000`,
            `--disable-extensions-except=${extension}`,
            `--load-extension=${extension}`,
          ],
        },
      );
      try {
        await provide(context);
      } finally {
        await context.close();
      }
    } finally {
      await removeOwnedProfile(owned, temporaryRoot);
    }
  },
  actualZoom: async ({ context }, provide) => {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    await provide(async (page) => {
      const geometry = () =>
        page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          dpr: devicePixelRatio,
          cssZoom: getComputedStyle(document.documentElement).zoom,
        }));
      const before = await geometry();
      const factor = await worker.evaluate(async (url) => {
        const api = (
          globalThis as unknown as {
            chrome: {
              tabs: {
                query: (query: {
                  url: string[];
                }) => Promise<Array<{ id?: number; url?: string }>>;
                setZoom: (id: number, factor: number) => Promise<void>;
                getZoom: (id: number) => Promise<number>;
              };
            };
          }
        ).chrome.tabs;
        const tabs = await api.query({
          url: ["http://127.0.0.1/*", "http://localhost/*"],
        });
        const tab = tabs.find((candidate) => candidate.url === url);
        if (tab?.id === undefined)
          throw new Error("Missing owned localhost tab");
        await api.setZoom(tab.id, 2);
        return api.getZoom(tab.id);
      }, page.url());
      await page.waitForFunction(
        (dpr) => devicePixelRatio === dpr * 2,
        before.dpr,
      );
      return { factor, before, after: await geometry() };
    });
  },
});

export const expect = test.expect;
