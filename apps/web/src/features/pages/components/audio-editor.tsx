"use client";

import type {
  AudioUploadResponse,
  PageAudioLink,
  PageAudioSourceOptions,
  OwnerPageAudio,
} from "@letterly/contracts/pages";
import { useRef, useState } from "react";
import { MusicIcon } from "../../../components/music-icon";
import {
  addYouTubeAudioLink,
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
  | "idle"
  | "preparing"
  | "uploading"
  | "verifying"
  | "checking"
  | "removing"
  | "failed";
type AudioSourceMode = "upload" | "link";

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

function titleFromFile(file: File): string {
  const extensionStart = file.name.lastIndexOf(".");
  return extensionStart > 0 ? file.name.slice(0, extensionStart) : file.name;
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
  initialAudioLink,
  audioSourceOptions,
  active = true,
  readOnly = false,
}: {
  pageId: string;
  initialAudio?: OwnerPageAudio;
  initialAudioRetry?: OwnerPageAudio;
  initialAudioLink?: PageAudioLink;
  audioSourceOptions?: PageAudioSourceOptions;
  active?: boolean;
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
  const [audioLink, setAudioLink] = useState<PageAudioLink | undefined>(
    initialAudioLink,
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
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>(
    audioSourceOptions?.upload === false && audioSourceOptions.youtube
      ? "link"
      : "upload",
  );
  const [linkUrl, setLinkUrl] = useState("");

  const isBusy =
    phase === "preparing" ||
    phase === "uploading" ||
    phase === "verifying" ||
    phase === "checking" ||
    phase === "removing";
  const titleIsValid = title.trim().length > 0 && title.trim().length <= 120;
  const hasSavedSource = Boolean(audio || audioLink);
  const isEmpty = !hasSavedSource && !selectedFile;
  const canUpload = Boolean(
    selectedFile &&
    selectedType &&
    rightsConfirmed &&
    titleIsValid &&
    !isBusy &&
    !readOnly,
  );
  const youtubeLinkEnabled = audioSourceOptions?.youtube === true;
  const uploadEnabled = audioSourceOptions?.upload !== false;
  const hasReadyPlayer = Boolean(
    audioLink || (audio?.mediaUrl && audio.state === "READY" && !selectedFile),
  );
  const canAddLink = Boolean(
    youtubeLinkEnabled && linkUrl.trim() && !isBusy && !readOnly,
  );

  function selectFile(file: File): void {
    setRightsConfirmed(false);
    const contentType = contentTypeForFile(file);
    if (!contentType || file.size > MAX_AUDIO_BYTES) {
      setSelectedFile(null);
      setSelectedType(null);
      setMessage("Choose an MP3 or M4A file up to 25 MB.");
      return;
    }

    setSelectedFile(file);
    setSelectedType(contentType);
    setTitle(titleFromFile(file));
    setMessage(null);
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
    setMessage(null);
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

  async function addLink(): Promise<void> {
    if (!canAddLink) return;
    setPhase("checking");
    setMessage(null);
    try {
      const verified = await addYouTubeAudioLink(pageId, linkUrl.trim());
      setAudioLink(verified);
      setAudio(undefined);
      setLinkUrl("");
      setPhase("idle");
      setMessage(null);
    } catch (error: unknown) {
      setPhase("failed");
      setMessage(
        errorMessage(
          error,
          "YouTube could not verify this link. Check it and try again.",
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
      setAudioLink(undefined);
      setRetryCandidate(undefined);
      setSelectedFile(null);
      setSelectedType(null);
      setLinkUrl("");
      setPhase("idle");
      setMessage("Song removed.");
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
          : phase === "checking"
            ? "Checking YouTube link"
            : phase === "removing"
              ? "Removing your song"
              : null;

  const uploadAction = selectedFile ? (
    <button
      type="button"
      className={styles.uploadButton}
      disabled={!canUpload}
      onClick={() => void upload()}
    >
      {isBusy ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        <MusicIcon name="upload" />
      )}
      {phase === "preparing"
        ? "Preparing…"
        : phase === "uploading"
          ? "Uploading…"
          : phase === "verifying"
            ? "Checking…"
            : "Upload song"}
    </button>
  ) : null;

  return (
    <section
      className={`${styles.section}${isEmpty ? ` ${styles.empty}` : ""}${hasReadyPlayer ? ` ${styles.withPlayer}` : ""}`}
      aria-labelledby="audio-heading"
    >
      <div className={styles.header}>
        <div className={styles.headingRow}>
          <h2 id="audio-heading" className={styles.heading}>
            Music
          </h2>
          <span className={styles.optional}>(optional)</span>
        </div>
        {!hasReadyPlayer ? (
          <p className={styles.description}>
            Add a song to make your letter even more special.
          </p>
        ) : null}
      </div>

      {!hasSavedSource && !selectedFile && youtubeLinkEnabled ? (
        <div
          className={styles.sourceChoices}
          role="group"
          aria-label="Music source"
        >
          {uploadEnabled ? (
            <button
              type="button"
              className={`${sourceMode === "upload" ? styles.sourceChoiceActive : styles.sourceChoice} ${styles.uploadChoice}`}
              aria-pressed={sourceMode === "upload"}
              disabled={readOnly || isBusy}
              onClick={() => {
                setSourceMode("upload");
                setMessage(null);
              }}
            >
              <span className={styles.uploadChoiceContent}>
                <MusicIcon name="upload" />
                <span>Upload audio</span>
                <span className={styles.recommendedBadge}>Recommended</span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            className={
              sourceMode === "link"
                ? styles.sourceChoiceActive
                : styles.sourceChoice
            }
            aria-pressed={sourceMode === "link"}
            disabled={readOnly || isBusy}
            onClick={() => {
              setSourceMode("link");
              setMessage(null);
            }}
          >
            <MusicIcon name="youtube" />
            YouTube link
          </button>
        </div>
      ) : null}

      {!hasSavedSource &&
      !selectedFile &&
      sourceMode === "upload" &&
      uploadEnabled ? (
        <div className={styles.uploadArea}>
          <div className={styles.uploadIllustration} aria-hidden="true">
            <MusicIcon name="heart" className={styles.smallHeart} />
            <span className={styles.cloudCircle}>
              <MusicIcon name="upload" />
            </span>
            <MusicIcon name="heart" className={styles.largeHeart} />
          </div>
          <h3 className={styles.uploadHeading}>Choose audio</h3>
          <p className={styles.uploadDescription}>
            Upload a song from your device
          </p>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={readOnly || isBusy}
            onClick={() => inputRef.current?.click()}
          >
            <MusicIcon name="note" />
            <span>Choose audio</span>
            <MusicIcon name="arrow" />
          </button>
          <p className={styles.formatHint}>MP3 or M4A · up to 25 MB</p>
        </div>
      ) : null}

      {audioLink ? (
        <div className={styles.playerFrame}>
          <SecretLetterAudioPlayer
            youtubeVideoId={audioLink.videoId}
            metadataUrl={`/api/v1/pages/${pageId}/audio/metadata`}
            title={audioLink.displayTitle}
            durationSeconds={audioLink.durationSeconds}
            active={active}
            fillWorkspace
            romantic
            formatLabel="YouTube"
          />
        </div>
      ) : audio?.mediaUrl && audio.state === "READY" && !selectedFile ? (
        <div className={styles.playerFrame}>
          <SecretLetterAudioPlayer
            src={audio.mediaUrl}
            title={audio.title}
            durationMilliseconds={audio.durationMilliseconds}
            active={active}
            fillWorkspace
            romantic
            formatLabel={audio.sourceMimeType === "audio/mpeg" ? "MP3" : "M4A"}
          />
        </div>
      ) : null}

      {!hasSavedSource &&
      !selectedFile &&
      sourceMode === "link" &&
      youtubeLinkEnabled ? (
        <div className={styles.linkForm}>
          <label className={styles.label} htmlFor="youtube-audio-link">
            YouTube link
          </label>
          <input
            id="youtube-audio-link"
            className={styles.textInput}
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://youtu.be/..."
            value={linkUrl}
            disabled={readOnly || isBusy}
            aria-invalid={phase === "failed" && Boolean(linkUrl)}
            aria-describedby="youtube-audio-help"
            onChange={(event) => {
              setLinkUrl(event.target.value);
              if (phase === "failed") {
                setPhase("idle");
                setMessage(null);
              }
            }}
          />
          <p id="youtube-audio-help" className={styles.fieldHint}>
            Use a public or unlisted video that allows embedding.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.uploadButton}
              disabled={!canAddLink}
              onClick={() => void addLink()}
            >
              {phase === "checking"
                ? "Checking…"
                : phase === "failed"
                  ? "Retry"
                  : "Add song"}
            </button>
          </div>
        </div>
      ) : null}

      {selectedFile && selectedType ? (
        <div className={styles.detailsGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="audio-title">
              Song title
            </label>
            <div className={styles.titleInput}>
              <MusicIcon name="heart" />
              <input
                id="audio-title"
                className={styles.textInput}
                type="text"
                maxLength={120}
                value={title}
                disabled={readOnly || isBusy}
                aria-invalid={!titleIsValid}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept="audio/mpeg,audio/mp4,.mp3,.m4a"
        disabled={readOnly || isBusy || hasSavedSource || !uploadEnabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) selectFile(file);
          event.currentTarget.value = "";
        }}
      />

      {selectedFile && selectedType ? (
        <div className={styles.selectionCard}>
          <span className={styles.fileIcon}>
            <MusicIcon name="note" />
          </span>
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

      {selectedFile && selectedType ? (
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
      ) : null}

      {phaseLabel ? (
        <div className={styles.progressPanel} aria-live="polite">
          <div className={styles.progressHeader}>
            <span>{phaseLabel}</span>
            {selectedFile ? <span>{progress}%</span> : null}
          </div>
          {selectedFile ? (
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
          {uploadAction}
        </div>
      ) : null}

      {selectedFile || hasSavedSource ? (
        <div
          className={`${styles.actions}${hasSavedSource ? ` ${styles.removeActions}` : ""}`}
        >
          {!phaseLabel ? uploadAction : null}
          {hasSavedSource ? (
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={readOnly || isBusy}
              onClick={() => void remove()}
            >
              <MusicIcon name="trash" />
              {phase === "removing" ? "Removing…" : "Remove song"}
            </button>
          ) : null}
        </div>
      ) : null}

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
