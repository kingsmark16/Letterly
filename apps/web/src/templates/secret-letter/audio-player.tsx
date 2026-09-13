"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./audio-player.module.css";

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
  title,
  durationMilliseconds,
  compact = false,
}: {
  src: string;
  title: string;
  durationMilliseconds?: number | null;
  compact?: boolean;
}): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLElement | null>(null);
  const confettiRef = useRef<HTMLDivElement | null>(null);
  const discRef = useRef<HTMLDivElement | null>(null);
  const discMotionRef = useRef<ReturnType<typeof gsap.to> | null>(null);
  const seekDiscRef = useRef<(delta: number) => void>(() => undefined);
  const resumeDiscSpinRef = useRef<() => void>(() => undefined);
  const pendingSeekRef = useRef<number | null>(null);
  const progressTimeRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(!compact);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(
    durationMilliseconds && durationMilliseconds > 0
      ? durationMilliseconds / 1000
      : 0,
  );
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const progressRatio =
    duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;

  function stopDiscMotion(): void {
    if (discRef.current) gsap.killTweensOf(discRef.current);
    discMotionRef.current = null;
  }

  function startDiscSpin(): void {
    const disc = discRef.current;
    const audio = audioRef.current;
    if (!disc || !audio || audio.paused) return;

    gsap.killTweensOf(disc);
    const rotation = Number(gsap.getProperty(disc, "rotation"));
    discMotionRef.current = gsap.to(disc, {
      rotation: (Number.isFinite(rotation) ? rotation : 0) + 360,
      duration: 8,
      ease: "none",
      repeat: -1,
      transformOrigin: "50% 50%",
    });
  }

  function animateDiscForSeek(delta: number): void {
    const disc = discRef.current;
    if (!disc || Math.abs(delta) < 0.01) return;

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
    const rotationDistance = Math.min(
      Math.max(Math.abs(delta) * 32, 18),
      540,
    );
    const duration = Math.min(
      Math.max(rotationDistance / rotationSpeed, 0.12),
      0.46,
    );
    const rotation = Number(gsap.getProperty(disc, "rotation"));
    const targetRotation =
      (Number.isFinite(rotation) ? rotation : 0) +
      Math.sign(delta) * rotationDistance;

    stopDiscMotion();

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
    stopDiscMotion();
    if (audioRef.current) audioRef.current.muted = false;
    pendingSeekRef.current = null;
    progressTimeRef.current = null;
    lastSeekAtRef.current = null;
    setPlaying(false);
    setCurrentTime(0);
    setPlaybackError(null);
    setDuration(
      durationMilliseconds && durationMilliseconds > 0
        ? durationMilliseconds / 1000
        : 0,
    );
    setMuted(false);
  }, [durationMilliseconds, src]);

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

      const pieces = Array.from(
        confettiRef.current?.querySelectorAll<HTMLElement>(
          "[data-confetti-piece]",
        ) ?? [],
      );
      if (!expanded || !playing) return;

      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        startDiscSpin();

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
        seekDiscRef.current = () => undefined;
        resumeDiscSpinRef.current = () => undefined;
        discMotionRef.current = null;
      };
    },
    {
      dependencies: [expanded, playing],
      revertOnUpdate: true,
      scope: playerRef,
    },
  );

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaybackError(null);
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
      setExpanded(true);
      setPlaybackError("This song could not be played right now.");
    }
  }

  function toggleMute(): void {
    const audio = audioRef.current;
    if (!audio) return;

    const nextMuted = !audio.muted;
    audio.muted = nextMuted;
    setMuted(nextMuted);
  }

  function seek(nextTime: number): void {
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
      className={expanded ? styles.player : styles.compactPlayer}
      aria-label={`Audio player: ${title}`}
    >
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
        }}
        onPause={() => {
          stopDiscMotion();
          setPlaying(false);
        }}
        onPlay={() => setPlaying(true)}
        onError={() => {
          stopDiscMotion();
          setPlaying(false);
          setExpanded(true);
          setPlaybackError("This song could not be played right now.");
        }}
        onTimeUpdate={(event) => {
          const nextTime = event.currentTarget.currentTime;
          progressTimeRef.current = nextTime;
          setCurrentTime(nextTime);
        }}
      />

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
            <span className={styles.note} aria-hidden="true" />
            <span className={styles.title}>{title}</span>
          </div>

          <div ref={discRef} className={styles.disc} aria-hidden="true">
            <span className={styles.discShine} />
            <span className={styles.discMarker} />
            <span className={styles.discLabel} />
          </div>

          <input
            aria-label="Song progress"
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            className={styles.progress}
            style={{ "--progress-position": `${progressRatio * 100}%` } as CSSProperties}
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            disabled={duration === 0}
            onChange={(event) => seek(Number(event.currentTarget.value))}
          />

          <div className={styles.controls}>
            <button
              className={styles.playButton}
              type="button"
              onClick={() => void togglePlayback()}
              aria-pressed={playing}
              aria-label={playing ? `Pause ${title}` : `Play ${title}`}
            >
              <span
                className={`${styles.playIcon} ${playing ? styles.playIconPause : ""}`}
                aria-hidden="true"
              />
              <span>{playing ? "Pause" : "Play"}</span>
            </button>

            <button
              className={styles.muteButton}
              type="button"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label={muted ? "Unmute song" : "Mute song"}
            >
              <span className={styles.muteIcon} aria-hidden="true" />
              <span>{muted ? "Unmute" : "Mute"}</span>
            </button>

            <span className={styles.time}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          {playbackError ? (
            <p className={styles.error} role="alert">
              {playbackError}
            </p>
          ) : null}
        </>
      ) : (
        <button
          className={styles.compactButton}
          type="button"
          onClick={() => void togglePlayback()}
          aria-label="Play a song"
        >
          <span className={styles.playIcon} aria-hidden="true" />
          <span>Play a song</span>
        </button>
      )}
    </section>
  );
}
