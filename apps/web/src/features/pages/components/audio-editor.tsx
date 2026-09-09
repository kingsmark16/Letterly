"use client";

import type { OwnerPageAudio } from "@letterly/contracts/pages";
import { useRef, useState } from "react";
import {
  completeAudioUpload,
  prepareAudioUpload,
  removeAudio,
  sha256Base64,
  uploadAudioSource,
  WebApiError,
} from "../../../lib/api-client";
import { SecretLetterAudioPlayer } from "../../../templates/secret-letter/audio-player";

const MAX_AUDIO_BYTES = 26_214_400;
const ACCEPTED_TYPES = new Set(["audio/mpeg", "audio/mp4"]);

function titleFromFile(file: File): string {
  return (file.name.replace(/\.[^/.]+$/, "").trim() || "Untitled song").slice(
    0,
    120,
  );
}

function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(
        Number.isFinite(audio.duration)
          ? Math.round(audio.duration * 1000)
          : undefined,
      );
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    audio.src = url;
  });
}

export function AudioEditor({
  pageId,
  initialAudio,
  readOnly = false,
}: {
  pageId: string;
  initialAudio?: OwnerPageAudio;
  readOnly?: boolean;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "ready">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [audio, setAudio] = useState(initialAudio);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function upload(file: File): Promise<void> {
    const title = titleFromFile(file);
    setState("uploading");
    setMessage(null);
    try {
      const [sha256, durationMilliseconds] = await Promise.all([
        sha256Base64(file),
        readDuration(file),
      ]);
      const prepared = await prepareAudioUpload(pageId, {
        contentType: file.type as "audio/mpeg" | "audio/mp4",
        byteSize: file.size,
        sha256,
        title,
        ...(durationMilliseconds ? { durationMilliseconds } : {}),
        rightsConfirmed: true,
      });
      await uploadAudioSource({
        uploadUrl: prepared.uploadUrl,
        requiredHeaders: prepared.requiredHeaders,
        file,
      });
      await completeAudioUpload(pageId, prepared.audioId);
      setAudio({
        audioId: prepared.audioId,
        state: "READY",
        mediaUrl: `/api/v1/pages/${pageId}/audio`,
        title,
        durationMilliseconds: durationMilliseconds ?? null,
        failureCode: null,
      });
      setSelectedFile(null);
      setSelectedTitle(null);
      setState("ready");
      setMessage("Your song is ready to preview.");
    } catch (error) {
      setState("idle");
      setMessage(
        error instanceof WebApiError
          ? error.message
          : "Audio upload could not be completed.",
      );
    }
  }

  async function remove(): Promise<void> {
    setState("uploading");
    setMessage(null);
    try {
      await removeAudio(pageId);
      setAudio(undefined);
      setState("idle");
      setMessage("Audio removed.");
    } catch (error) {
      setState("idle");
      setMessage(
        error instanceof WebApiError
          ? error.message
          : "Audio could not be removed.",
      );
    }
  }

  const canUpload = Boolean(
    selectedFile && rightsConfirmed && state !== "uploading",
  );

  return (
    <section
      aria-labelledby="audio-heading"
      className="mt-8 mb-12 space-y-5 rounded-3xl border border-rose-200/70 bg-[#fffdfa] p-6 shadow-sm sm:p-7"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-600">
          Letter audio
        </p>
        <h2 id="audio-heading" className="mt-2 font-serif text-2xl text-ink">
          Add a song to this letter
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
          Choose one MP3 or M4A track. Your recipient will hear it only after
          pressing Play.
        </p>
      </div>
      {audio?.mediaUrl ? (
        <SecretLetterAudioPlayer src={audio.mediaUrl} title={audio.title} />
      ) : null}
      {selectedTitle ? (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-600">
            Ready to upload
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{selectedTitle}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Preview becomes available after the upload finishes.
          </p>
        </div>
      ) : null}
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
        <input
          className="size-4 accent-rose-600"
          type="checkbox"
          checked={rightsConfirmed}
          disabled={readOnly || state === "uploading"}
          onChange={(event) => setRightsConfirmed(event.target.checked)}
        />
        <span>I own this track or have permission to share it.</span>
      </label>
      {selectedFile && !rightsConfirmed ? (
        <p className="text-sm text-ink-muted">
          Check the permission box to enable “Upload song.”
        </p>
      ) : null}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="audio/mpeg,audio/mp4,.mp3,.m4a"
        disabled={readOnly || state === "uploading"}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_AUDIO_BYTES)
              setMessage("Choose an MP3 or M4A file up to 25 MB.");
            else {
              setSelectedFile(file);
              setSelectedTitle(titleFromFile(file));
              setMessage(null);
            }
          }
          event.currentTarget.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={readOnly || state === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          {selectedFile
            ? "Choose a different song"
            : audio
              ? "Replace song"
              : "Choose audio"}
        </button>
        {selectedFile ? (
          <button
            type="button"
            className="rounded-full bg-rose-700 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!canUpload || readOnly}
            onClick={() => void upload(selectedFile)}
          >
            {state === "uploading" ? "Uploading..." : "Upload song"}
          </button>
        ) : null}
        {audio ? (
          <button
            type="button"
            className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50"
            disabled={readOnly || state === "uploading"}
            onClick={() => void remove()}
          >
            Remove song
          </button>
        ) : null}
      </div>
      {message ? (
        <p role="status" className="text-sm text-ink-muted">
          {message}
        </p>
      ) : null}
    </section>
  );
}
