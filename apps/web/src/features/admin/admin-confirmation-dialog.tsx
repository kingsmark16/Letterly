"use client";

import { Button } from "@repo/ui/button";
import { useEffect, useRef } from "react";
import {
  reasons,
  type Confirmation,
  type ReportReason,
} from "./moderation-presentation";

interface ConfirmationDialogProps {
  action: Confirmation;
  note: string;
  reason: ReportReason;
  onNoteChange: (value: string) => void;
  onReasonChange: (value: ReportReason) => void;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
  attempted: boolean;
}

export function ConfirmationDialog({
  action,
  note,
  reason,
  onNoteChange,
  onReasonChange,
  onCancel,
  onConfirm,
  pending,
  attempted,
}: ConfirmationDialogProps): React.JSX.Element {
  const firstControlRef = useRef<HTMLSelectElement | HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const dialog = dialogRef.current;
    firstControlRef.current?.focus();
    if (!firstControlRef.current) dialog?.focus();
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !pending) onCancelRef.current();
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pending]);

  const needsReason =
    action.kind === "report" || action.operation === "disable";
  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-ink/40 px-5 py-8"
      role="presentation"
    >
      <section
        ref={dialogRef}
        className="max-h-[calc(100dvh-4rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-large border border-border bg-surface p-6 shadow-medium sm:p-8"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="moderation-confirm-title"
        aria-describedby="moderation-confirm-description"
      >
        <h2
          id="moderation-confirm-title"
          className="font-display text-2xl font-semibold"
        >
          {action.title}
        </h2>
        <p
          id="moderation-confirm-description"
          className="mt-3 text-small leading-relaxed text-ink-muted"
        >
          This action is recorded in the moderation history. Confirm it only
          after reviewing the safe report details.
        </p>
        {needsReason ? (
          <label
            className="mt-5 block text-small font-semibold"
            htmlFor="moderation-reason"
          >
            Reason
            <select
              ref={firstControlRef as React.RefObject<HTMLSelectElement>}
              id="moderation-reason"
              className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 text-small"
              value={reason}
              onChange={(event) =>
                onReasonChange(event.target.value as ReportReason)
              }
              disabled={pending || attempted}
            >
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label
          className="mt-5 block text-small font-semibold"
          htmlFor="moderation-note"
        >
          Internal note{" "}
          <span className="font-normal text-ink-muted">(optional)</span>
          <textarea
            ref={
              !needsReason
                ? (firstControlRef as React.RefObject<HTMLTextAreaElement>)
                : undefined
            }
            id="moderation-note"
            className="mt-2 min-h-24 w-full rounded-medium border border-border bg-surface-muted px-3 py-3 text-small outline-none focus:border-wine focus:ring-2 focus:ring-rose"
            maxLength={500}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            disabled={pending || attempted}
            aria-describedby="moderation-note-count"
          />
          <span
            id="moderation-note-count"
            className="mt-1 block text-label font-normal text-ink-muted"
          >
            {note.length} / 500
          </span>
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            className="px-4 hover:border-wine"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="px-4"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending
              ? "Saving…"
              : attempted
                ? "Retry action"
                : "Confirm action"}
          </Button>
        </div>
      </section>
    </div>
  );
}
