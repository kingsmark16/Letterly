"use client";

import { useRef, useState } from "react";
import { Dialog } from "@repo/ui/dialog";
import { supportsNativeDialog } from "../lib/native-dialog";
import { TemplatePreviewContent } from "./template-preview-content";
import {
  createTemplatePreviewPath,
  getWebTemplate,
} from "../templates/registration";
import styles from "./template-preview-dialog.module.css";

type TemplatePreviewDialogProps = {
  capabilities: string[];
  categoryKey?: string;
  version?: number;
  description: string;
  templateKey: string;
  templateName: string;
  startHref: string;
  templateVersionId?: string;
};

export function TemplatePreviewDialog({
  capabilities,
  categoryKey,
  version,
  description,
  templateKey,
  templateName,
  startHref,
  templateVersionId,
}: TemplatePreviewDialogProps): React.JSX.Element {
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const identity = {
    templateKey,
    ...(categoryKey !== undefined ? { categoryKey } : {}),
    ...(version !== undefined ? { version } : {}),
  };
  const previewCopy =
    getWebTemplate(identity)?.dialogDescription ?? description;
  const previewHref = createTemplatePreviewPath(identity, startHref);

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
          if (!supportsNativeDialog()) return;
          event.preventDefault();
          openPreview();
        }}
        onKeyDown={(event) => {
          if (event.key === " " && supportsNativeDialog()) {
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
        closeIconOnly
        description={previewCopy}
        onClose={() => setOpen(false)}
        open={open}
        title={templateName}
        triggerRef={triggerRef}
      >
        {open ? (
          <TemplatePreviewContent
            categoryKey={categoryKey}
            version={version}
            capabilities={capabilities}
            startHref={startHref}
            templateKey={templateKey}
            templateVersionId={templateVersionId}
            templateName={templateName}
          />
        ) : null}
      </Dialog>
    </>
  );
}
