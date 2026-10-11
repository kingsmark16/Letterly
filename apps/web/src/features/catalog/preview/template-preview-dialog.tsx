"use client";

import { useRef, useState } from "react";
import { Dialog } from "@repo/ui/dialog";
import { supportsNativeDialog } from "../../../lib/native-dialog";
import { TemplatePreviewContent } from "./template-preview-content";
import {
  createTemplatePreviewPath,
  getWebTemplate,
} from "../../../templates/registration";
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

const dialogClassNames = {
  content:
    "[@media(max-width:48rem)]:box-border [@media(max-width:48rem)]:h-full [@media(max-width:48rem)]:min-h-0 [@media(max-width:48rem)]:grid-rows-[auto_minmax(0,1fr)] [@media(max-width:48rem)]:gap-2 [@media(max-width:48rem)]:p-3 [@media(max-width:48rem)]:overflow-hidden",
  header: "[@media(max-width:48rem)]:gap-2",
  title:
    "[@media(max-width:48rem)]:text-[clamp(1.25rem,5vw,1.5rem)] [@media(max-width:48rem)]:leading-[1.2] [@media(max-width:48rem)_and_(max-height:42rem)]:text-[1.125rem]",
  description:
    "[@media(max-width:48rem)]:mt-1 [@media(max-width:48rem)]:text-[0.8125rem] [@media(max-width:48rem)]:leading-[1.4] [@media(max-width:48rem)_and_(max-height:42rem)]:text-[0.75rem] [@media(max-width:48rem)_and_(max-height:42rem)]:leading-[1.25]",
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
        className="fixed top-1/2 left-1/2 m-0 -translate-x-1/2 -translate-y-1/2 w-[min(var(--letterly-dialog-wide-max-width),calc(100vw-var(--letterly-space-6)))] max-w-[var(--letterly-dialog-wide-max-width)] max-h-[min(var(--letterly-dialog-wide-max-height),calc(100svh-var(--letterly-space-6)))] overflow-auto [@media(max-width:48rem)]:inset-0 [@media(max-width:48rem)]:h-dvh [@media(max-width:48rem)]:max-h-dvh [@media(max-width:48rem)]:translate-none [@media(max-width:48rem)]:overflow-hidden"
        classNames={dialogClassNames}
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
