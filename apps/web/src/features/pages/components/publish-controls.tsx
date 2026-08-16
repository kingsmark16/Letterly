"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import type {
  OwnerPageProjection,
  PageLifecycleResponse,
  PublishPageRequest,
} from "@letterly/contracts/pages";
import { SecretLetterRenderer } from "./secret-letter-renderer";
import {
  publishPage,
  type WebApiError,
  unpublishPage,
} from "../../../lib/api-client";
import { publicSlugSchema } from "@letterly/contracts/pages";
import styles from "./draft-editor.module.css";
import { QrSharingPanel } from "./qr-sharing-panel";

interface PublishControlsProps {
  page: OwnerPageProjection;
  isDirty: boolean;
  isSaving: boolean;
  recipientName: string;
  mainMessage: string;
  onChanged: () => void;
}

function errorMessage(error: WebApiError | null): string | null {
  if (!error) {
    return null;
  }

  return error.message;
}

export function PublishControls({
  page,
  isDirty,
  isSaving,
  recipientName,
  mainMessage,
  onChanged,
}: PublishControlsProps): React.JSX.Element {
  const [customSlug, setCustomSlug] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const publishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    PublishPageRequest
  >({
    mutationFn: (input) => publishPage(page.id, input),
    onSuccess: () => {
      setStatusMessage("Your letter is published and ready to share.");
      setConfirmed(false);
      onChanged();
    },
    onError: (error) => setStatusMessage(error.message),
  });

  const unpublishMutation = useMutation<
    PageLifecycleResponse,
    WebApiError,
    { confirm: true }
  >({
    mutationFn: (input) => unpublishPage(page.id, input),
    onSuccess: () => {
      setStatusMessage(
        "Your letter is unpublished. The public link is unavailable.",
      );
      onChanged();
    },
    onError: (error) => setStatusMessage(error.message),
  });

  const isPublishing = publishMutation.isPending || unpublishMutation.isPending;
  const hasSavedContent =
    recipientName.trim().length > 0 && mainMessage.trim().length > 0;
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
              ? "Your letter is live."
              : "Ready to share when you are."}
          </h3>
        </div>
        <span className={styles.statusMark}>{page.status}</span>
      </div>

      {page.status !== "PUBLISHED" ? (
        <>
          <p className={styles.publishDescription}>
            Publishing requires saved recipient and message content. You can use
            the generated link or choose a memorable one.
          </p>
          {page.content.recipientName.trim() &&
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
                Custom public slug <span>(optional)</span>
                <input
                  id="customSlug"
                  value={customSlug}
                  onChange={(event) => setCustomSlug(event.target.value)}
                  placeholder={page.slug}
                  autoComplete="off"
                  aria-invalid={!validSlug}
                  aria-describedby="customSlug-help customSlug-error"
                />
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
              I have read the preview and this letter is ready to share.
            </span>
          </label>
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!canPublish}
            aria-busy={publishMutation.isPending}
            onClick={handlePublish}
          >
            {publishMutation.isPending ? "Publishing..." : "Publish letter"}
          </button>
        </>
      ) : (
        <>
          <p className={styles.publishDescription}>
            Anyone with this link can read the letter while it is published.
          </p>
          <div className={styles.publicLinkRow}>
            <Link
              className={styles.secondaryButton}
              href={`/p/${page.slug}`}
            >
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
          {page.canonicalUrl ? (
            <QrSharingPanel canonicalUrl={page.canonicalUrl} slug={page.slug} />
          ) : (
            <p className={styles.publishNotice} role="status">
              The share link is still being prepared. Refresh this page before
              sharing.
            </p>
          )}
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
