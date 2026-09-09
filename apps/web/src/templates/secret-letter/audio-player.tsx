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
  const confettiRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = false;
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
    () => {
      const pieces = Array.from(
        confettiRef.current?.querySelectorAll<HTMLElement>(
          "[data-confetti-piece]",
        ) ?? [],
      );
      if (!expanded || !playing || pieces.length === 0) return;

      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
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

      return () => motion.revert();
    },
    {
      dependencies: [expanded, playing],
      revertOnUpdate: true,
      scope: confettiRef,
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
    if (audio) audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <section
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
          }
        }}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onError={() => {
          setPlaying(false);
          setExpanded(true);
          setPlaybackError("This song could not be played right now.");
        }}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
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

          <div
            className={`${styles.waveform} ${playing ? styles.waveformActive : ""}`}
            aria-hidden="true"
          >
            {Array.from({ length: 18 }, (_, index) => (
              <span
                key={index}
                style={
                  {
                    "--bar-height": `${25 + ((index * 17) % 60)}%`,
                    "--bar-delay": `${index * 45}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

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

            <input
              aria-label="Song progress"
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              className={styles.progress}
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={Math.min(currentTime, duration || 0)}
              disabled={duration === 0}
              onChange={(event) => seek(Number(event.currentTarget.value))}
            />

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
