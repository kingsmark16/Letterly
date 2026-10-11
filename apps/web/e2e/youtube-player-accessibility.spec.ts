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

  await page.addInitScript((expectedDisclosureText) => {
    const installObserver = (): void => {
      if (!document.documentElement || !document.head) return;

      document.documentElement.dataset.youtubeScriptAppendObserver = "ready";
      const originalAppend = document.head.append.bind(document.head);
      document.head.append = (...nodes: (Node | string)[]) => {
        for (const node of nodes) {
          if (
            !(node instanceof HTMLScriptElement) ||
            node.src !== "https://www.youtube.com/iframe_api"
          ) {
            continue;
          }

          document.documentElement.dataset.youtubeScriptAppendCaptured = "true";
          const disclosures = Array.from(document.querySelectorAll("p")).filter(
            (element) =>
              element.textContent?.replace(/\s+/gu, " ").trim() ===
              expectedDisclosureText,
          );
          let opacity = 1;
          let ancestor: HTMLElement | null = disclosures[0] ?? null;
          while (ancestor) {
            opacity *= Number.parseFloat(getComputedStyle(ancestor).opacity);
            ancestor = ancestor.parentElement;
          }

          document.documentElement.dataset.youtubeDisclosureCountAtRequest =
            String(disclosures.length);
          document.documentElement.dataset.youtubeDisclosureOpacityAtRequest =
            String(disclosures.length === 1 ? opacity : 0);
        }

        originalAppend(...nodes);
      };
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", installObserver, {
        once: true,
      });
    } else {
      installObserver();
    }
  }, disclosureText);

  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    providerRequests += 1;
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
  await expect(page.locator("html")).toHaveAttribute(
    "data-youtube-script-append-observer",
    "ready",
  );
  await expect(
    page.getByRole("button", { name: "Open your letter" }),
  ).toBeHidden();
  await expect(page.locator('[data-revealed="true"]')).toHaveCount(1);
  const player = page.getByRole("region", {
    name: "Audio player: Fixture YouTube song",
  });
  await expect.poll(() => providerRequests).toBe(1);
  const disclosureStateAtRequest = await page.evaluate(() => ({
    observer: document.documentElement.dataset.youtubeScriptAppendObserver,
    captured: document.documentElement.dataset.youtubeScriptAppendCaptured,
    count: document.documentElement.dataset.youtubeDisclosureCountAtRequest,
    opacity: document.documentElement.dataset.youtubeDisclosureOpacityAtRequest,
  }));
  expect(disclosureStateAtRequest.observer).toBe("ready");
  expect(disclosureStateAtRequest.captured).toBe("true");
  expect(Number(disclosureStateAtRequest.count)).toBe(1);
  expect(Number(disclosureStateAtRequest.opacity)).toBeGreaterThan(0.9);

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

test("AC-9 announces YouTube playback failure and provides recovery", async ({
  page,
}) => {
  let providerRequests = 0;

  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    providerRequests += 1;
    if (providerRequests < 3) {
      await route.abort();
      return;
    }

    await route.fulfill({
      contentType: "application/javascript",
      body: youtubeApiFixture,
    });
  });

  await page.goto("/p/fixture-letter-youtube");
  await page.getByRole("button", { name: "Open your letter" }).click();

  const player = page.getByRole("region", {
    name: "Audio player: Fixture YouTube song",
  });
  await expect.poll(() => providerRequests).toBe(1);
  await expect(player.getByRole("alert")).toHaveText(
    "The YouTube player could not be loaded.",
  );
  const recoveryLink = player.getByRole("link", {
    name: "Open on YouTube",
    exact: true,
  });
  await expect(recoveryLink).toHaveAttribute(
    "href",
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  await expect(recoveryLink).toHaveAttribute("target", "_blank");
  const recoveryTarget = await recoveryLink.boundingBox();
  expect(recoveryTarget).not.toBeNull();
  expect(recoveryTarget!.width).toBeGreaterThanOrEqual(44 - 0.01);
  expect(recoveryTarget!.height).toBeGreaterThanOrEqual(44 - 0.01);

  await player
    .getByRole("button", { name: "Play Fixture YouTube song on YouTube" })
    .click();
  await expect.poll(() => providerRequests).toBe(2);
  await expect(player.getByRole("alert")).toHaveText(
    "The YouTube player could not be loaded.",
  );

  await player
    .getByRole("button", { name: "Play Fixture YouTube song" })
    .click();

  await expect.poll(() => providerRequests).toBe(3);
  await expect(
    player.locator('div[class*="youtubeEmbedHidden"] iframe'),
  ).toBeAttached();
  await expect(player.getByRole("alert")).toHaveCount(0);
});
