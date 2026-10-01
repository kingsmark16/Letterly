"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { pageAudioLinkResponseSchema } from "@letterly/contracts/pages";
import styles from "./audio-player.module.css";
import { MusicIcon } from "../../components/music-icon";
import { RecordTonearm } from "./record-tonearm";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

const CONFETTI_KIND_CLASS = {
  heart: styles.confettiHeart,
  petal: styles.confettiPetal,
  spark: styles.confettiSpark,
} as const;

const CONFETTI_PIECES = [
  { left: 8, bottom: 18, kind: "heart" },
  { left: 16, bottom: 10, kind: "petal" },
  { left: 25, bottom: 24, kind: "spark" },
  { left: 34, bottom: 8, kind: "heart" },
  { left: 43, bottom: 20, kind: "petal" },
  { left: 52, bottom: 11, kind: "spark" },
  { left: 61, bottom: 25, kind: "heart" },
  { left: 70, bottom: 9, kind: "petal" },
  { left: 79, bottom: 19, kind: "spark" },
  { left: 88, bottom: 12, kind: "heart" },
] as const;

type YouTubePlayerStateEvent = {
  target: YouTubePlayer;
  data: number;
};

type YouTubePlayerEvent = { target: YouTubePlayer };

interface YouTubePlayer {
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

interface YouTubeNamespace {
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

function loadYouTubeIframeApi(): Promise<YouTubeNamespace> {
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function clampTime(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || duration <= 0) return 0;
  return Math.min(Math.max(seconds, 0), duration);
}

export function SecretLetterAudioPlayer({
  src,
  youtubeVideoId,
  metadataUrl,
  title,
  durationMilliseconds,
  durationSeconds,
  active = true,
  compact = false,
  fillWorkspace = false,
  romantic = false,
  formatLabel,
}: {
  src?: string;
  youtubeVideoId?: string;
  metadataUrl?: string;
  title: string;
  durationMilliseconds?: number | null;
  durationSeconds?: number | null;
  active?: boolean;
  compact?: boolean;
  fillWorkspace?: boolean;
  romantic?: boolean;
  formatLabel?: string;
}): React.JSX.Element {
  const hasTrack = Boolean(src?.trim() || youtubeVideoId?.trim());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLElement | null>(null);
  const youtubeIframeRef = useRef<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayer | null>(null);
  const youtubePendingPlayRef = useRef(false);
  const youtubeMutedRef = useRef(false);
  const youtubeUnmuteAfterPlayRef = useRef(false);
  const youtubeMetadataRequestRef = useRef(false);
  const confettiRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const discSpinRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const discMotionRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const mediaPlayingRef = useRef(false);
  const seekDiscRef = useRef<(delta: number) => void>(() => undefined);
  const resumeDiscSpinRef = useRef<() => void>(() => undefined);
  const pendingSeekRef = useRef<number | null>(null);
  const progressTimeRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [youtubeEmbedOpen, setYoutubeEmbedOpen] = useState(false);
  const [youtubePlaybackRequested, setYoutubePlaybackRequested] =
    useState(false);
  const [playing, setPlaying] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    durationMilliseconds && durationMilliseconds > 0
      ? durationMilliseconds / 1000
      : durationSeconds && durationSeconds > 0
        ? durationSeconds
        : 0,
  );
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [noTrackMessage, setNoTrackMessage] = useState<string | null>(null);
  const [displayTitle, setDisplayTitle] = useState(title);
  const [mounted, setMounted] = useState(false);
  const progressRatio =
    duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;

  function stopDiscMotion(): void {
    discSpinRef.current?.pause();
    discMotionRef.current?.kill();
    discMotionRef.current = null;
  }

  function startDiscSpin(): void {
    const disc = discRef.current;
    if (
      !disc ||
      !mediaPlayingRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (discSpinRef.current) {
      discSpinRef.current.resume();
      return;
    }
    const rotation = Number(gsap.getProperty(disc, "rotation"));
    discSpinRef.current = gsap.to(disc, {
      rotation: (Number.isFinite(rotation) ? rotation : 0) + 360,
      duration: 8,
      ease: "none",
      repeat: -1,
      transformOrigin: "50% 50%",
    });
  }

  function animateDiscForSeek(delta: number): void {
    const disc = discRef.current;
    if (!disc || !mediaPlayingRef.current || Math.abs(delta) < 0.01) return;

    const now = performance.now();
    const previousSeekAt = lastSeekAtRef.current;
    const elapsedSeconds =
      previousSeekAt !== null && now - previousSeekAt < 500
        ? Math.max((now - previousSeekAt) / 1000, 0.016)
        : 0.16;
    lastSeekAtRef.current = now;

    // Larger and faster slider movements produce a quicker, more noticeable
    // scrub while preserving the direction of the user's seek.
    const seekVelocity = Math.abs(delta) / elapsedSeconds;
    const rotationSpeed = Math.min(
      Math.max(620 + seekVelocity * 18, 620),
      2400,
    );
    const rotationDistance = Math.min(Math.max(Math.abs(delta) * 32, 18), 540);
    const duration = Math.min(
      Math.max(rotationDistance / rotationSpeed, 0.12),
      0.46,
    );
    const rotation = Number(gsap.getProperty(disc, "rotation"));
    const targetRotation =
      (Number.isFinite(rotation) ? rotation : 0) +
      Math.sign(delta) * rotationDistance;

    stopDiscMotion();
    discSpinRef.current?.kill();
    discSpinRef.current = null;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(disc, { rotation: targetRotation });
      return;
    }

    discMotionRef.current = gsap.to(disc, {
      rotation: targetRotation,
      duration,
      ease: "power2.out",
      overwrite: "auto",
      onComplete: () => {
        discMotionRef.current = null;
        resumeDiscSpinRef.current();
      },
    });
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    stopDiscMotion();
    if (audioRef.current) audioRef.current.muted = false;
    pendingSeekRef.current = null;
    progressTimeRef.current = null;
    lastSeekAtRef.current = null;
    youtubePendingPlayRef.current = false;
    youtubeMutedRef.current = false;
    youtubeUnmuteAfterPlayRef.current = false;
    youtubeMetadataRequestRef.current = false;
    setYoutubePlaybackRequested(false);
    setPlaying(false);
    setMediaPlaying(false);
    setCurrentTime(0);
    setPlaybackError(null);
    setNoTrackMessage(null);
    setDisplayTitle(title);
    setYoutubeEmbedOpen(false);
    setExpanded(!compact);
    setDuration(
      durationMilliseconds && durationMilliseconds > 0
        ? durationMilliseconds / 1000
        : durationSeconds && durationSeconds > 0
          ? durationSeconds
          : 0,
    );
    setMuted(false);
  }, [
    compact,
    durationMilliseconds,
    durationSeconds,
    src,
    title,
    youtubeVideoId,
  ]);

  useEffect(() => {
    if (!youtubeVideoId || !active || !mounted) return;
    if (youtubePlayerRef.current) return;

    let cancelled = false;
    void loadYouTubeIframeApi()
      .then((api) => {
        const playerMount = youtubeIframeRef.current;
        if (cancelled || !playerMount || youtubePlayerRef.current) return;
        new api.Player(playerMount, {
          videoId: youtubeVideoId,
          playerVars: {
            controls: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              if (cancelled) {
                event.target.destroy();
                return;
              }
              youtubePlayerRef.current = event.target;
              event.target.getIframe().title = `YouTube player: ${displayTitle}`;
              const playerDuration = event.target.getDuration();
              if (Number.isFinite(playerDuration) && playerDuration > 0) {
                setDuration(playerDuration);
              }
              if (youtubeMutedRef.current) event.target.mute();
              setMuted(youtubeMutedRef.current || event.target.isMuted());
              if (youtubePendingPlayRef.current) {
                if (youtubeUnmuteAfterPlayRef.current) event.target.mute();
                event.target.playVideo();
                youtubePendingPlayRef.current = false;
              }
            },
            onStateChange: (event) => {
              setMediaPlaying(event.data === 1);
              const playerDuration = event.target.getDuration();
              if (Number.isFinite(playerDuration) && playerDuration > 0) {
                setDuration(playerDuration);
              }
              if (event.data === 1) {
                if (youtubeUnmuteAfterPlayRef.current) {
                  event.target.unMute();
                  youtubeUnmuteAfterPlayRef.current = false;
                  setMuted(false);
                }
                setPlaying(true);
                setYoutubePlaybackRequested(false);
                setPlaybackError(null);
              } else if (event.data === 0) {
                const playerTime = event.target.getCurrentTime();
                if (Number.isFinite(playerTime)) setCurrentTime(playerTime);
                setPlaying(false);
                setYoutubePlaybackRequested(false);
              } else if (event.data === 2) {
                const playerTime = event.target.getCurrentTime();
                if (Number.isFinite(playerTime)) setCurrentTime(playerTime);
                setPlaying(false);
                setYoutubePlaybackRequested(false);
              }
            },
            onError: () => {
              setPlaying(false);
              setMediaPlaying(false);
              setYoutubePlaybackRequested(false);
              setPlaybackError("This YouTube video cannot be played here.");
            },
            onAutoplayBlocked: () => {
              youtubePendingPlayRef.current = false;
              setPlaying(false);
              setMediaPlaying(false);
              setYoutubePlaybackRequested(false);
              setPlaybackError(
                "Use the YouTube player below to start playback.",
              );
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) {
          setYoutubePlaybackRequested(false);
          setPlaybackError("The YouTube player could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, displayTitle, mounted, youtubeVideoId]);

  useEffect(() => {
    const iframe = youtubePlayerRef.current?.getIframe();
    if (iframe) iframe.title = `YouTube player: ${displayTitle}`;
  }, [displayTitle]);

  useEffect(() => {
    return () => {
      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = null;
    };
  }, [youtubeVideoId]);

  useEffect(() => {
    if (
      !youtubeVideoId ||
      !metadataUrl ||
      !active ||
      (compact && !youtubeEmbedOpen)
    ) {
      return;
    }
    if (youtubeMetadataRequestRef.current) return;
    youtubeMetadataRequestRef.current = true;
    let cancelled = false;
    void fetch(metadataUrl, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) return;
        const payload: unknown = await response.json();
        return pageAudioLinkResponseSchema.parse(payload).audioLink;
      })
      .then((link) => {
        if (!cancelled && link?.videoId === youtubeVideoId) {
          setDisplayTitle(link.displayTitle);
          if (link.durationSeconds && link.durationSeconds > 0) {
            setDuration(link.durationSeconds);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [active, compact, metadataUrl, youtubeEmbedOpen, youtubeVideoId]);

  useEffect(() => {
    if (!youtubeVideoId || !playing) return;
    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const playerTime = player.getCurrentTime();
      const playerDuration = player.getDuration();
      if (Number.isFinite(playerTime)) {
        progressTimeRef.current = playerTime;
        setCurrentTime(playerTime);
      }
      if (Number.isFinite(playerDuration) && playerDuration > 0) {
        setDuration(playerDuration);
      }
      setMuted(player.isMuted());
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing, youtubeVideoId]);

  useEffect(() => {
    const pausePlayback = () => {
      youtubePendingPlayRef.current = false;
      youtubeUnmuteAfterPlayRef.current = false;
      setYoutubePlaybackRequested(false);
      audioRef.current?.pause();
      youtubePlayerRef.current?.pauseVideo();
      stopDiscMotion();
      setPlaying(false);
      setMediaPlaying(false);
    };
    if (!active || document.visibilityState === "hidden") pausePlayback();

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") pausePlayback();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [active]);

  useGSAP(
    (_context, contextSafe) => {
      if (contextSafe) {
        seekDiscRef.current = contextSafe((delta: number) => {
          animateDiscForSeek(delta);
        });
        resumeDiscSpinRef.current = contextSafe(() => {
          startDiscSpin();
        });
      } else {
        seekDiscRef.current = animateDiscForSeek;
        resumeDiscSpinRef.current = startDiscSpin;
      }

      return () => {
        discSpinRef.current = null;
        discMotionRef.current = null;
        seekDiscRef.current = () => undefined;
        resumeDiscSpinRef.current = () => undefined;
      };
    },
    {
      dependencies: [expanded, src, youtubeVideoId],
      revertOnUpdate: true,
      scope: playerRef,
    },
  );

  useGSAP(
    () => {
      mediaPlayingRef.current = active && mediaPlaying;
      if (expanded && mediaPlayingRef.current) {
        resumeDiscSpinRef.current();
      } else {
        stopDiscMotion();
      }
    },
    {
      dependencies: [active, expanded, mediaPlaying],
      scope: playerRef,
    },
  );

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => {
      if (preference.matches) stopDiscMotion();
      else resumeDiscSpinRef.current();
    };
    preference.addEventListener("change", syncMotion);
    return () => preference.removeEventListener("change", syncMotion);
  }, []);

  useGSAP(
    () => {
      const pieces = Array.from(
        confettiRef.current?.querySelectorAll<HTMLElement>(
          "[data-confetti-piece]",
        ) ?? [],
      );
      if (!expanded || !mediaPlaying || romantic) return;

      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        if (pieces.length === 0) return;

        gsap.set(pieces, {
          autoAlpha: 0,
          scale: 0.45,
          x: 0,
          y: 6,
          rotation: 0,
        });

        const timeline = gsap.timeline({
          repeat: -1,
          repeatDelay: 0.35,
        });

        pieces.forEach((piece, index) => {
          const lift = gsap.utils.random(34, 76);
          const drift = gsap.utils.random(-28, 28);
          const duration = gsap.utils.random(1.5, 2.2);
          const start = index * 0.13;

          timeline
            .fromTo(
              piece,
              {
                autoAlpha: 0,
                scale: 0.45,
                x: 0,
                y: 6,
                rotation: gsap.utils.random(-18, 18),
              },
              {
                autoAlpha: 1,
                duration: duration * 0.34,
                ease: "power2.out",
                scale: 1,
                x: drift * 0.45,
                y: -lift * 0.36,
                rotation: gsap.utils.random(-70, 70),
              },
              start,
            )
            .to(
              piece,
              {
                autoAlpha: 0,
                duration: duration * 0.66,
                ease: "power1.in",
                scale: 0.7,
                x: drift,
                y: -lift,
                rotation: gsap.utils.random(-220, 220),
              },
              start + duration * 0.34,
            );
        });
      });

      return () => {
        motion.revert();
      };
    },
    {
      dependencies: [expanded, mediaPlaying, romantic],
      revertOnUpdate: true,
      scope: playerRef,
    },
  );

  async function togglePlayback(): Promise<void> {
    if (!hasTrack) {
      setExpanded(true);
      setNoTrackMessage("No song has been added yet. Add one to play it here.");
      return;
    }

    setNoTrackMessage(null);
    setPlaybackError(null);

    if (youtubeVideoId) {
      setExpanded(true);
      setYoutubeEmbedOpen(true);
      if (playing) {
        youtubePlayerRef.current?.pauseVideo();
        setYoutubePlaybackRequested(false);
        setPlaying(false);
        setMediaPlaying(false);
        return;
      }
      setYoutubePlaybackRequested(true);
      youtubePendingPlayRef.current = true;
      youtubeUnmuteAfterPlayRef.current = !muted;
      youtubeUnmuteAfterPlayRef.current = !muted;
      const youtubePlayer = youtubePlayerRef.current;
      if (youtubePlayer) {
        youtubePlayer.playVideo();
        youtubePendingPlayRef.current = false;
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
        await audio.play();
        setExpanded(true);
      } else {
        audio.pause();
      }
    } catch {
      stopDiscMotion();
      setPlaying(false);
      setMediaPlaying(false);
      setExpanded(true);
      setPlaybackError("This song could not be played right now.");
    }
  }

  function toggleMute(): void {
    if (!hasTrack) return;

    if (youtubeVideoId) {
      const nextMuted = !muted;
      youtubeMutedRef.current = nextMuted;
      setMuted(nextMuted);
      if (nextMuted) youtubePlayerRef.current?.mute();
      else youtubePlayerRef.current?.unMute();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }

  function openPlayer(): void {
    setExpanded(true);
    setYoutubeEmbedOpen(Boolean(youtubeVideoId));
    setPlaybackError(null);

    if (!hasTrack) {
      setNoTrackMessage("No song has been added yet. Add one to play it here.");
      return;
    }
    setNoTrackMessage(null);
    setNoTrackMessage(null);
    void togglePlayback();
  }

  function seek(nextTime: number): void {
    if (!hasTrack) return;

    if (youtubeVideoId) {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const youtubeDuration = player.getDuration();
      const actualDuration =
        Number.isFinite(youtubeDuration) && youtubeDuration > 0
          ? youtubeDuration
          : duration;
      if (actualDuration <= 0) return;
      const clampedTime = clampTime(nextTime, actualDuration);
      const previousTime = player.getCurrentTime();
      player.seekTo(clampedTime, true);
      progressTimeRef.current = clampedTime;
      seekDiscRef.current(clampedTime - previousTime);
      setCurrentTime(clampedTime);
      return;
    }

    const audio = audioRef.current;
    const audioDuration =
      audio && Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : duration;
    const clampedTime = clampTime(nextTime, audioDuration);
    const previousTime =
      progressTimeRef.current ??
      (audio && Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : currentTime);

    if (!audio || audioDuration <= 0) return;

    if (audio.readyState >= 1) {
      audio.currentTime = clampedTime;
      pendingSeekRef.current = null;
    } else {
      pendingSeekRef.current = clampedTime;
    }

    progressTimeRef.current = clampedTime;
    seekDiscRef.current(clampedTime - previousTime);
    setCurrentTime(clampedTime);
  }

  return (
    <section
      ref={playerRef}
      className={`${expanded ? styles.player : styles.compactPlayer}${expanded && fillWorkspace ? ` ${styles.workspacePlayer}` : ""}${romantic ? ` ${styles.romanticPlayer}` : ""}`}
      aria-label={`Audio player: ${displayTitle}`}
    >
      {src ? (
        <audio
          ref={audioRef}
          className={styles.audio}
          src={src}
          preload="none"
          onLoadedMetadata={(event) => {
            const nextDuration = event.currentTarget.duration;
            if (Number.isFinite(nextDuration) && nextDuration > 0) {
              setDuration(nextDuration);

              const pendingSeek = pendingSeekRef.current;
              if (pendingSeek !== null) {
                const clampedTime = clampTime(pendingSeek, nextDuration);
                event.currentTarget.currentTime = clampedTime;
                pendingSeekRef.current = null;
                setCurrentTime(clampedTime);
              }
            }
          }}
          onEnded={() => {
            stopDiscMotion();
            setPlaying(false);
            setMediaPlaying(false);
          }}
          onPause={() => {
            stopDiscMotion();
            setPlaying(false);
            setMediaPlaying(false);
          }}
          onPlay={() => setPlaying(true)}
          onPlaying={() => setMediaPlaying(true)}
          onWaiting={() => {
            stopDiscMotion();
            setMediaPlaying(false);
          }}
          onSeeking={() => {
            stopDiscMotion();
            setMediaPlaying(false);
          }}
          onError={() => {
            stopDiscMotion();
            setPlaying(false);
            setMediaPlaying(false);
            setExpanded(true);
            setPlaybackError("This song could not be played right now.");
          }}
          onTimeUpdate={(event) => {
            const nextTime = event.currentTarget.currentTime;
            progressTimeRef.current = nextTime;
            setCurrentTime(nextTime);
          }}
        />
      ) : null}

      {expanded ? (
        <>
          <div ref={confettiRef} className={styles.confetti} aria-hidden="true">
            {CONFETTI_PIECES.map((piece, index) => (
              <span
                key={`${piece.kind}-${index}`}
                className={`${styles.confettiPiece} ${CONFETTI_KIND_CLASS[piece.kind]}`}
                data-confetti-piece
                style={
                  {
                    "--piece-left": `${piece.left}%`,
                    "--piece-bottom": `${piece.bottom}px`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className={styles.heading}>
            <span className={styles.note} aria-hidden="true">
              {romantic ? <MusicIcon name="note" /> : null}
            </span>
            {romantic ? (
              <div className={styles.trackDetails}>
                <span className={styles.title}>{displayTitle}</span>
                <span className={styles.trackMetadata}>
                  {formatLabel}
                  {duration > 0 ? ` · ${formatTime(duration)}` : ""}
                </span>
              </div>
            ) : (
              <span className={styles.title}>{displayTitle}</span>
            )}
            {romantic ? (
              <MusicIcon name="heart" className={styles.trackHeart} />
            ) : null}
          </div>

          <div className={romantic ? styles.recordStage : styles.discStage}>
            {romantic ? (
              <svg
                className={styles.recordWaves}
                viewBox="0 0 800 300"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M-20 150C80 150 100 55 200 55S320 245 420 245 540 55 640 55 740 150 820 150" />
                <path d="M-20 150C80 150 100 75 200 75S320 225 420 225 540 75 640 75 740 150 820 150" />
                <path d="M-20 150C80 150 100 95 200 95S320 205 420 205 540 95 640 95 740 150 820 150" />
                <path d="M-20 150C80 150 100 115 200 115S320 185 420 185 540 115 640 115 740 150 820 150" />
                <path d="M-20 150C80 150 100 185 200 185S320 115 420 115 540 185 640 185 740 150 820 150" />
                <path d="M-20 150C80 150 100 205 200 205S320 95 420 95 540 205 640 205 740 150 820 150" />
                <path d="M-20 150C80 150 100 225 200 225S320 75 420 75 540 225 640 225 740 150 820 150" />
                <path d="M-20 150C80 150 100 245 200 245S320 55 420 55 540 245 640 245 740 150 820 150" />
              </svg>
            ) : null}
            <div ref={discRef} className={styles.disc} aria-hidden="true">
              <span className={styles.discShine} />
              <span className={styles.discMarker} />
              <span className={styles.discLabel}>
                {romantic ? <MusicIcon name="heart" /> : null}
              </span>
            </div>
            {romantic ? (
              <>
                <RecordTonearm
                  className={styles.tonearm}
                  playing={active && mediaPlaying}
                />
              </>
            ) : null}
          </div>

          <div className={styles.transport}>
            <div className={romantic ? styles.progressShell : undefined}>
              {romantic ? (
                <span
                  className={styles.progressFill}
                  style={{ width: `${progressRatio * 100}%` }}
                  aria-hidden="true"
                />
              ) : null}
              <input
                aria-label="Song progress"
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                className={`${styles.progress}${romantic ? ` ${styles.progressOverlay}` : ""}`}
                style={
                  {
                    "--progress-position": `${progressRatio * 100}%`,
                  } as CSSProperties
                }
                type="range"
                min="0"
                max={duration || 0}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                disabled={!hasTrack || duration === 0}
                onChange={(event) => seek(Number(event.currentTarget.value))}
              />
            </div>

            {romantic ? (
              <div className={styles.timeLabels}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            ) : null}

            <div className={styles.controls}>
              {romantic ? (
                <button
                  className={styles.skipButton}
                  type="button"
                  aria-label="Back 15 seconds"
                  disabled={!hasTrack || duration === 0}
                  onClick={() => seek(currentTime - 15)}
                >
                  <MusicIcon name="back" />
                </button>
              ) : null}
              <button
                className={styles.playButton}
                type="button"
                onClick={() => void togglePlayback()}
                aria-pressed={playing}
                aria-busy={youtubePlaybackRequested}
                disabled={youtubePlaybackRequested}
                aria-label={
                  youtubePlaybackRequested
                    ? `Loading ${displayTitle}`
                    : playing
                      ? `Pause ${displayTitle}`
                      : `Play ${displayTitle}`
                }
              >
                {youtubePlaybackRequested ? (
                  <span className={styles.loadingSpinner} aria-hidden="true" />
                ) : (
                  <span
                    className={`${styles.playIcon} ${playing ? styles.playIconPause : ""}`}
                    aria-hidden="true"
                  />
                )}
                <span className={romantic ? styles.controlLabel : undefined}>
                  {youtubePlaybackRequested
                    ? "Loading"
                    : playing
                      ? "Pause"
                      : "Play"}
                </span>
              </button>

              {romantic ? (
                <button
                  className={styles.skipButton}
                  type="button"
                  aria-label="Forward 15 seconds"
                  disabled={!hasTrack || duration === 0}
                  onClick={() => seek(currentTime + 15)}
                >
                  <MusicIcon name="forward" />
                </button>
              ) : null}

              <button
                className={styles.muteButton}
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? "Unmute song" : "Mute song"}
                title={muted ? "Unmute song" : "Mute song"}
                disabled={!hasTrack}
              >
                {romantic ? (
                  <MusicIcon name="volume" />
                ) : (
                  <span className={styles.muteIcon} aria-hidden="true" />
                )}
              </button>

              <span className={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
          {noTrackMessage ? (
            <p className={styles.emptyTrack} role="status">
              {noTrackMessage}
            </p>
          ) : null}
          {playbackError && !youtubeVideoId ? (
            <div className={styles.errorBlock}>
              <p className={styles.error} role="alert">
                {playbackError}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <button
          className={styles.compactButton}
          type="button"
          onClick={openPlayer}
          aria-label={
            youtubeVideoId
              ? `Play ${displayTitle} on YouTube`
              : `Play ${displayTitle}`
          }
        >
          <span className={styles.playIcon} aria-hidden="true" />
          <span>Play a song</span>
        </button>
      )}
      {youtubeVideoId && mounted ? (
        <div className={styles.youtubeEmbedHidden}>
          <div
            ref={youtubeIframeRef}
            aria-label={`YouTube player: ${displayTitle}`}
          />
        </div>
      ) : null}
    </section>
  );
}
