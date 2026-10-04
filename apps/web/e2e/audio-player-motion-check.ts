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
  const resume = async () => {
    const sample = await player.evaluate(async (root) => {
      const media = root.querySelector("audio");
      const record = root.querySelector(
        'div[aria-hidden="true"][class*="disc"]',
      );
      if (!media || !record)
        throw new Error("Audio motion elements are missing.");
      const readAngle = () => {
        const matrix = new DOMMatrix(getComputedStyle(record).transform);
        return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
      };
      const before = readAngle();
      const started = performance.now();
      media.dispatchEvent(new Event("playing"));
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return {
        before,
        after: readAngle(),
        elapsedMilliseconds: performance.now() - started,
      };
    });
    const advance = (sample.after - sample.before + 360) % 360;
    const allowedAdvance = (sample.elapsedMilliseconds / 8_000) * 360 + 3;
    const distanceFromReset = delta(sample.before, 0);
    // The record makes one turn in eight seconds. Measure the transition in
    // the browser so protocol latency cannot look like an angle reset.
    expect(distanceFromReset).toBeGreaterThan(30);
    expect(allowedAdvance).toBeLessThan(distanceFromReset);
    expect(advance).toBeLessThan(allowedAdvance);
  };
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
  await expect.poll(angle).toBeGreaterThan(30);

  await player
    .getByRole("button", { name: "Pause Our song", exact: true })
    .click();
  const pausedAngle = await angle();
  expect(pausedAngle).toBeGreaterThan(30);
  await waitWhileStopped();
  expect(delta(await angle(), pausedAngle)).toBeLessThan(0.1);

  await player
    .getByRole("button", { name: "Play Our song", exact: true })
    .click();
  await waitWhileStopped();
  expect(delta(await angle(), pausedAngle)).toBeLessThan(0.1);
  await resume();
  await expect
    .poll(async () => delta(await angle(), pausedAngle))
    .toBeGreaterThan(3);

  await emit("waiting");
  const bufferingAngle = await angle();
  await waitWhileStopped();
  expect(delta(await angle(), bufferingAngle)).toBeLessThan(0.1);
  await resume();
  await expect
    .poll(async () => delta(await angle(), bufferingAngle))
    .toBeGreaterThan(3);

  await emit("ended");
  const endedAngle = await angle();
  await waitWhileStopped();
  expect(delta(await angle(), endedAngle)).toBeLessThan(0.1);
}
