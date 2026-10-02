"use client";

import { AlertDialog } from "radix-ui";
import { useRef } from "react";
import styles from "./confirmation-dialog.module.css";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  destructive?: boolean;
  onConfirm: () => void;
  restoreFocus?: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pendingLabel = "Working...",
  pending = false,
  error,
  destructive = true,
  onConfirm,
  restoreFocus,
}: ConfirmationDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={styles.overlay} />
        <AlertDialog.Content
          className={styles.content}
          aria-busy={pending}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            cancelRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (restoreFocus) restoreFocus();
            else if (openerRef.current?.isConnected) openerRef.current.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v6m0 4h.01" />
            </svg>
          </span>
          <AlertDialog.Title className={styles.title}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.description}>
            {description}
          </AlertDialog.Description>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <div className={styles.actions}>
            <AlertDialog.Cancel asChild>
              <button
                ref={cancelRef}
                className={styles.cancel}
                type="button"
                disabled={pending}
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className={styles.confirm}
                data-destructive={destructive}
                type="button"
                disabled={pending}
                aria-live="polite"
                onClick={(event) => {
                  event.preventDefault();
                  onConfirm();
                }}
              >
                {pending ? pendingLabel : confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
