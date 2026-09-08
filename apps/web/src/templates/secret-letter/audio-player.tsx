"use client";

import { useRef, useState } from "react";

export function SecretLetterAudioPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

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

  return <div>
    <audio ref={audioRef} src={src} preload="none" onEnded={() => setPlaying(false)} />
    <button
      className={className}
      type="button"
      onClick={() => void togglePlayback()}
      aria-pressed={playing}
    >
      {playing ? "Pause song" : "Play a song"}
    </button>
  </div>;
}
