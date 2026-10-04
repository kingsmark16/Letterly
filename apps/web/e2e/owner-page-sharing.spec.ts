import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import QRCode from "qrcode";
import { editorPageId, ownerPage } from "./fixtures/owner-page-editor";

test.describe("protected links and QR sharing", () => {
  test("AC-1, AC-3, AC-5, and AC-11 render a published owner QR panel", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    await expect(page.getByText("Letter link", { exact: true })).toHaveCount(0);

    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    const qrRegion = page.locator('[role="img"][aria-label^="QR code for"]');
    await expect(qrPanel).toBeVisible();
    await expect(qrRegion).toBeVisible();
    await expect(qrRegion.locator("img")).toBeVisible();
    await expect(
      qrPanel.getByRole("link", { name: "Open letter" }),
    ).toHaveAttribute("href", "/p/mock-letter");
    await expect(qrPanel.getByLabel("Public link")).toHaveValue(
      "http://127.0.0.1:3100/p/mock-letter",
    );
    await expect(
      page.getByRole("button", { name: "Download SVG" }),
    ).toBeEnabled();
    await expect(qrRegion).toHaveAttribute(
      "aria-label",
      "QR code for http://127.0.0.1:3100/p/mock-letter",
    );

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download SVG" }).click();
    const download = await downloadPromise;
    const downloadedMarkup = await readFile(
      (await download.path()) ?? "",
      "utf8",
    );
    const expectedMarkup = await QRCode.toString(
      "http://127.0.0.1:3100/p/mock-letter",
      {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 4,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
    );

    expect(download.suggestedFilename()).toBe("letterly-mock-letter.svg");
    expect(downloadedMarkup.trim()).toBe(expectedMarkup.trim());
  });

  test("AC-5 keeps the URL copy fallback available when clipboard access is unavailable", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard unavailable");
          },
        },
      });
    });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    const qrPreview = page.locator(
      '[role="img"][aria-label^="QR code for"] img',
    );
    await expect(qrPreview).toBeAttached();
    await qrPanel
      .getByRole("button", { name: "Copy link", exact: true })
      .click();
    await qrPreview.dispatchEvent("load");

    await expect(
      qrPanel.getByText(
        "Copy was unavailable. Select the public link and copy it manually.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(qrPanel.getByLabel("Public link")).toHaveAttribute(
      "readonly",
      "",
    );
  });

  test("AC-10 keeps the canonical link available when the QR preview fails", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);

    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    const qrPreview = page.locator(
      '[role="img"][aria-label^="QR code for"] img',
    );
    await expect(qrPreview).toBeVisible();
    await qrPreview.dispatchEvent("error");

    await expect(
      qrPanel.getByText(
        "The QR code preview is unavailable. You can still download the SVG.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      qrPanel.getByRole("button", { name: "Download SVG" }),
    ).toBeEnabled();
    await expect(qrPanel.getByLabel("Public link")).toHaveValue(
      "http://127.0.0.1:3100/p/mock-letter",
    );
  });

  test("AC-10 retries QR generation while preserving the canonical link", async ({
    page,
  }) => {
    let qrChunkFailures = 0;
    let allowQrChunk = false;
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const response = await route.fetch();
      const body = await response.body();
      const source = body.toString("utf8");
      if (!allowQrChunk && source.includes("getSymbolSize")) {
        qrChunkFailures += 1;
        await route.fulfill({
          status: 503,
          contentType: "application/javascript",
          body: "",
        });
        return;
      }

      await route.fulfill({ response, body });
    });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);

    const qrPanel = page.getByRole("region", {
      name: "A quiet way to share your letter",
    });
    await expect(qrChunkFailures).toBeGreaterThan(0);
    await expect(
      qrPanel.getByText(
        "The QR code could not be prepared. Your public link is still available.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 15_000 });
    await expect(qrPanel.getByLabel("Public link")).toHaveValue(
      "http://127.0.0.1:3100/p/mock-letter",
    );
    await expect(
      qrPanel.getByRole("button", { name: "Download SVG" }),
    ).toBeDisabled();

    allowQrChunk = true;
    await qrPanel.getByRole("button", { name: "Try again" }).click();
    await expect(
      qrPanel.getByRole("button", { name: "Download SVG" }),
    ).toBeEnabled({ timeout: 15_000 });
    await expect(
      qrPanel.locator('[role="img"][aria-label^="QR code for"] img'),
    ).toBeVisible();
  });

  test("AC-11 keeps the QR panel usable at a narrow viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "PUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page).toHaveURL(/section=overview/u);
    await expect(
      page.getByRole("button", { name: "Download SVG" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });

  test("AC-8 keeps the published slug immutable when a letter is unpublished", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "UNPUBLISHED"),
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();

    await expect(page.getByLabel("Custom public slug")).toHaveCount(0);
    await expect(
      page
        .locator('p[role="status"]')
        .filter({ hasText: "Your existing public link is reserved" }),
    ).toBeVisible();
  });
});
