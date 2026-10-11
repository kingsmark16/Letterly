type YouTubePlayerStateEvent = {
  target: YouTubePlayer;
  data: number;
};

type YouTubePlayerEvent = { target: YouTubePlayer };

export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getCurrentTime(): number;
  getDuration(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}

interface YouTubePlayerOptions {
  videoId?: string;
  playerVars?: {
    controls?: 0 | 1;
    origin?: string;
    playsinline?: 0 | 1;
    rel?: 0 | 1;
  };
  events: {
    onReady?: (event: YouTubePlayerEvent) => void;
    onStateChange?: (event: YouTubePlayerStateEvent) => void;
    onError?: (event: YouTubePlayerStateEvent) => void;
    onAutoplayBlocked?: () => void;
  };
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: YouTubePlayerOptions,
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    let settled = false;
    const scriptUrl = "https://www.youtube.com/iframe_api";
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${scriptUrl}"]`,
    );
    const script = existingScript ?? document.createElement("script");
    const timeout = window.setTimeout(() => {
      fail(new Error("YouTube player could not be loaded"));
    }, 15_000);
    const finish = (api: YouTubeNamespace) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(api);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      youtubeApiPromise = null;
      script.remove();
      reject(error);
    };
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previousReady?.();
      } catch {
        fail(new Error("YouTube player is unavailable"));
        return;
      }
      if (window.YT?.Player) finish(window.YT);
      else fail(new Error("YouTube player is unavailable"));
    };
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => {
      if (window.YT?.Player) finish(window.YT);
    };
    script.onerror = () =>
      fail(new Error("YouTube player could not be loaded"));
    if (!existingScript) document.head.append(script);
  });

  return youtubeApiPromise;
}
