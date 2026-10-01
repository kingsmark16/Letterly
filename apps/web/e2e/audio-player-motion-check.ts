import { expect, type Locator } from "@playwright/test";

export async function verifyAudioPlayerMotion(player: Locator): Promise<void> {
  const audio = player.locator("audio");
  const disc = player.locator('div[aria-hidden="true"][class*="disc"]');
  const angle = () =>
    disc.evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform);
      return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
    });
  const emit = (name: string) =>
    audio.evaluate((element, eventName) => {
      element.dispatchEvent(new Event(eventName));
    }, name);
  const delta = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
  const waitWhileStopped = () =>
    audio.evaluate(() => new Promise((resolve) => setTimeout(resolve, 200)));

  await audio.evaluate((element) => {
    if (!(element instanceof HTMLAudioElement)) {
      throw new Error("The audio player is missing its media element.");
    }
    let paused = true;
    Object.defineProperty(element, "paused", {
      configurable: true,
      get: () => paused,
    });
    element.play = () => {
      paused = false;
      element.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
    element.pause = () => {
      paused = true;
      element.dispatchEvent(new Event("pause"));
    };
  });

  await player
    .getByRole("button", { name: "Play Our song", exact: true })
    .click();
  await waitWhileStopped();
  expect(await angle()).toBeCloseTo(0, 1);

  await emit("playing");
  await expect.poll(angle).toBeGreaterThan(3);

  await player
    .getByRole("button", { name: "Pause Our song", exact: true })
    .click();
  const pausedAngle = await angle();
  expect(pausedAngle).toBeGreaterThan(3);
  await waitWhileStopped();
  expect(delta(await angle(), pausedAngle)).toBeLessThan(0.1);

  await player
    .getByRole("button", { name: "Play Our song", exact: true })
    .click();
  await waitWhileStopped();
  expect(delta(await angle(), pausedAngle)).toBeLessThan(0.1);
  await emit("playing");
  expect(delta(await angle(), pausedAngle)).toBeLessThan(3);
  await expect
    .poll(async () => delta(await angle(), pausedAngle))
    .toBeGreaterThan(3);

  await emit("waiting");
  const bufferingAngle = await angle();
  await waitWhileStopped();
  expect(delta(await angle(), bufferingAngle)).toBeLessThan(0.1);
  await emit("playing");
  expect(delta(await angle(), bufferingAngle)).toBeLessThan(3);
  await expect
    .poll(async () => delta(await angle(), bufferingAngle))
    .toBeGreaterThan(3);

  await emit("ended");
  const endedAngle = await angle();
  await waitWhileStopped();
  expect(delta(await angle(), endedAngle)).toBeLessThan(0.1);
}
