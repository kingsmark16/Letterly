"use client";

import { useRef, useState } from "react";
import styles from "./audio-player.module.css";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function SecretLetterAudioPlayer({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      await audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  return <section className={styles.player} aria-label={`Audio player: ${title}`}>
    <audio ref={audioRef} src={src} preload="none" onDurationChange={(event) => setDuration(event.currentTarget.duration)} onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} />
    <span className={styles.title}>{title}</span>
    <div className={styles.controls}>
    <button
      className={className}
      type="button"
      onClick={() => void togglePlayback()}
      aria-pressed={playing}
    >
      {playing ? "Pause" : "Play"}
    </button>
    <input aria-label="Song progress" className={styles.progress} type="range" min="0" max={duration || 0} step="0.1" value={Math.min(currentTime, duration || 0)} disabled={duration === 0} onChange={(event) => { const nextTime = Number(event.currentTarget.value); if (audioRef.current) audioRef.current.currentTime = nextTime; setCurrentTime(nextTime); }} />
    <span className={styles.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
    </div>
  </section>;
}
