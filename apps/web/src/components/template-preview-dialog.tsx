"use client";

import { useId, useRef } from "react";
import styles from "./template-preview-dialog.module.css";

type TemplatePreviewDialogProps = {
  capabilities: string[];
  description: string;
  templateKey: string;
  templateName: string;
};

const capabilityLabels: Record<string, string> = {
  images: "Memory images",
  audio: "Optional music",
  questions: "Interactive questions",
  visitorMessage: "Private replies",
  passwordProtection: "Password protection",
};

const previewCopyByKey: Record<string, string> = {
  "secret-letter":
    "A quiet place for the words you want someone to return to, with room for memories and a private reply.",
  "choose-your-heart":
    "A thoughtful question led by your own words, with each answer opening a different part of the story.",
};

export function TemplatePreviewDialog({
  capabilities,
  description,
  templateKey,
  templateName,
}: TemplatePreviewDialogProps): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const idPrefix = useId();
  const titleId = `${idPrefix}-title`;
  const descriptionId = `${idPrefix}-description`;
  const previewCopy = previewCopyByKey[templateKey] ?? description;

  function openPreview(): void {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }

  function closePreview(): void {
    dialogRef.current?.close();
  }

  function restoreFocus(): void {
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={styles.previewTrigger}
        type="button"
        aria-haspopup="dialog"
        onClick={openPreview}
      >
        Preview
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-modal="true"
        onClose={restoreFocus}
      >
        <div className={styles.dialogShell}>
          <div className={styles.dialogHeader}>
            <div>
              <p className={styles.eyebrow}>Template preview</p>
              <h2 id={titleId}>{templateName}</h2>
            </div>

            <button
              className={styles.closeButton}
              type="button"
              aria-label={`Close ${templateName} preview`}
              onClick={closePreview}
            >
              Close
            </button>
          </div>

          <div className={styles.previewStage} aria-hidden="true">
            <div className={styles.previewPaper}>
              <p className={styles.previewKicker}>A page made for feeling</p>
              <p className={styles.previewRecipient}>For someone special</p>
              <span className={styles.previewSeal}>L</span>
              <p className={styles.previewPrompt}>Open when you are ready</p>
            </div>
          </div>

          <div className={styles.dialogContent}>
            <p id={descriptionId}>{previewCopy}</p>

            <div className={styles.capabilitySection}>
              <p className={styles.capabilityHeading}>What this template supports</p>
              <ul className={styles.capabilityList}>
                {capabilities.map((capability) => (
                  <li key={capability}>
                    {capabilityLabels[capability] ?? capability}
                  </li>
                ))}
              </ul>
            </div>

            <a
              className={styles.useLink}
              href="#create"
              onClick={closePreview}
            >
              Use this template
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </dialog>
    </>
  );
}
