"use client";

import { useRef, useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import styles from "./template-preview-dialog.module.css";

type TemplatePreviewDialogProps = {
  capabilities: string[];
  description: string;
  templateKey: string;
  templateName: string;
  startHref: string;
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
  startHref,
}: TemplatePreviewDialogProps): React.JSX.Element {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const previewCopy = previewCopyByKey[templateKey] ?? description;

  return (
    <>
      <Button
        ref={triggerRef}
        className={styles.previewTrigger}
        type="button"
        aria-haspopup="dialog"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        Preview
      </Button>

      <Dialog
        className={styles.dialog}
        closeLabel={`Close ${templateName} preview`}
        description={previewCopy}
        onClose={() => setOpen(false)}
        open={open}
        title={templateName}
        triggerRef={triggerRef}
      >
        <div className={styles.previewLayout}>
          <div className={styles.previewStage} aria-hidden="true">
            <div className={styles.previewPaper}>
              <p className={styles.previewKicker}>A page made for feeling</p>
              <p className={styles.previewRecipient}>For someone special</p>
              <span className={styles.previewSeal}>L</span>
              <p className={styles.previewPrompt}>Open when you are ready</p>
            </div>
          </div>

          <div className={styles.dialogContent}>
            <div className={styles.capabilitySection}>
              <p className={styles.capabilityHeading}>
                What this template supports
              </p>
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
              href={startHref}
              onClick={() => setOpen(false)}
            >
              Use this template
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </Dialog>
    </>
  );
}
