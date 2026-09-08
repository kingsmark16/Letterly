"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import styles from "./audio-player.module.css";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function SecretLetterAudioPlayer({
  src,
  title,
}: {
  src: string;
  title: string;
}): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setPlaying(false);
    }
  }

  function seek(nextTime: number): void {
    const audio = audioRef.current;
    if (audio) audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <section className={styles.player} aria-label={`Audio player: ${title}`}>
      <audio
        ref={audioRef}
        className={styles.audio}
        src={src}
        preload="none"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      />

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

        <span className={styles.time}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </section>
  );
}
