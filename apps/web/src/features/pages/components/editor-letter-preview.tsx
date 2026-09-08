"use client";

import Image from "next/image";
import { useState } from "react";
import type { EditablePageImage } from "./image-editor";
import styles from "./editor-letter-preview.module.css";

interface EditorLetterPreviewProps {
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName?: string;
  images: EditablePageImage[];
  questionCount: number;
}

export function EditorLetterPreview({
  title,
  recipientName,
  mainMessage,
  creatorName,
  images,
  questionCount,
}: EditorLetterPreviewProps): React.JSX.Element {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const readyImages = images.filter(
    (image) =>
      (image.localUrl || (image.included && image.state === "READY")) &&
      (image.localUrl || image.mediaUrl),
  );
  const letterTitle = title.trim() || "For you, always";
  const message = mainMessage.trim();

  return (
    <aside
      id="letter-preview"
      className={styles.pane}
      aria-label="Letter preview"
    >
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.previewKicker}>Live preview</p>
          <p className={styles.previewHint}>Updates as you write</p>
        </div>
        <div
          className={styles.previewControls}
          role="group"
          aria-label="Preview size"
        >
          <button
            className={
              viewport === "desktop"
                ? styles.previewControlActive
                : styles.previewControl
            }
            type="button"
            aria-label="Desktop preview"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="3" y="4" width="18" height="13" rx="2" />
              <path d="M8 20h8M12 17v3" />
            </svg>
          </button>
          <button
            className={
              viewport === "mobile"
                ? styles.previewControlActive
                : styles.previewControl
            }
            type="button"
            aria-label="Mobile preview"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect x="7" y="3" width="10" height="18" rx="2" />
              <path d="M11 18h2" />
            </svg>
          </button>
        </div>
        <span className={styles.previewDot} aria-hidden="true" />
      </div>

      <article
        className={`${styles.paper} ${viewport === "mobile" ? styles.paperMobile : ""}`}
        aria-label="Preview of your letter"
      >
        <header className={styles.paperHeader}>
          <p className={styles.paperKicker}>For someone special</p>
          <h2>{letterTitle}</h2>
          <div className={styles.heartDivider} aria-hidden="true">
            <span />
            <span>♡</span>
            <span />
          </div>
          {recipientName.trim() ? (
            <p className={styles.salutation}>Dear {recipientName.trim()},</p>
          ) : null}
        </header>

        {message ? (
          <p className={styles.message}>{message}</p>
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderMark} aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" />
              </svg>
            </span>
            <p>Your message will appear here</p>
          </div>
        )}

        {readyImages.length > 0 ? (
          <div className={styles.memoryStrip} aria-label="Letter memories">
            {readyImages.slice(0, 3).map((image) => (
              <div className={styles.memoryItem} key={image.imageId}>
                <div className={styles.memory}>
                  <Image
                    src={image.localUrl ?? image.mediaUrl ?? ""}
                    alt={image.caption?.trim() || "Letter memory"}
                    fill
                    sizes="(max-width: 64rem) 30vw, 12rem"
                    unoptimized
                  />
                </div>
                <p className={styles.memoryCaption}>
                  {image.caption?.trim() || "Letter memory"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.placeholderBlock}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="m7 16 3.5-4 2.5 3 2-2 2 3" />
              </svg>
            </span>
            <p>Memories will appear here</p>
          </div>
        )}

        {questionCount > 0 ? (
          <div className={styles.questionNote}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M7 4h10v4H7zM5 10h14v10H5zM8 14h8M8 17h5" />
              </svg>
            </span>
            <p>
              {questionCount} question{questionCount === 1 ? "" : "s"}
            </p>
          </div>
        ) : (
          <div className={styles.placeholderBlock}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" />
              </svg>
            </span>
            <p>Questions will appear here</p>
          </div>
        )}

        {creatorName?.trim() ? (
          <p className={styles.signature}>
            <span className={styles.signatureClosing}>Yours, always,</span>
            <span className={styles.signatureName}>{creatorName.trim()}</span>
          </p>
        ) : null}

        <footer className={styles.paperFooter}>
          <span aria-hidden="true" />
          <p>End of letter</p>
        </footer>
      </article>
    </aside>
  );
}
