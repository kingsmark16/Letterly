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

const MAX_AUDIO_BYTES = 26_214_400;
const ACCEPTED_TYPES = new Set(["audio/mpeg", "audio/mp4"]);

function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    audio.src = url;
  });
}

export function AudioEditor({ pageId, initialAudio, readOnly = false }: { pageId: string; initialAudio?: OwnerPageAudio; readOnly?: boolean }): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "uploading" | "ready">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [audio, setAudio] = useState(initialAudio);

  async function upload(file: File): Promise<void> {
    if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_AUDIO_BYTES) {
      setMessage("Choose an MP3 or M4A file up to 25 MB.");
      return;
    }
    if (!rightsConfirmed) { setMessage("Confirm you own the track or have permission to share it."); return; }
    setState("uploading"); setMessage(null);
    try {
      const [sha256, durationMilliseconds] = await Promise.all([sha256Base64(file), readDuration(file)]);
      const prepared = await prepareAudioUpload(pageId, { contentType: file.type as "audio/mpeg" | "audio/mp4", byteSize: file.size, sha256, ...(durationMilliseconds ? { durationMilliseconds } : {}), rightsConfirmed: true });
      await uploadAudioSource({ uploadUrl: prepared.uploadUrl, requiredHeaders: prepared.requiredHeaders, file });
      await completeAudioUpload(pageId, prepared.audioId);
      setAudio({ audioId: prepared.audioId, state: "READY", mediaUrl: null, durationMilliseconds: durationMilliseconds ?? null, failureCode: null });
      setState("ready"); setMessage("Audio is ready.");
    } catch (error) {
      setState("idle");
      setMessage(error instanceof WebApiError ? error.message : "Audio upload could not be completed.");
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
      setMessage(error instanceof WebApiError ? error.message : "Audio could not be removed.");
    }
  }

  return <section aria-labelledby="audio-heading" className="space-y-4 rounded-3xl border border-rose-200/70 bg-white/65 p-5 shadow-sm">
    <div><h2 id="audio-heading" className="font-serif text-xl text-ink">Play a song</h2><p className="mt-1 text-sm text-ink-muted">{audio ? "Replace or remove the track shared with this letter." : "Add one MP3 or M4A track, up to 25 MB."}</p></div>
    <label className="flex items-start gap-3 text-sm text-ink"><input type="checkbox" checked={rightsConfirmed} disabled={readOnly || state === "uploading"} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span>I own this track or have permission to share it.</span></label>
    <input ref={inputRef} className="sr-only" type="file" accept="audio/mpeg,audio/mp4,.mp3,.m4a" disabled={readOnly || state === "uploading"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} />
    <button type="button" className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={readOnly || state === "uploading"} onClick={() => inputRef.current?.click()}>{state === "uploading" ? "Uploading…" : "Choose audio"}</button>
    {audio ? <button type="button" className="rounded-full border border-rose-300 px-5 py-3 text-sm font-semibold text-rose-700 disabled:opacity-50" disabled={readOnly || state === "uploading"} onClick={() => void remove()}>Remove audio</button> : null}
    {message ? <p role="status" className="text-sm text-ink-muted">{message}</p> : null}
  </section>;
}
