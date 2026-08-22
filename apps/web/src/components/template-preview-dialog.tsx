"use client";

import { useRef, useState } from "react";
import { Dialog } from "@repo/ui/dialog";
import { TemplatePreviewContent } from "./template-preview-content";
import styles from "./template-preview-dialog.module.css";

type TemplatePreviewDialogProps = {
  capabilities: string[];
  description: string;
  templateKey: string;
  templateName: string;
  startHref: string;
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
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const previewCopy = previewCopyByKey[templateKey] ?? description;
  const previewHref = `/preview/${encodeURIComponent(templateKey)}?start=${encodeURIComponent(startHref)}`;

  function openPreview(): void {
    setOpen(true);
  }

  return (
    <>
      <a
        ref={triggerRef}
        className={styles.previewTrigger}
        href={previewHref}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          openPreview();
        }}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            openPreview();
          }
        }}
      >
        Preview
      </a>

      <Dialog
        className={styles.dialog}
        closeLabel={`Close ${templateName} preview`}
        description={previewCopy}
        onClose={() => setOpen(false)}
        open={open}
        title={templateName}
        triggerRef={triggerRef}
      >
        <TemplatePreviewContent
          capabilities={capabilities}
          startHref={startHref}
        />
      </Dialog>
    </>
  );
}
