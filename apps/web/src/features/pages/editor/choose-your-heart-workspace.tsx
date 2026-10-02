"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import { ChooseYourHeartEditor } from "./choose-your-heart-editor";
import { DeletePageControl } from "./delete-page-control";
import type { PageEditorProps } from "./editor-context";
import styles from "./draft-editor.module.css";

export function ChooseYourHeartWorkspace({
  pageQuery,
}: PageEditorProps): React.JSX.Element {
  const page = pageQuery.data;
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  useEffect(() => {
    function warnBeforeExit(event: BeforeUnloadEvent): void {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warnBeforeExit);
    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [dirty]);
  return (
    <main className={styles.page}>
      <div className={styles.editorShell}>
        <div className={styles.editorTopline}>
          <Link
            className={styles.backLink}
            href="/dashboard/pages"
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                setLeaveOpen(true);
              }
            }}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Link>
        </div>
        <ChooseYourHeartEditor page={page} onDirtyChange={setDirty} />
        <DeletePageControl pageId={page.id} />
      </div>
      <ConfirmationDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        title="Leave with unsaved changes?"
        description="Your latest changes have not been saved. Leaving now may discard them."
        confirmLabel="Leave page"
        cancelLabel="Keep editing"
        destructive={false}
        onConfirm={() => {
          setLeaveOpen(false);
          router.push("/dashboard/pages");
        }}
      />
    </main>
  );
}
