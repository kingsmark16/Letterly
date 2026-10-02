"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import styles from "./draft-editor.module.css";

interface QrSharingPanelProps {
  canonicalUrl: string;
  slug: string;
  compact?: boolean;
}

type QrState =
  | { status: "loading" }
  | { status: "ready"; markup: string }
  | { status: "error" };

function safeFilenameSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");

  return safe || "qr";
}

export function QrSharingPanel({
  canonicalUrl,
  slug,
  compact = false,
}: QrSharingPanelProps): React.JSX.Element {
  const statusId = useId();
  const copyAttemptedRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);
  const [qrState, setQrState] = useState<QrState>({ status: "loading" });
  const [previewAvailable, setPreviewAvailable] = useState<boolean | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState(
    "Your QR code is being prepared.",
  );

  useEffect(() => {
    let active = true;
    copyAttemptedRef.current = false;
    setQrState({ status: "loading" });
    setPreviewAvailable(null);
    setStatusMessage("Your QR code is being prepared.");

    void import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toString(canonicalUrl, {
          type: "svg",
          errorCorrectionLevel: "H",
          margin: 4,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        }),
      )
      .then((markup) => {
        if (!active) {
          return;
        }

        setQrState({ status: "ready", markup });
        setStatusMessage("Your QR code is ready to download or scan.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setQrState({ status: "error" });
        setStatusMessage(
          "The QR code could not be prepared. Your public link is still available.",
        );
      });

    return () => {
      active = false;
    };
  }, [canonicalUrl, retryCount]);

  function handlePreviewLoad(): void {
    if (copyAttemptedRef.current) {
      return;
    }

    setPreviewAvailable(true);
    setStatusMessage("Your QR code is ready to download or scan.");
  }

  function handlePreviewError(): void {
    if (copyAttemptedRef.current) {
      return;
    }

    setPreviewAvailable(false);
    setStatusMessage(
      "The QR code preview is unavailable. You can still download the SVG.",
    );
  }

  function retry(): void {
    setQrState({ status: "loading" });
    setStatusMessage("Retrying QR code generation.");
    setRetryCount((value) => value + 1);
  }

  function downloadSvg(): void {
    if (qrState.status !== "ready") {
      return;
    }

    const blob = new Blob([qrState.markup], {
      type: "image/svg+xml;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `letterly-${safeFilenameSlug(slug)}.svg`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    setStatusMessage("The QR code download has started.");
  }

  async function copyUrl(): Promise<void> {
    copyAttemptedRef.current = true;

    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(canonicalUrl);
      setStatusMessage("The public link is copied to your clipboard.");
    } catch {
      setStatusMessage(
        "Copy was unavailable. Select the public link and copy it manually.",
      );
    }
  }

  return (
    <section
      className={`${styles.qrSharing} ${compact ? styles.qrSharingCompact : ""}`}
      aria-label={compact ? "QR code and sharing options" : undefined}
      aria-labelledby={compact ? undefined : "qr-sharing-heading"}
    >
      {!compact ? (
        <>
          <div className={styles.qrHeading}>
            <div>
              <p className={styles.paperKicker}>Share by QR</p>
              <h4 id="qr-sharing-heading">A quiet way to share your letter</h4>
            </div>
            <span className={styles.qrBadge}>Private link</span>
          </div>
          <p className={styles.qrDescription}>
            This code opens the public link. If your letter has a password, the
            visitor will still see the normal password gate.
          </p>
        </>
      ) : null}

      <div className={styles.qrLayout}>
        <div
          className={styles.qrPreview}
          role={
            qrState.status === "ready" && previewAvailable === false
              ? "status"
              : "img"
          }
          aria-label={`QR code for ${canonicalUrl}`}
        >
          {qrState.status === "ready" && previewAvailable !== false ? (
            // This is a browser generated SVG data URL, so Next image optimization is not applicable.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrState.markup)}`}
              alt=""
              aria-hidden="true"
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
            />
          ) : qrState.status === "ready" ? (
            <div className={styles.qrPlaceholder}>
              Preview unavailable. Download the SVG instead.
            </div>
          ) : (
            <div className={styles.qrPlaceholder} aria-hidden="true">
              {qrState.status === "loading" ? "Preparing" : "Unavailable"}
            </div>
          )}
        </div>

        <div className={styles.qrActions}>
          <label className={styles.publishField} htmlFor={`${statusId}-url`}>
            Public link
            <input
              id={`${statusId}-url`}
              className={styles.qrUrl}
              value={canonicalUrl}
              readOnly
              aria-describedby={statusId}
            />
          </label>
          <div className={styles.qrButtonRow}>
            <Link
              className={`${styles.secondaryButton} ${styles.qrActionButton}`}
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open letter in a new tab"
            >
              <span className={styles.qrFullActionLabel} aria-hidden="true">
                Open letter
              </span>
              <span className={styles.qrCompactActionLabel} aria-hidden="true">
                Open
              </span>
            </Link>
            <button
              className={`${styles.secondaryButton} ${styles.qrActionButton} ${styles.qrCopyButton}`}
              type="button"
              onClick={() => void copyUrl()}
              aria-label="Copy public link"
            >
              <span className={styles.qrFullActionLabel} aria-hidden="true">
                Copy link
              </span>
              <span className={styles.qrCompactActionLabel} aria-hidden="true">
                Copy
              </span>
            </button>
            <button
              className={`${styles.secondaryButton} ${styles.qrActionButton}`}
              type="button"
              disabled={qrState.status !== "ready"}
              onClick={downloadSvg}
              aria-label="Download QR code as SVG"
            >
              <span className={styles.qrFullActionLabel} aria-hidden="true">
                Download SVG
              </span>
              <span className={styles.qrCompactActionLabel} aria-hidden="true">
                Save SVG
              </span>
            </button>
            {qrState.status === "error" ? (
              <button
                className={`${styles.secondaryButton} ${styles.qrActionButton}`}
                type="button"
                onClick={retry}
                aria-label="Try generating the QR code again"
              >
                <span className={styles.qrFullActionLabel} aria-hidden="true">
                  Try again
                </span>
                <span
                  className={styles.qrCompactActionLabel}
                  aria-hidden="true"
                >
                  Retry
                </span>
              </button>
            ) : null}
          </div>
          <p
            id={statusId}
            className={styles.publishStatus}
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
