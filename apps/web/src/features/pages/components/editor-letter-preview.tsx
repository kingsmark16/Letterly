"use client";

import Image from "next/image";
import type { EditablePageImage } from "./image-editor";
import styles from "./editor-letter-preview.module.css";

interface EditorLetterPreviewProps {
  recipientName: string;
  mainMessage: string;
  images: EditablePageImage[];
  questionCount: number;
}

export function EditorLetterPreview({
  recipientName,
  mainMessage,
  images,
  questionCount,
}: EditorLetterPreviewProps): React.JSX.Element {
  const readyImages = images.filter(
    (image) =>
      (image.localUrl || (image.included && image.state === "READY")) &&
      (image.localUrl || image.mediaUrl),
  );
  const title = recipientName.trim() || "Your letter";
  const message = mainMessage.trim();

  return (
    <aside className={styles.pane} aria-label="Letter preview">
      <div className={styles.previewHeader}>
        <div>
          <p className={styles.previewKicker}>Live preview</p>
          <p className={styles.previewHint}>Updates as you write</p>
        </div>
        <span className={styles.previewDot} aria-hidden="true" />
      </div>

      <article className={styles.paper} aria-label="Preview of your letter">
        <header className={styles.paperHeader}>
          <p className={styles.paperKicker}>For someone special</p>
          <h2>{title}</h2>
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
              <div className={styles.memory} key={image.imageId}>
                <Image
                  src={image.localUrl ?? image.mediaUrl ?? ""}
                  alt={image.caption?.trim() || "Letter memory"}
                  fill
                  sizes="(max-width: 64rem) 30vw, 12rem"
                  unoptimized
                />
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
              {questionCount} response question{questionCount === 1 ? "" : "s"}
            </p>
          </div>
        ) : (
          <div className={styles.placeholderBlock}>
            <span aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" />
              </svg>
            </span>
            <p>Response questions will appear here</p>
          </div>
        )}

        <footer className={styles.paperFooter}>
          <span aria-hidden="true" />
          <p>End of letter</p>
        </footer>
      </article>
    </aside>
  );
}
