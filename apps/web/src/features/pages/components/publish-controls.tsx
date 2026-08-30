"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  OwnerPageProjection,
  PageLifecycleResponse,
  PublishPageRequest,
} from "@letterly/contracts/pages";
import { SecretLetterRenderer } from "../../../templates/secret-letter";
import {
  publishPage,
  type WebApiError,
  unpublishPage,
} from "../../../lib/api-client";
import { publicSlugSchema } from "@letterly/contracts/pages";
import styles from "./draft-editor.module.css";

interface PublishControlsProps {
  page: OwnerPageProjection;
  isDirty: boolean;
  isSaving: boolean;
  recipientName: string;
  mainMessage: string;
  isJourney?: boolean;
  onChanged: (response: PageLifecycleResponse) => void;
}

function errorMessage(error: WebApiError | null): string | null {
  if (!error) {
    return null;
  }

  return error.message;
}

function originFromCanonicalUrl(canonicalUrl: string | null): string {
  if (!canonicalUrl) return "";

  try {
    return new URL(canonicalUrl).origin;
  } catch {
    return "";
  }
}

export function PublishControls({
  page,
  isDirty,
  isSaving,
  recipientName,
  mainMessage,
  isJourney = false,
  onChanged,
}: PublishControlsProps): React.JSX.Element {
  const [customSlug, setCustomSlug] = useState("");
  const [publicOrigin, setPublicOrigin] = useState(() =>
    originFromCanonicalUrl(page.canonicalUrl),
  );
  const [confirmed, setConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (publicOrigin) return;
    setPublicOrigin(window.location.origin);
  }, [publicOrigin]);

  const publishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    PublishPageRequest
  >({
    mutationFn: (input) => publishPage(page.id, input),
    onSuccess: (response) => {
      setStatusMessage("Your letter is published and ready to share.");
      setConfirmed(false);
      onChanged(response);
    },
    onError: (error) => setStatusMessage(error.message),
  });

  const unpublishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    { confirm: true }
  >({
    mutationFn: (input) => unpublishPage(page.id, input),
    onSuccess: (response) => {
      setStatusMessage(
        "Your letter is unpublished. The public link is unavailable.",
      );
      onChanged(response);
    },
    onError: (error) => setStatusMessage(error.message),
  });

  const isPublishing = publishMutation.isPending || unpublishMutation.isPending;
  const hasSavedContent = isJourney
    ? true
    : recipientName.trim().length > 0 && mainMessage.trim().length > 0;
  const normalizedSlug = customSlug.trim().toLowerCase();
  const canChooseSlug = page.status === "DRAFT";
  const validSlug =
    !canChooseSlug ||
    normalizedSlug.length === 0 ||
    publicSlugSchema.safeParse(normalizedSlug).success;
  const canPublish =
    !isDirty &&
    !isSaving &&
    !isPublishing &&
    hasSavedContent &&
    confirmed &&
    validSlug;
  function handlePublish(): void {
    publishMutation.mutate({
      customSlug:
        canChooseSlug && normalizedSlug.length > 0 ? normalizedSlug : null,
      confirmReady: true,
    });
  }

  function handleUnpublish(): void {
    if (
      !window.confirm(
        "Unpublish this letter? Its public link will stop working immediately.",
      )
    ) {
      return;
    }

    unpublishMutation.mutate({ confirm: true });
  }

  async function copyPublicLink(): Promise<void> {
    try {
      if (!page.canonicalUrl) {
        throw new Error("Canonical URL unavailable");
      }

      await navigator.clipboard.writeText(page.canonicalUrl);
      setStatusMessage("The public link is copied to your clipboard.");
    } catch {
      setStatusMessage(
        "Copy was unavailable. Use View public letter to copy the address.",
      );
    }
  }

  return (
    <section className={styles.publishPanel} aria-labelledby="publish-heading">
      <div className={styles.publishHeading}>
        <div>
          <p className={styles.paperKicker}>Preview and share</p>
          <h3 id="publish-heading">
            {page.status === "PUBLISHED"
              ? isJourney
                ? "Your journey is live."
                : "Your letter is live."
              : isJourney
                ? "Ready to guide visitors when you are."
                : "Ready to share when you are."}
          </h3>
        </div>
        <span className={styles.statusMark}>{page.status}</span>
      </div>

      {page.status !== "PUBLISHED" ? (
        <>
          <p className={styles.publishDescription}>
            {isJourney
              ? "Publishing requires a saved, valid journey. You can use the generated link or choose a memorable one."
              : "Publishing requires saved recipient and message content. You can use the generated link or choose a memorable one."}
          </p>
          {!isJourney &&
          page.content.recipientName.trim() &&
          page.content.mainMessage.trim() ? (
            <details className={styles.previewDetails}>
              <summary>Open private preview</summary>
              <div className={styles.previewFrame}>
                <SecretLetterRenderer
                  preview
                  model={{
                    recipientName: page.content.recipientName,
                    mainMessage: page.content.mainMessage,
                    sections: [],
                    images: page.images
                      .filter(
                        (image) => image.state === "READY" && image.mediaUrl,
                      )
                      .map((image) => ({
                        imageId: image.imageId,
                        mediaUrl: image.mediaUrl as string,
                        caption: image.caption,
                      })),
                  }}
                />
              </div>
            </details>
          ) : null}
          {canChooseSlug ? (
            <>
              <label className={styles.publishField} htmlFor="customSlug">
                <span className={styles.publishLabel}>
                  <span>Custom public slug</span>
                  <span>(optional)</span>
                </span>
                <span className={styles.slugControl}>
                  <span className={styles.slugIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="m10 13 4-4" />
                      <path d="m7.5 16.5-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0" />
                      <path d="m16.5 7.5 1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" />
                    </svg>
                  </span>
                  <span className={styles.slugPrefix} aria-hidden="true">
                    {publicOrigin || ""}/p/
                  </span>
                  <input
                    id="customSlug"
                    value={customSlug}
                    onChange={(event) => setCustomSlug(event.target.value)}
                    placeholder={page.slug}
                    autoComplete="off"
                    aria-invalid={!validSlug}
                    aria-describedby="customSlug-help customSlug-error"
                  />
                </span>
              </label>
              <p className={styles.fieldMeta} id="customSlug-help">
                Lowercase letters, numbers, and single hyphens, 3 to 48
                characters.
              </p>
              {!validSlug ? (
                <p className={styles.fieldError} id="customSlug-error">
                  Use lowercase letters, numbers, and single hyphens.
                </p>
              ) : null}
            </>
          ) : (
            <p className={styles.publishNotice} role="status">
              Your existing public link is reserved and will be used again when
              you republish this letter.
            </p>
          )}
          {isDirty ? (
            <p className={styles.publishNotice} role="status">
              Save your current changes before publishing.
            </p>
          ) : null}
          <label className={styles.confirmation}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              {isJourney
                ? "I have reviewed this journey and it is ready to share."
                : "I have read the preview and this letter is ready to share."}
            </span>
          </label>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!canPublish}
            aria-busy={publishMutation.isPending}
            onClick={handlePublish}
          >
            {publishMutation.isPending
              ? "Publishing..."
              : isJourney
                ? "Publish journey"
                : "Publish letter"}
          </button>
        </>
      ) : (
        <>
          <p className={styles.publishDescription}>
            Anyone with this link can read the{" "}
            {isJourney ? "journey" : "letter"} while it is published.
          </p>
          <div className={styles.publicLinkRow}>
            <Link className={styles.secondaryButton} href={`/p/${page.slug}`}>
              View public letter
            </Link>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => void copyPublicLink()}
            >
              Copy public link
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={isPublishing}
              onClick={handleUnpublish}
            >
              {unpublishMutation.isPending ? "Unpublishing..." : "Unpublish"}
            </button>
          </div>
        </>
      )}

      {statusMessage ? (
        <p className={styles.publishStatus} role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      {errorMessage(publishMutation.error) ||
      errorMessage(unpublishMutation.error) ? (
        <p className={styles.fieldError} role="alert">
          {errorMessage(publishMutation.error) ??
            errorMessage(unpublishMutation.error)}
        </p>
      ) : null}
    </section>
  );
}
