"use client";

import {
  pageReportReasonSchema,
  publicReportRequestSchema,
} from "@letterly/contracts/reports";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { submitPublicReport, type WebApiError } from "../../../lib/api-client";

interface PublicReportFormProps {
  slug: string;
}

const reasons = [
  ["INAPPROPRIATE_CONTENT", "Inappropriate content"],
  ["HARASSMENT", "Harassment"],
  ["SPAM", "Spam"],
  ["PERSONAL_INFORMATION", "Personal information"],
  ["OTHER", "Other"],
] as const;

function reportErrorMessage(error: WebApiError): string {
  if (error.code === "RATE_LIMITED" || error.statusCode === 429) {
    const retryAfter =
      error.details && "retryAfterSeconds" in error.details
        ? error.details.retryAfterSeconds
        : undefined;
    return retryAfter
      ? `Reports are limited for now. Please try again in about ${retryAfter} seconds.`
      : "Reports are limited for now. Please try again shortly.";
  }

  if (
    error.code === "PAGE_NOT_FOUND" ||
    error.code === "SERVICE_UNAVAILABLE" ||
    error.code === "RATE_LIMIT_STORE_UNAVAILABLE" ||
    error.code === "RATE_LIMIT_UNAVAILABLE"
  ) {
    return "This page is not accepting reports right now. You can try again later.";
  }

  return error.message || "We could not send your report. Please try again.";
}

export function PublicReportForm({
  slug,
}: PublicReportFormProps): React.JSX.Element {
  const messageId = useId();
  const errorId = useId();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }

    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function closeDialog(): void {
    setIsOpen(false);
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const parsed = publicReportRequestSchema.safeParse({
      reason: pageReportReasonSchema.safeParse(reason).success
        ? reason
        : undefined,
      message: message.trim() || undefined,
    });
    if (!parsed.success) {
      setStatus("error");
      setErrorMessage("Choose a reason before sending your report.");
      return;
    }
    setStatus("submitting");
    setErrorMessage(null);
    try {
      await submitPublicReport(slug, parsed.data);
      setStatus("accepted");
    } catch (caught: unknown) {
      const error = caught as WebApiError;
      setStatus("error");
      setErrorMessage(reportErrorMessage(error));
    }
  }

  return (
    <footer className="mx-auto w-full max-w-2xl border-t border-border/70 px-5 py-4 sm:px-7">
      <nav
        aria-label="Letter links"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
      >
        <Link
          className="inline-flex min-h-11 items-center font-display text-lg font-semibold tracking-tight text-ink transition-colors hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          href="/"
          aria-label="Letterly home"
        >
          Letterly
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>
        <Link
          className="inline-flex min-h-11 items-center text-small font-semibold text-wine underline decoration-rose underline-offset-4 transition-colors hover:text-wine-hover hover:decoration-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          href="/create"
        >
          Create your own letter
        </Link>
        <span aria-hidden="true" className="text-border">
          /
        </span>

        <a
          ref={triggerRef}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 px-2 py-3 text-small font-semibold text-ink-muted underline decoration-border underline-offset-4 transition-colors hover:text-wine hover:decoration-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          href="#report-letter"
          aria-haspopup="dialog"
          aria-controls="report-letter"
          onClick={(event) => {
            event.preventDefault();
            setIsOpen(true);
          }}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <path
              d="M5 21V4.5m0 0c4-3 8 3 14 0v9c-6 3-10-3-14 0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Report this letter
        </a>
      </nav>

      <dialog
        ref={dialogRef}
        id="report-letter"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-hidden rounded-large border border-border bg-surface p-0 text-ink shadow-medium backdrop:bg-backdrop"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={() => {
          setIsOpen(false);
          triggerRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeDialog();
          }
        }}
      >
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                Safety
              </p>
              <h2
                id={titleId}
                className="mt-2 font-display text-3xl font-semibold tracking-tight"
              >
                {status === "accepted"
                  ? "Thank you for helping keep Letterly safe."
                  : "Report this page"}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-round border border-border bg-surface-muted text-ink transition-colors hover:border-wine hover:text-wine"
              type="button"
              aria-label="Close report dialog"
              onClick={closeDialog}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 fill-none stroke-current"
                strokeWidth="1.8"
              >
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {status === "accepted" ? (
            <div className="mt-5" aria-live="polite">
              <p
                id={descriptionId}
                className="text-body leading-relaxed text-ink-muted"
              >
                We will review the report without exposing your identity.
              </p>
              <button
                className="mt-7 min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover"
                type="button"
                onClick={closeDialog}
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p
                id={descriptionId}
                className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted"
              >
                Share only what is needed. Your report is private.
              </p>
              <form
                className="mt-7 space-y-6"
                onSubmit={(event) => void submit(event)}
                noValidate
              >
                <fieldset
                  className="space-y-3"
                  aria-describedby={errorMessage ? errorId : undefined}
                  aria-invalid={errorMessage ? "true" : undefined}
                >
                  <legend className="text-body font-semibold text-ink">
                    What is wrong with this page?
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {reasons.map(([value, label]) => (
                      <label
                        key={value}
                        className="flex min-h-12 cursor-pointer items-center gap-3 rounded-medium border border-border bg-surface-muted px-4 py-3 text-small text-ink hover:border-wine"
                      >
                        <input
                          className="size-4 accent-wine"
                          type="radio"
                          name="report-reason"
                          value={value}
                          checked={reason === value}
                          onChange={(event) => {
                            setReason(event.target.value);
                            setStatus("idle");
                          }}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="space-y-2">
                  <label
                    className="text-body font-semibold text-ink"
                    htmlFor={messageId}
                  >
                    Additional details{" "}
                    <span className="font-normal text-ink-muted">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    id={messageId}
                    className="min-h-28 w-full rounded-medium border border-border bg-surface-muted px-4 py-3 text-body text-ink outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                    maxLength={1000}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setStatus("idle");
                    }}
                    aria-describedby={`${messageId}-count`}
                  />
                  <p
                    id={`${messageId}-count`}
                    className="text-label text-ink-muted"
                  >
                    {message.length} / 1000 characters
                  </p>
                </div>
                {errorMessage ? (
                  <p id={errorId} className="text-small text-wine" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
                    type="submit"
                    disabled={status === "submitting"}
                  >
                    {status === "submitting"
                      ? "Sending report…"
                      : status === "error"
                        ? "Try sending again"
                        : "Send report"}
                  </button>
                  <p
                    className="text-small text-ink-muted"
                    role="status"
                    aria-live="polite"
                  >
                    {status === "submitting"
                      ? "Sending securely…"
                      : status === "error"
                        ? "Your entries are still here."
                        : ""}
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </dialog>
    </footer>
  );
}
