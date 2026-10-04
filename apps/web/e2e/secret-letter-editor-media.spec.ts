import { expect, test } from "@playwright/test";
import {
  editorPageId,
  editorImageId,
  editorAudioId,
  secondEditorImageId,
  tinyWebp,
  ownerPage,
  ownerPageWithAudio,
  ownerPageWithImages,
  mockOwnerImage,
  editorImage,
  openContentWorkspace,
} from "./fixtures/owner-page-editor";

test.describe("Secret Letter image editor persistence", () => {
  test("keeps the content editor compact while switching workspaces", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions`,
      async (route) => {
        await route.fulfill({ status: 200, json: [] });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    const contentPanel = page.locator("#editor-panel-content");
    const basicsTab = page.getByRole("tab", {
      name: "Letter basics",
      exact: true,
    });
    await expect(basicsTab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByLabel("Your message")).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Letter images" }),
    ).toBeHidden();
    await expect(contentPanel.getByRole("tab")).toHaveCount(4);

    await openContentWorkspace(page, "Memories");
    await expect(
      page.getByRole("list", { name: "Letter images" }),
    ).toBeVisible();
    await expect(page.getByLabel("Your message")).toBeHidden();

    await openContentWorkspace(page, "Questions");
    await expect(
      page.getByRole("heading", { name: "Visitor questions" }),
    ).toBeVisible();
  });

  test("AC-6 shows the ready audio player and waits for Play", async ({
    page,
  }) => {
    let audioRequests = 0;
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPageWithAudio() });
    });
    await page.route(`**/api/v1/pages/${editorPageId}/audio`, async (route) => {
      audioRequests += 1;
      await route.fulfill({
        status: 206,
        contentType: "audio/mpeg",
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": "4",
          "Content-Range": "bytes 0-3/4",
        },
        body: "audio",
      });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    const player = page.getByRole("region", {
      name: "Audio player: Our song",
    });
    await expect(player).toBeVisible();
    await expect(player.getByText("Our song")).toBeVisible();
    await expect(
      player.getByRole("button", { name: "Mute song" }),
    ).toBeVisible();
    expect(audioRequests).toBe(0);

    await player.getByRole("button", { name: "Mute song" }).click();
    await expect(
      player.getByRole("button", { name: "Unmute song" }),
    ).toHaveAttribute("aria-pressed", "true");

    await player.getByRole("button", { name: "Play Our song" }).click();
    await expect.poll(() => audioRequests).toBe(1);
  });

  test("AC-10 centers the disc and seeks with the stable progress bar", async ({
    page,
  }) => {
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPageWithAudio() });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);

    const player = page
      .getByRole("tabpanel", { name: "Content" })
      .getByRole("region", { name: "Audio player: Our song" });
    const audio = player.locator("audio");

    await audio.evaluate((element) => {
      let currentTime = 0;
      Object.defineProperty(element, "duration", {
        configurable: true,
        value: 180,
      });
      Object.defineProperty(element, "readyState", {
        configurable: true,
        value: 4,
      });
      Object.defineProperty(element, "currentTime", {
        configurable: true,
        get: () => currentTime,
        set: (nextTime: number) => {
          currentTime = nextTime;
        },
      });
      element.dispatchEvent(new Event("loadedmetadata"));
    });

    await player.evaluate((element) => {
      const container = element.parentElement;
      container?.style.setProperty("container-name", "secret-letter");
      container?.style.setProperty("container-type", "inline-size");
    });

    const title = player.getByText("Our song");
    const disc = player.locator('div[class*="disc"]');
    const playerBox = await player.boundingBox();
    const titleBox = await title.boundingBox();
    const discBox = await disc.boundingBox();

    expect(playerBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(discBox).not.toBeNull();
    expect(
      Math.abs(
        titleBox!.x +
          titleBox!.width / 2 -
          (playerBox!.x + playerBox!.width / 2),
      ),
    ).toBeLessThan(2);
    expect(
      Math.abs(
        discBox!.x + discBox!.width / 2 - (playerBox!.x + playerBox!.width / 2),
      ),
    ).toBeLessThan(2);

    const progress = player.getByRole("slider", { name: "Song progress" });
    const progressBox = await progress.boundingBox();
    expect(progressBox).not.toBeNull();
    expect(progressBox!.width).toBeGreaterThan(240);
    await expect(progress).toBeEnabled();
    await expect(player.locator('[class*="waveform"]')).toHaveCount(0);
    await progress.evaluate((element) => {
      const input = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      if (!valueSetter)
        throw new Error("The range value setter is unavailable");
      valueSetter.call(input, String(Number(input.max) * 0.75));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).currentTime),
      )
      .toBeGreaterThan(125);
    await expect
      .poll(() =>
        audio.evaluate((element) => (element as HTMLAudioElement).currentTime),
      )
      .toBeLessThan(145);
  });

  test("AC-3 keeps upload gated by permission and shows the player after verification", async ({
    page,
  }) => {
    let sourceUploadRequests = 0;
    let completionRequests = 0;
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/audio/uploads`,
      async (route) => {
        await route.fulfill({
          status: 200,
          json: {
            audioId: editorAudioId,
            uploadUrl: "http://127.0.0.1:3100/test-audio-upload",
            requiredHeaders: {
              contentType: "audio/mpeg",
              sha256: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            },
            uploadExpiresAt: "2026-09-09T02:00:00.000Z",
            state: "UPLOADING",
          },
        });
      },
    );
    await page.route("**/test-audio-upload", async (route) => {
      sourceUploadRequests += 1;
      await route.fulfill({ status: 200 });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/audio/${editorAudioId}/complete`,
      async (route) => {
        completionRequests += 1;
        await route.fulfill({
          status: 200,
          json: {
            audioId: editorAudioId,
            state: "READY",
            mediaUrl: null,
            title: "A song for Alex",
            sourceMimeType: "audio/mpeg",
            sourceByteSize: 11,
            durationMilliseconds: null,
            failureCode: null,
          },
        });
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.locator('input[accept*="audio"]').setInputFiles({
      name: "favorite.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("audio source"),
    });
    await page.getByLabel("Song title").fill("A song for Alex");

    const uploadButton = page.getByRole("button", { name: "Upload song" });
    await expect(uploadButton).toBeDisabled();
    await page
      .getByRole("checkbox", {
        name: "I own this track or have permission to share it.",
      })
      .check();
    await expect(uploadButton).toBeEnabled();
    await uploadButton.click();

    await expect(
      page.getByRole("region", { name: "Audio player: A song for Alex" }),
    ).toBeVisible({ timeout: 15_000 });
    expect(sourceUploadRequests).toBe(1);
    expect(completionRequests).toBe(1);
  });

  test("AC-9 plays the normal envelope opening in the editor preview", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("tab", { name: "Overview" }).click();
    await page.getByText("Open private preview").click();

    const preview = page.locator("[data-preview]").first();
    const openButton = preview.getByRole("button", {
      name: "Open your letter",
    });
    await expect(openButton).toBeVisible();
    await openButton.click();
    await expect(
      preview.getByRole("button", { name: "Opening..." }),
    ).toBeVisible();
    await expect(
      preview.getByRole("button", { name: "Opening..." }),
    ).not.toBeVisible({ timeout: 10_000 });
    await expect(
      preview.getByRole("heading", { name: "To Alex" }),
    ).toBeFocused();
    await expect(
      preview.getByRole("contentinfo", { name: "Letter footer" }),
    ).toContainText("Create your own letter");
    await expect(preview.locator("[data-message-fallback]")).toBeVisible();
  });

  test("mobile live preview removes the floating envelope artwork", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await page.getByRole("button", { name: "Mobile preview" }).click();

    const preview = page.locator("[data-preview]").first();
    const hero = preview.locator("#our-story");

    await expect(hero.locator("img")).toHaveCount(0);
    await expect(hero.locator("h2")).toHaveCount(1);
  });

  test("shows the saved creator sign off in the overview", async ({ page }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({
        status: 200,
        json: ownerPage(1, "A saved memory", "DRAFT", {
          recipientName: "Alex",
          mainMessage: "A letter that keeps its memories.",
          creatorName: "Mark",
        }),
      });
    });
    await page.route(
      `**/api/v1/pages/${editorPageId}/questions**`,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({ status: 200, json: [] });
          return;
        }
        await route.continue();
      },
    );

    await page.goto(`/dashboard/letters/${editorPageId}/edit?section=overview`);

    const signOff = page
      .locator("dt")
      .filter({ hasText: "Sign-off" })
      .locator("..");
    await expect(signOff.getByText("Mark", { exact: true })).toBeVisible();
  });

  test("AC-7 restores a saved attached image when the editor opens", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");

    await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");
    await expect(page.getByText("Included in this letter")).toHaveCount(0);
    await expect(editorImage(page)).toBeVisible();
    await expect
      .poll(() =>
        editorImage(page).evaluate(
          (image: HTMLImageElement) => image.naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });

  test("AC-5 shows the caption count and rejects input beyond 150 graphemes", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage(1, "") });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");

    const caption = page.getByLabel("Caption");
    const maximumCaption = "a".repeat(150);
    await expect(page.getByText("0 / 150", { exact: true })).toBeVisible();

    await caption.fill(maximumCaption);
    await expect(caption).toHaveValue(maximumCaption);
    await expect(page.getByText("150 / 150", { exact: true })).toBeVisible();

    await caption.fill(`${maximumCaption}b`);
    await expect(caption).toHaveValue(maximumCaption);
    await expect(caption).toHaveAttribute(
      "aria-describedby",
      `caption-${editorImageId}-count`,
    );
  });

  test("published letters can be edited and saved without unpublishing", async ({
    page,
  }) => {
    let savedRequest: Record<string, unknown> | null = null;
    let currentPage = ownerPage(1, "A saved memory", "PUBLISHED");
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        savedRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        currentPage = ownerPage(2, "Updated public memory", "PUBLISHED", {
          recipientName: "Alex",
          mainMessage: "A revised public letter.",
        });
      }
      await route.fulfill({
        status: 200,
        json: currentPage,
      });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");
    await expect(page.getByLabel("Caption")).not.toHaveAttribute("readonly");
    await expect(page.getByLabel("Caption")).toHaveValue("A saved memory");
    await expect(page.getByLabel("Your message")).not.toHaveAttribute(
      "readonly",
    );
    await page.getByLabel("Caption").fill("Updated public memory");
    await page.getByLabel("Your message").fill("A revised public letter.");
    await expect(
      page.getByRole("button", { name: "Save changes", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();

    await expect(
      page.getByRole("status").filter({ hasText: "Saved as version 2." }),
    ).toBeVisible();
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      recipientName: "Alex",
      mainMessage: "A revised public letter.",
      images: [
        {
          imageId: editorImageId,
          sortOrder: 0,
          caption: "Updated public memory",
        },
      ],
    });
    await expect(page.getByLabel("Caption")).toHaveValue(
      "Updated public memory",
    );
    await expect(editorImage(page)).toBeVisible();
  });

  test("AC-4 saves the image identity, order, and trimmed caption", async ({
    page,
  }) => {
    let savedRequest: unknown;
    let currentPage = ownerPage();
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        savedRequest = route.request().postDataJSON();
        currentPage = ownerPage(2, "Remember this day");
      }
      await route.fulfill({ status: 200, json: currentPage });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");
    await page.getByLabel("Caption").fill("  Remember this day  ");

    await expect(
      page.getByRole("status").filter({ hasText: "Saved as version 2." }),
    ).toBeVisible();
    expect(savedRequest).toMatchObject({
      expectedContentVersion: 1,
      recipientName: "Alex",
      mainMessage: "A letter that keeps its memories.",
      images: [
        {
          imageId: editorImageId,
          sortOrder: 0,
          caption: "Remember this day",
        },
      ],
    });
    await expect(page.getByLabel("Caption")).toHaveValue("Remember this day");
    await expect(editorImage(page)).toBeVisible();
  });

  test("AC-4 reorders image cards with drag and drop", async ({
    page,
  }, testInfo) => {
    testInfo.skip(
      testInfo.project.name === "mobile",
      "Native HTML drag and drop is not available in touch emulation.",
    );

    let savedRequest: Record<string, unknown> | null = null;
    let currentPage = ownerPageWithImages();

    await mockOwnerImage(page);
    await page.route(
      `**/api/v1/pages/${editorPageId}/images/${secondEditorImageId}`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "image/webp",
          headers: { "Cache-Control": "no-store" },
          body: tinyWebp,
        });
      },
    );
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      if (route.request().method() === "PATCH") {
        savedRequest = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        currentPage = ownerPageWithImages(2);
      }
      await route.fulfill({ status: 200, json: currentPage });
    });

    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");

    const cards = page.locator('li[draggable="true"]');
    await expect(cards).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "Move earlier" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Move later" })).toHaveCount(
      0,
    );
    await cards.nth(0).dragTo(cards.nth(1));

    await expect(
      page.getByRole("status").filter({ hasText: "Saved as version 2." }),
    ).toBeVisible();
    expect(savedRequest).toMatchObject({
      images: [
        { imageId: secondEditorImageId, sortOrder: 0 },
        { imageId: editorImageId, sortOrder: 1 },
      ],
    });
  });

  test("AC-4 warns before reload when only media has unsaved changes", async ({
    page,
  }) => {
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      await route.fulfill({ status: 200, json: ownerPage() });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");
    await page.getByLabel("Caption").fill("An unsaved caption");

    const warningRequested = await page.evaluate(() => {
      const event = new Event("beforeunload", {
        cancelable: true,
      }) as BeforeUnloadEvent;
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(warningRequested).toBe(true);
  });

  test("AC-7 restores the permanent image after a full page reload", async ({
    page,
  }) => {
    let ownerReads = 0;
    await mockOwnerImage(page);
    await page.route(`**/api/v1/pages/${editorPageId}`, async (route) => {
      ownerReads += 1;
      await route.fulfill({ status: 200, json: ownerPage(2, "Still here") });
    });
    await page.goto(`/dashboard/letters/${editorPageId}/edit`);
    await openContentWorkspace(page, "Memories");
    await expect(editorImage(page)).toBeVisible();

    await page.reload();
    await openContentWorkspace(page, "Memories");

    await expect.poll(() => ownerReads).toBeGreaterThan(1);
    await expect(page.getByLabel("Caption")).toHaveValue("Still here");
    await expect(editorImage(page)).toBeVisible();
    await expect
      .poll(() =>
        editorImage(page).evaluate(
          (image: HTMLImageElement) => image.naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
  });
});
