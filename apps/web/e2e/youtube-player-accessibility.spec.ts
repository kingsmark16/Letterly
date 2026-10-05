import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const wcagAaTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const disclosureText =
  "This linked song loads a hidden YouTube player and may contact YouTube before playback. Audio starts only after you press Play.";

const youtubeApiFixture = `
  window.YT = {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
    Player: function (mount, options) {
      const iframe = document.createElement("iframe");
      iframe.src = "about:blank";
      iframe.tabIndex = 0;
      mount.appendChild(iframe);

      const player = {
        getIframe: () => iframe,
        getDuration: () => 180,
        getCurrentTime: () => 0,
        isMuted: () => false,
        mute: () => undefined,
        unMute: () => undefined,
        playVideo: () => undefined,
        pauseVideo: () => undefined,
        stopVideo: () => undefined,
        seekTo: () => undefined,
        destroy: () => iframe.remove(),
      };

      window.setTimeout(() => options.events.onReady({ target: player }), 0);
      return player;
    },
  };
  window.onYouTubeIframeAPIReady?.();
`;

test("AC-6 and AC-8 disclose YouTube preload and isolate its hidden frame", async ({
  page,
}, testInfo) => {
  let providerRequests = 0;
  let disclosureOpacityAtRequest = 0;

  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    providerRequests += 1;
    const disclosure = page.getByText(disclosureText, { exact: true });
    if ((await disclosure.count()) === 1) {
      disclosureOpacityAtRequest = await disclosure.evaluate((element) => {
        let opacity = 1;
        let ancestor: HTMLElement | null = element as HTMLElement;
        while (ancestor) {
          opacity *= Number.parseFloat(getComputedStyle(ancestor).opacity);
          ancestor = ancestor.parentElement;
        }
        return opacity;
      });
    }

    await route.fulfill({
      contentType: "application/javascript",
      body: youtubeApiFixture,
    });
  });

  await page.goto("/p/fixture-letter-youtube");
  await expect(
    page.getByRole("button", { name: "Open your letter" }),
  ).toBeVisible();
  expect(providerRequests).toBe(0);

  await page.getByRole("button", { name: "Open your letter" }).click();
  const disclosure = page.getByText(disclosureText, { exact: true });
  await expect(disclosure).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open your letter" }),
  ).toBeHidden();
  await expect(page.locator('[data-revealed="true"]')).toHaveCount(1);
  await expect.poll(() => providerRequests).toBe(1);
  expect(disclosureOpacityAtRequest).toBeGreaterThan(0.9);

  const player = page.getByRole("region", {
    name: "Audio player: Fixture YouTube song",
  });
  const playButton = player.getByRole("button", {
    name: "Play Fixture YouTube song on YouTube",
  });
  await expect(playButton).toHaveCSS("background-color", "rgb(229, 0, 61)");
  await expect(playButton).toHaveCSS("border-top-color", "rgb(229, 0, 61)");

  const hiddenPlayer = player.locator('div[class*="youtubeEmbedHidden"]');
  await expect(hiddenPlayer).toHaveAttribute("aria-hidden", "true");
  await expect(hiddenPlayer).toHaveJSProperty("inert", true);

  const hiddenFrame = hiddenPlayer.locator("iframe");
  await expect(hiddenFrame).toBeAttached();
  const frameReceivedFocus = await hiddenFrame.evaluate((element) => {
    (element as HTMLIFrameElement).focus();
    return document.activeElement === element;
  });
  expect(frameReceivedFocus).toBe(false);

  const axeResults = await new AxeBuilder({ page })
    .withTags(wcagAaTags)
    .analyze();
  await testInfo.attach("youtube-player-axe-wcag-aa.json", {
    body: JSON.stringify(
      {
        violations: axeResults.violations.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          help: violation.help,
          targets: violation.nodes.map((node) => node.target),
        })),
        incomplete: axeResults.incomplete.map((rule) => ({
          id: rule.id,
          impact: rule.impact,
          help: rule.help,
          targets: rule.nodes.map((node) => node.target),
        })),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(axeResults.violations).toEqual([]);
});

test.describe("Secret Letter progressive enhancement", () => {
  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("AC-11 keeps the published letter readable without JavaScript", async ({
      page,
    }) => {
      await page.goto("/p/fixture-letter");

      await expect(
        page.getByRole("heading", { level: 1, name: "To Fixture Reader" }),
      ).toBeVisible();
      await expect(
        page
          .getByText("These words belong to the published letter.", {
            exact: true,
          })
          .first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Letterly home" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Open your letter" }),
      ).toBeHidden();
    });
  });

  test("AC-11 preserves the envelope opening after client hydration", async ({
    page,
  }) => {
    await page.goto("/p/fixture-letter");

    const openButton = page.getByRole("button", { name: "Open your letter" });
    const letterContent = page.locator("[data-letter-content-wrapper]");
    await expect(openButton).toBeVisible();
    await expect(letterContent).toHaveCSS("opacity", "0");

    await openButton.click();
    await expect(page.locator('[data-revealed="true"]')).toHaveCount(1);
    await expect(letterContent).toHaveCSS("opacity", "1");
    await expect(
      page
        .getByText("These words belong to the published letter.", {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });
});
