"use client";

import type {
  AudioUploadResponse,
  OwnerPageAudio,
} from "@letterly/contracts/pages";
import { useRef, useState } from "react";
import {
  completeAudioUpload,
  prepareAudioUpload,
  removeAudio,
  retryAudioUpload,
  sha256Base64,
  uploadAudioSource,
  WebApiError,
} from "../../../lib/api-client";
import { SecretLetterAudioPlayer } from "../../../templates/secret-letter/audio-player";
import styles from "./audio-editor.module.css";

const MAX_AUDIO_BYTES = 26_214_400;
const DEFAULT_AUDIO_TITLE = "Our song";
const AUDIO_CONTENT_TYPES = ["audio/mpeg", "audio/mp4"] as const;
const AUDIO_EXTENSIONS = new Map<string, AudioContentType>([
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
]);

type AudioContentType = (typeof AUDIO_CONTENT_TYPES)[number];
type UploadPhase =
  "idle" | "preparing" | "uploading" | "verifying" | "removing" | "failed";

function contentTypeForFile(file: File): AudioContentType | null {
  if (AUDIO_CONTENT_TYPES.includes(file.type as AudioContentType)) {
    return file.type as AudioContentType;
  }

  if (file.type !== "") return null;

  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return AUDIO_EXTENSIONS.get(extension) ?? null;
}

function readDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(
        Number.isFinite(audio.duration) && audio.duration > 0
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

function formatFileSize(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function failedRetryCandidate(
  prepared: AudioUploadResponse,
  file: File,
  contentType: AudioContentType,
  title: string,
  durationMilliseconds?: number,
): OwnerPageAudio {
  return {
    audioId: prepared.audioId,
    state: "FAILED",
    mediaUrl: null,
    title,
    sourceMimeType: contentType,
    sourceByteSize: file.size,
    durationMilliseconds: durationMilliseconds ?? null,
    failureCode: "AUDIO_UPLOAD_FAILED",
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof WebApiError ? error.message : fallback;
}

export function AudioEditor({
  pageId,
  initialAudio,
  initialAudioRetry,
  readOnly = false,
}: {
  pageId: string;
  initialAudio?: OwnerPageAudio;
  initialAudioRetry?: OwnerPageAudio;
  readOnly?: boolean;
}): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const initialReadyAudio =
    initialAudio?.state === "READY" && initialAudio.mediaUrl
      ? initialAudio
      : undefined;
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [audio, setAudio] = useState<OwnerPageAudio | undefined>(
    initialReadyAudio,
  );
  const [retryCandidate, setRetryCandidate] = useState<
    OwnerPageAudio | undefined
  >(initialAudioRetry);
  const [title, setTitle] = useState(
    initialAudio?.title ?? initialAudioRetry?.title ?? DEFAULT_AUDIO_TITLE,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<AudioContentType | null>(
    null,
  );

  const isBusy =
    phase === "preparing" ||
    phase === "uploading" ||
    phase === "verifying" ||
    phase === "removing";
  const titleIsValid = title.trim().length > 0 && title.trim().length <= 120;
  const canUpload = Boolean(
    selectedFile &&
    selectedType &&
    rightsConfirmed &&
    titleIsValid &&
    !isBusy &&
    !readOnly,
  );

  function selectFile(file: File): void {
    const contentType = contentTypeForFile(file);
    if (!contentType || file.size > MAX_AUDIO_BYTES) {
      setSelectedFile(null);
      setSelectedType(null);
      setMessage("Choose an MP3 or M4A file up to 25 MB.");
      return;
    }

    setSelectedFile(file);
    setSelectedType(contentType);
    setMessage(
      rightsConfirmed
        ? "Ready when you are."
        : "Confirm that you have permission before uploading.",
    );
  }

  function applyReadyAudio(completed: OwnerPageAudio, nextTitle: string): void {
    setAudio({
      ...completed,
      mediaUrl: `/api/v1/pages/${pageId}/audio`,
      title: nextTitle,
      state: "READY",
    });
    setRetryCandidate(undefined);
    setSelectedFile(null);
    setSelectedType(null);
    setProgress(100);
    setPhase("idle");
    setMessage("Your song is ready to preview.");
  }

  async function upload(): Promise<void> {
    if (!selectedFile || !selectedType || !canUpload) return;

    const file = selectedFile;
    const contentType = selectedType;
    const nextTitle = title.trim();
    setPhase("preparing");
    setProgress(0);
    setMessage(null);

    let prepared: AudioUploadResponse | null = null;
    let durationMilliseconds: number | undefined;

    try {
      const [sha256, duration] = await Promise.all([
        sha256Base64(file),
        readDuration(file),
      ]);
      durationMilliseconds = duration;
      const payload = {
        contentType,
        byteSize: file.size,
        sha256,
        title: nextTitle,
        ...(duration ? { durationMilliseconds: duration } : {}),
        rightsConfirmed: true as const,
      };

      prepared = retryCandidate
        ? await retryAudioUpload(pageId, retryCandidate.audioId, payload)
        : await prepareAudioUpload(pageId, payload);

      setPhase("uploading");
      await uploadAudioSource({
        uploadUrl: prepared.uploadUrl,
        requiredHeaders: prepared.requiredHeaders,
        file,
        onProgress: setProgress,
      });
      setProgress(100);

      setPhase("verifying");
      const completed = await completeAudioUpload(pageId, prepared.audioId);
      applyReadyAudio(completed, nextTitle);
    } catch (error: unknown) {
      if (prepared) {
        try {
          setPhase("verifying");
          const recovered = await completeAudioUpload(pageId, prepared.audioId);
          if (recovered.state === "READY") {
            applyReadyAudio(recovered, nextTitle);
            return;
          }
        } catch {
          // The original upload error is the useful message for the creator.
        }
      }

      if (prepared) {
        setRetryCandidate(
          failedRetryCandidate(
            prepared,
            file,
            contentType,
            nextTitle,
            durationMilliseconds,
          ),
        );
      }
      setPhase("failed");
      setMessage(
        errorMessage(
          error,
          "The song could not be uploaded. Choose the file again to retry.",
        ),
      );
    }
  }

  async function remove(): Promise<void> {
    if (readOnly || isBusy) return;

    setPhase("removing");
    setMessage(null);
    try {
      await removeAudio(pageId);
      setAudio(undefined);
      setRetryCandidate(undefined);
      setPhase("idle");
      setMessage("Audio removed.");
    } catch (error: unknown) {
      setPhase("failed");
      setMessage(errorMessage(error, "Audio could not be removed."));
    }
  }

  const phaseLabel =
    phase === "preparing"
      ? "Preparing your song"
      : phase === "uploading"
        ? "Uploading your song"
        : phase === "verifying"
          ? "Checking your song"
          : phase === "removing"
            ? "Removing your song"
            : null;

  return (
    <section className={styles.section} aria-labelledby="audio-heading">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Letter audio</p>
        <h2 id="audio-heading" className={styles.heading}>
          Add a song to this letter
        </h2>
        <p className={styles.description}>
          Choose one MP3 or M4A track. Your recipient will hear it only after
          pressing Play.
        </p>
      </div>

      {audio?.mediaUrl && audio.state === "READY" ? (
        <div className={styles.readyCard}>
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.cardEyebrow}>Ready to preview</p>
              <h3 className={styles.cardTitle}>{audio.title}</h3>
            </div>
            <span className={styles.readyDot} aria-hidden="true" />
          </div>
          <SecretLetterAudioPlayer
            src={audio.mediaUrl}
            title={audio.title}
            durationMilliseconds={audio.durationMilliseconds}
          />
        </div>
      ) : null}

      {retryCandidate ? (
        <div className={styles.retryCard}>
          <div className={styles.cardHeading}>
            <div>
              <p className={styles.cardEyebrow}>Upload needs attention</p>
              <h3 className={styles.cardTitle}>{retryCandidate.title}</h3>
            </div>
            <span className={styles.retryDot} aria-hidden="true" />
          </div>
          <p className={styles.cardDescription}>
            Choose the source file again to retry this upload.
          </p>
        </div>
      ) : null}

      <div className={styles.detailsGrid}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="audio-title">
            Song title
          </label>
          <input
            id="audio-title"
            className={styles.textInput}
            type="text"
            maxLength={120}
            value={title}
            disabled={readOnly || isBusy}
            aria-invalid={!titleIsValid}
            aria-describedby="audio-title-help"
            onChange={(event) => setTitle(event.target.value)}
          />
          <p id="audio-title-help" className={styles.fieldHint}>
            This title is shown in the letter.
          </p>
        </div>

        <label className={styles.permissionField}>
          <input
            className={styles.checkbox}
            type="checkbox"
            checked={rightsConfirmed}
            disabled={readOnly || isBusy}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
          />
          <span className={styles.permissionCopy}>
            <span className={styles.permissionTitle}>
              I own this track or have permission to share it.
            </span>
            <span className={styles.fieldHint}>Required before uploading.</span>
          </span>
        </label>
      </div>

      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept="audio/mpeg,audio/mp4,.mp3,.m4a"
        disabled={readOnly || isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) selectFile(file);
          event.currentTarget.value = "";
        }}
      />

      {selectedFile && selectedType ? (
        <div className={styles.selectionCard}>
          <div>
            <p className={styles.cardEyebrow}>Source selected</p>
            <p className={styles.selectionName}>{selectedFile.name}</p>
          </div>
          <span className={styles.selectionMeta}>
            {selectedType === "audio/mpeg" ? "MP3" : "M4A"} ·{" "}
            {formatFileSize(selectedFile.size)}
          </span>
        </div>
      ) : null}

      {!rightsConfirmed && selectedFile ? (
        <p className={styles.permissionHint} role="status">
          Confirm permission above before uploading.
        </p>
      ) : null}

      {phaseLabel ? (
        <div className={styles.progressPanel} aria-live="polite">
          <div className={styles.progressHeader}>
            <span>{phaseLabel}</span>
            {phase !== "removing" ? <span>{progress}%</span> : null}
          </div>
          {phase !== "removing" ? (
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-label="Song upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={readOnly || isBusy}
          onClick={() => inputRef.current?.click()}
        >
          {selectedFile ? "Choose a different song" : "Choose audio"}
        </button>
        {selectedFile ? (
          <button
            type="button"
            className={styles.uploadButton}
            disabled={!canUpload}
            onClick={() => void upload()}
          >
            {phase === "preparing"
              ? "Preparing…"
              : phase === "uploading"
                ? "Uploading…"
                : phase === "verifying"
                  ? "Checking…"
                  : retryCandidate
                    ? "Retry upload"
                    : "Upload song"}
          </button>
        ) : null}
        {audio ? (
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={readOnly || isBusy}
            onClick={() => void remove()}
          >
            {phase === "removing" ? "Removing…" : "Remove song"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          className={phase === "failed" ? styles.errorMessage : styles.message}
          role={phase === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
