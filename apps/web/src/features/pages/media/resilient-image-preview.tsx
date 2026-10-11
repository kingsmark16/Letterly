"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const PREVIEW_LOAD_ATTEMPTS = 3;
const PREVIEW_RETRY_BASE_DELAY_MS = 250;

function retryableMediaUrl(source: string, attempt: number): string {
  if (attempt === 0 || !source.startsWith("/")) return source;

  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}previewAttempt=${attempt}`;
}

export function ResilientImagePreview({
  localUrl,
  mediaUrl,
}: {
  localUrl?: string;
  mediaUrl: string | null;
}): React.JSX.Element {
  const initialSource = localUrl ?? mediaUrl;
  const [source, setSource] = useState(initialSource);
  const [attempt, setAttempt] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    },
    [],
  );

  if (!source) {
    return (
      <span className="px-4 text-center text-small text-ink-muted">
        Image preview unavailable
      </span>
    );
  }

  return (
    <Image
      key={`${source}:${attempt}`}
      className="h-full w-full object-cover"
      src={retryableMediaUrl(source, attempt)}
      alt=""
      fill
      sizes="(max-width: 640px) 76vw, (max-width: 1200px) 38vw, 520px"
      unoptimized
      onLoad={() => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }}
      onError={() => {
        if (source === localUrl && mediaUrl) {
          setSource(mediaUrl);
          setAttempt(0);
          return;
        }

        if (attempt + 1 >= PREVIEW_LOAD_ATTEMPTS) return;

        retryTimeoutRef.current = setTimeout(
          () => {
            setAttempt((current) => current + 1);
            retryTimeoutRef.current = null;
          },
          PREVIEW_RETRY_BASE_DELAY_MS * 2 ** attempt,
        );
      }}
    />
  );
}
