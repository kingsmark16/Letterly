import { expect, test, type Request } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import {
  layoutShiftScore,
  type ObservedShift,
} from "./support/layout-shift-score";
import baseline from "./fixtures/landing-ui-baseline.json" with { type: "json" };
import { uiPerformanceSurfaces } from "./support/ui-performance-surfaces";
import surfaceBaseline from "./fixtures/surface-ui-baseline.json" with { type: "json" };

const staticAssetQuietWindowMs = 500;
const staticAssetSettleTimeoutMs = 10_000;

declare global {
  interface Window {
    __letterlyUiPerformance?: {
      finish(): { supported: boolean; shifts: ObservedShift[] };
    };
  }
}

for (const surface of uiPerformanceSurfaces) {
  test(`AC-10 preserves the shared UI performance budget on ${surface.name}`, async ({
    page,
    browser,
  }, testInfo) => {
    const viewport = {
      width: testInfo.project.name === "mobile" ? 390 : 1440,
      height: 900,
    };
    await page.setViewportSize(viewport);
    await page.addInitScript(() => {
      const shifts: ObservedShift[] = [];
      const supported =
        PerformanceObserver.supportedEntryTypes.includes("layout-shift");
      function record(entries: PerformanceEntry[]) {
        for (const entry of entries) {
          if (
            "value" in entry &&
            typeof entry.value === "number" &&
            "hadRecentInput" in entry &&
            entry.hadRecentInput === false
          ) {
            shifts.push({ time: entry.startTime, value: entry.value });
          }
        }
      }
      const observer = supported
        ? new PerformanceObserver((list) => record(list.getEntries()))
        : undefined;
      observer?.observe({ type: "layout-shift", buffered: true });
      window.__letterlyUiPerformance = {
        finish() {
          if (observer) record(observer.takeRecords());
          observer?.disconnect();
          return { supported, shifts };
        },
      };
    });

    const assets: Array<{
      path: string;
      type: string;
      bytes: number;
      sha256?: string;
    }> = [];
    const pendingAssets: Promise<void>[] = [];
    const assetErrors: Array<{ path: string; message: string }> = [];
    const activeAssets = new Set<Request>();
    let staticAssetRequestGeneration = 0;
    const isStaticAsset = (request: Request) =>
      new URL(request.url()).pathname.startsWith("/_next/static/") &&
      ["script", "stylesheet", "font"].includes(request.resourceType());
    page.on("request", (request) => {
      if (!isStaticAsset(request)) return;
      activeAssets.add(request);
      staticAssetRequestGeneration += 1;
    });
    page.on("requestfinished", (request) => activeAssets.delete(request));
    page.on("requestfailed", (request) => {
      if (!isStaticAsset(request)) return;
      activeAssets.delete(request);
      assetErrors.push({
        path: new URL(request.url()).pathname,
        message: request.failure()?.errorText ?? "Static asset request failed",
      });
    });
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      const type = response.request().resourceType();
      if (
        !path.startsWith("/_next/static/") ||
        !["script", "stylesheet", "font"].includes(type)
      )
        return;
      pendingAssets.push(
        response
          .body()
          .then((body) => {
            expect(response.ok(), `asset response: ${path}`).toBe(true);
            assets.push({
              path,
              type,
              bytes: body.byteLength,
              sha256:
                type === "font"
                  ? createHash("sha256").update(body).digest("hex")
                  : undefined,
            });
          })
          .catch((error: unknown) => {
            assetErrors.push({
              path,
              message:
                error instanceof Error ? error.message : "Asset read failed",
            });
          }),
      );
    });

    await surface.prepare?.(page);
    await page.goto(surface.path);
    await surface.exercise(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    const staticAssetSettleDeadline = Date.now() + staticAssetSettleTimeoutMs;
    let settledStaticAssetGeneration: number | undefined;
    while (Date.now() < staticAssetSettleDeadline) {
      if (activeAssets.size > 0) {
        await page.waitForTimeout(50);
        continue;
      }

      const generationAtQuietStart = staticAssetRequestGeneration;
      await page.waitForTimeout(staticAssetQuietWindowMs);
      if (
        activeAssets.size > 0 ||
        staticAssetRequestGeneration !== generationAtQuietStart
      ) {
        continue;
      }

      const pendingAssetCount = pendingAssets.length;
      await Promise.all(pendingAssets.slice(0, pendingAssetCount));
      if (
        activeAssets.size === 0 &&
        staticAssetRequestGeneration === generationAtQuietStart &&
        pendingAssets.length === pendingAssetCount
      ) {
        settledStaticAssetGeneration = generationAtQuietStart;
        break;
      }
    }
    if (settledStaticAssetGeneration === undefined) {
      throw new Error(
        `Static assets did not settle within ${staticAssetSettleTimeoutMs} ms`,
      );
    }
    expect(staticAssetRequestGeneration).toBe(settledStaticAssetGeneration);
    expect(assetErrors).toEqual([]);

    const layout = await page.evaluate(() => {
      const observed = window.__letterlyUiPerformance?.finish();
      if (!observed)
        throw new Error("The layout shift observer was not installed");
      return {
        ...observed,
        deviceScaleFactor: devicePixelRatio,
        fontStatus: document.fonts.status,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        observedUntilMs: performance.now(),
      };
    });
    expect(layout.supported).toBe(true);
    expect(layout.fontStatus).toBe("loaded");
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);

    const cls = layoutShiftScore(layout.shifts);

    const cssBytes = assets
      .filter((asset) => asset.type === "stylesheet")
      .reduce((sum, asset) => sum + asset.bytes, 0);
    const clientJavaScriptBytes = assets
      .filter((asset) => asset.type === "script")
      .reduce((sum, asset) => sum + asset.bytes, 0);
    const fonts = assets.filter((asset) => asset.type === "font");
    expect(cssBytes).toBeGreaterThan(0);
    expect(clientJavaScriptBytes).toBeGreaterThan(0);
    expect(fonts.length).toBeGreaterThan(0);
    const reference =
      surface.name === "landing"
        ? baseline.samples.find(
            (sample) => sample.profile === testInfo.project.name,
          )
        : surfaceBaseline.samples.find(
            (sample) =>
              sample.surface === surface.name &&
              sample.profile === testInfo.project.name,
          );
    if (!reference)
      throw new Error("No measured baseline for this browser profile");
    const metrics = {
      surface: surface.name,
      path: surface.path,
      baselineSourceCommit: baseline.sourceCommit,
      profile: testInfo.project.name,
      browserVersion: browser.version(),
      viewport,
      ...layout,
      cls,
      cssBytes,
      clientJavaScriptBytes,
      fontRequests: fonts.length,
      fontBytes: fonts.reduce((sum, asset) => sum + asset.bytes, 0),
      assets: assets.sort((left, right) => left.path.localeCompare(right.path)),
    };
    const output = testInfo.outputPath(
      surface.name === "landing"
        ? "landing-ui-baseline.json"
        : `${surface.name}-ui-performance.json`,
    );
    await writeFile(output, JSON.stringify(metrics, null, 2));
    await testInfo.attach(`${surface.name}-ui-performance`, {
      path: output,
      contentType: "application/json",
    });
    expect(viewport).toEqual(reference.viewport);
    expect(layout.deviceScaleFactor).toBe(reference.deviceScaleFactor);
    expect(cssBytes).toBeLessThanOrEqual(reference.cssBytes * 1.1);
    expect(clientJavaScriptBytes).toBeLessThanOrEqual(
      reference.clientJavaScriptBytes * 1.1,
    );
    expect(fonts.length).toBeLessThanOrEqual(reference.fontRequests);
    const expectedFontHashes = reference.assets
      .filter((asset) => asset.type === "font")
      .map((asset) => asset.sha256);
    for (const font of fonts) expect(expectedFontHashes).toContain(font.sha256);
    if (surface.name === "landing")
      expect(cls).toBeLessThanOrEqual(reference.cls + 0.02);
  });
}
