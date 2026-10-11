import { expect, test } from "@playwright/test";
import { ownerPage, pageId } from "./fixtures/owner-page";
import { editorImageId, tinyWebp } from "./fixtures/owner-page-editor";
import { installOwnerEditorRoutes } from "./support/owner-editor";

const mediaPath = `/api/v1/pages/${pageId}/images/${editorImageId}`;

function imageOwner(contentVersion = 1, caption = "A saved memory") {
  return {
    ...ownerPage(
      contentVersion,
      "Avery",
      "A message worth keeping.",
      "2026-08-20T00:05:00.000Z",
    ),
    images: [
      {
        imageId: editorImageId,
        state: "READY",
        attached: true,
        sortOrder: 0,
        mediaUrl: mediaPath,
        caption,
        failureCode: null,
        expiresAt: null,
      },
    ],
  };
}

test("saved image renders and caption persistence excludes image bytes", async ({
  page,
}) => {
  await installOwnerEditorRoutes(page);
  let owner = imageOwner();
  let savedRequest: unknown;
  await page.route(`**/api/v1/pages/${pageId}`, async (route) => {
    if (route.request().method() === "PATCH") {
      savedRequest = route.request().postDataJSON();
      owner = imageOwner(2, "Remember this day");
    }
    await route.fulfill({ status: 200, json: owner });
  });
  await page.route(`**${mediaPath}*`, (route) =>
    route.fulfill({ status: 200, contentType: "image/webp", body: tinyWebp }),
  );
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  const image = page
    .getByRole("region", { name: "Letter photos" })
    .locator("img");
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");
  await page.getByLabel("Caption").fill("  Remember this day  ");
  await expect
    .poll(() => savedRequest)
    .toMatchObject({
      expectedContentVersion: 1,
      images: [
        { imageId: editorImageId, sortOrder: 0, caption: "Remember this day" },
      ],
    });
  expect(savedRequest).toMatchObject({
    expectedContentVersion: 1,
    images: [
      { imageId: editorImageId, sortOrder: 0, caption: "Remember this day" },
    ],
  });
  expect((savedRequest as { images: unknown[] }).images).toEqual([
    { imageId: editorImageId, sortOrder: 0, caption: "Remember this day" },
  ]);
  await page.reload();
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect(page.getByLabel("Caption")).toHaveValue("Remember this day");
});

test("preview recovers after two unavailable media responses", async ({
  page,
}) => {
  await installOwnerEditorRoutes(page);
  await page.route(`**/api/v1/pages/${pageId}`, (route) =>
    route.fulfill({ status: 200, json: imageOwner() }),
  );
  const attempts: string[] = [];
  await page.route(`**${mediaPath}*`, (route) => {
    const requestUrl = new URL(route.request().url());
    attempts.push(requestUrl.search);
    return requestUrl.searchParams.get("previewAttempt") === "2"
      ? route.fulfill({
          status: 200,
          contentType: "image/webp",
          body: tinyWebp,
        })
      : route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  const image = page
    .getByRole("region", { name: "Letter photos" })
    .locator("img");
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.naturalWidth),
    )
    .toBeGreaterThan(0);
  // WebKit can request one retry URL more than once before advancing.
  expect([...new Set(attempts)]).toEqual([
    "",
    "?previewAttempt=1",
    "?previewAttempt=2",
  ]);
  await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");
});

test("unavailable preview stops retrying while caption editing remains usable", async ({
  page,
}) => {
  await installOwnerEditorRoutes(page);
  await page.route(`**/api/v1/pages/${pageId}`, (route) =>
    route.fulfill({ status: 200, json: imageOwner() }),
  );
  // WebKit may fetch one retry URL more than once; count logical attempts.
  const previewAttempts = new Set<string>();
  await page.route(`**${mediaPath}*`, (route) => {
    const requestUrl = new URL(route.request().url());
    previewAttempts.add(requestUrl.searchParams.get("previewAttempt") ?? "0");
    return route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect.poll(() => previewAttempts.size).toBe(3);
  await page.getByLabel("Caption").fill("Still editable");
  await expect(page.getByLabel("Caption")).toHaveValue("Still editable");
  // An erroneous fourth retry would run after 1,000 milliseconds.
  await page.waitForTimeout(1_250);
  expect([...previewAttempts].sort()).toEqual(["0", "1", "2"]);
});
