"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { deletePage, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import styles from "./draft-editor.module.css";

export function DeletePageControl({
  pageId,
  idSuffix = "",
  embedded = false,
}: {
  pageId: string;
  idSuffix?: string;
  embedded?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useMutation<void, WebApiError>({
    mutationFn: () => deletePage(pageId),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.removeQueries({ queryKey: pageKeys.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      router.push("/dashboard/pages");
    },
    onError: (error) => setErrorMessage(error.message),
  });

  function handleDelete(): void {
    setErrorMessage(null);
    deleteMutation.mutate();
  }

  return (
    <section
      className={`${styles.deletePanel} ${embedded ? styles.deletePanelEmbedded : ""}`}
      aria-labelledby={`delete-page-title${idSuffix}`}
    >
      {embedded ? (
        <span className={styles.deleteIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 11v5m4-5v5" />
          </svg>
        </span>
      ) : null}
      <div>
        {!embedded ? <p className={styles.eyebrow}>Danger zone</p> : null}
        {embedded ? (
          <h4 id={`delete-page-title${idSuffix}`}>Delete this letter</h4>
        ) : (
          <h2 id={`delete-page-title${idSuffix}`}>Delete this letter</h2>
        )}
        <p>
          Permanently remove this letter and release its public link. This
          cannot be undone.
        </p>
      </div>
      <button
        className={styles.dangerButton}
        type="button"
        disabled={deleteMutation.isPending}
        aria-busy={deleteMutation.isPending}
        onClick={() => {
          setErrorMessage(null);
          setDeleteOpen(true);
        }}
      >
        {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
      </button>
      {errorMessage ? (
        <p className={styles.deleteError} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this letter permanently?"
        description="Your letter and its responses will be permanently removed, and its public link will stop working. This cannot be undone."
        confirmLabel="Delete permanently"
        cancelLabel="Keep letter"
        pendingLabel="Deleting..."
        pending={deleteMutation.isPending}
        error={errorMessage}
        onConfirm={handleDelete}
      />
    </section>
  );
}
