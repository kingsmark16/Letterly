import assert from "node:assert/strict";
import test from "node:test";
import {
  loadYouTubeIframeApi,
  type YouTubeNamespace,
  type YouTubePlayer,
} from "./youtube-iframe-api";

class ProviderPlayer implements YouTubePlayer {
  playVideo() {}
  pauseVideo() {}
  seekTo() {}
  mute() {}
  unMute() {}
  isMuted() {
    return false;
  }
  getCurrentTime() {
    return 0;
  }
  getDuration() {
    return 0;
  }
  getIframe(): HTMLIFrameElement {
    throw new Error("Loader tests do not create players");
  }
  destroy() {}
}

interface ScriptProbe {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  removed: boolean;
  remove: () => void;
}

function browserProbe() {
  const scripts: ScriptProbe[] = [];
  const timers = new Map<number, () => void>();
  const delays: number[] = [];
  let nextTimer = 0;
  let appended = 0;
  const browser: {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
    setTimeout: (callback: () => void, delay: number) => number;
    clearTimeout: (id: number) => void;
  } = {
    setTimeout(callback, delay) {
      delays.push(delay);
      timers.set(++nextTimer, callback);
      return nextTimer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const document = {
    querySelector: () => scripts.find((script) => !script.removed) ?? null,
    createElement: () => {
      const script: ScriptProbe = {
        src: "",
        async: false,
        onload: null,
        onerror: null,
        removed: false,
        remove() {
          script.removed = true;
        },
      };
      scripts.push(script);
      return script;
    },
    head: {
      append() {
        appended++;
      },
    },
  };
  return {
    browser,
    document,
    scripts,
    timers,
    delays,
    get appended() {
      return appended;
    },
  };
}

test("YouTube loader coalesces requests, bounds failures, and recovers without real provider traffic", async (context) => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  const documentDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "document",
  );
  function install(probe: ReturnType<typeof browserProbe>) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: probe.browser,
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: probe.document,
    });
  }
  try {
    await context.test(
      "network failure removes its script and clears its timeout",
      async () => {
        const probe = browserProbe();
        install(probe);
        const first = loadYouTubeIframeApi();
        assert.equal(loadYouTubeIframeApi(), first);
        assert.equal(probe.appended, 1);
        assert.equal(
          probe.scripts[0]?.src,
          "https://www.youtube.com/iframe_api",
        );
        assert.equal(probe.scripts[0]?.async, true);
        const rejected = assert.rejects(first, {
          message: "YouTube player could not be loaded",
        });
        probe.scripts[0]?.onerror?.();
        await rejected;
        assert.equal(probe.scripts[0]?.removed, true);
        assert.equal(probe.timers.size, 0);
      },
    );
    await context.test(
      "a retry times out after the existing 15 second bound",
      async () => {
        const probe = browserProbe();
        install(probe);
        const request = loadYouTubeIframeApi();
        const rejected = assert.rejects(request, {
          message: "YouTube player could not be loaded",
        });
        assert.deepEqual(probe.delays, [15000]);
        probe.timers.values().next().value?.();
        await rejected;
        assert.equal(probe.scripts[0]?.removed, true);
        assert.equal(probe.timers.size, 0);
      },
    );
    await context.test(
      "a failing preexisting ready callback produces a safe failure",
      async () => {
        const probe = browserProbe();
        probe.browser.onYouTubeIframeAPIReady = () => {
          throw new Error("private fixture diagnostic");
        };
        install(probe);
        const request = loadYouTubeIframeApi();
        const rejected = assert.rejects(request, {
          message: "YouTube player is unavailable",
        });
        probe.browser.onYouTubeIframeAPIReady?.();
        await rejected;
        assert.equal(probe.timers.size, 0);
        assert.equal(probe.scripts[0]?.removed, true);
      },
    );
    await context.test(
      "ready without a provider constructor rejects and permits another attempt",
      async () => {
        const probe = browserProbe();
        install(probe);
        const request = loadYouTubeIframeApi();
        const rejected = assert.rejects(request, {
          message: "YouTube player is unavailable",
        });
        probe.browser.onYouTubeIframeAPIReady?.();
        await rejected;
        assert.equal(probe.timers.size, 0);
      },
    );
    await context.test(
      "existing script is reused and ready resolves all consumers once",
      async () => {
        const probe = browserProbe();
        probe.document.createElement();
        let priorReadyCalls = 0;
        probe.browser.onYouTubeIframeAPIReady = () => {
          priorReadyCalls++;
        };
        install(probe);
        const first = loadYouTubeIframeApi();
        const second = loadYouTubeIframeApi();
        assert.equal(first, second);
        assert.equal(probe.appended, 0);
        assert.equal(probe.scripts.length, 1);
        const api = { Player: ProviderPlayer };
        probe.browser.YT = api;
        probe.browser.onYouTubeIframeAPIReady?.();
        assert.equal(await first, api);
        assert.equal(await second, api);
        assert.equal(priorReadyCalls, 1);
        assert.equal(probe.timers.size, 0);
        probe.scripts[0]?.onerror?.();
        assert.equal(probe.scripts[0]?.removed, false);
        assert.equal(await loadYouTubeIframeApi(), api);
        assert.equal(probe.scripts.length, 1);
      },
    );
  } finally {
    for (const [key, descriptor] of [
      ["window", windowDescriptor],
      ["document", documentDescriptor],
    ] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
