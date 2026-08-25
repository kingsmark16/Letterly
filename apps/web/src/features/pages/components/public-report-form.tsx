"use client";

import {
  pageReportReasonSchema,
  publicReportRequestSchema,
} from "@letterly/contracts/reports";
import { useId, useState } from "react";
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
    const retryAfter = error.details && "retryAfterSeconds" in error.details
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

export function PublicReportForm({ slug }: PublicReportFormProps): React.JSX.Element {
  const messageId = useId();
  const errorId = useId();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "accepted" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const parsed = publicReportRequestSchema.safeParse({
      reason: pageReportReasonSchema.safeParse(reason).success ? reason : undefined,
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

  if (status === "accepted") {
    return (
      <section className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-7 lg:px-8" aria-live="polite">
        <div className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Report received</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Thank you for helping keep Letterly safe.</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-muted">We will review the report without exposing your identity.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-7 lg:px-8" aria-labelledby="report-title">
      <div className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Safety</p>
        <h2 id="report-title" className="mt-2 font-display text-3xl font-semibold tracking-tight">Report this page</h2>
        <p className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted">Share only what is needed. Your report is private.</p>
        <form className="mt-7 space-y-6" onSubmit={(event) => void submit(event)} noValidate>
          <fieldset
            className="space-y-3"
            aria-describedby={errorMessage ? errorId : undefined}
            aria-invalid={errorMessage ? "true" : undefined}
          >
            <legend className="text-body font-semibold text-ink">What is wrong with this page?</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {reasons.map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-medium border border-border bg-surface-muted px-4 py-3 text-small text-ink hover:border-wine">
                  <input className="size-4 accent-wine" type="radio" name="report-reason" value={value} checked={reason === value} onChange={(event) => { setReason(event.target.value); setStatus("idle"); }} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <label className="text-body font-semibold text-ink" htmlFor={messageId}>Additional details <span className="font-normal text-ink-muted">(optional)</span></label>
            <textarea id={messageId} className="min-h-28 w-full rounded-medium border border-border bg-surface-muted px-4 py-3 text-body text-ink outline-none focus:border-wine focus:ring-2 focus:ring-rose" maxLength={1000} value={message} onChange={(event) => { setMessage(event.target.value); setStatus("idle"); }} aria-describedby={`${messageId}-count`} />
            <p id={`${messageId}-count`} className="text-label text-ink-muted">{message.length} / 1000 characters</p>
          </div>
          {errorMessage ? <p id={errorId} className="text-small text-wine" role="alert">{errorMessage}</p> : null}
          <div className="flex flex-wrap items-center gap-4">
            <button className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Sending report…" : status === "error" ? "Try sending again" : "Send report"}</button>
            <p className="text-small text-ink-muted" role="status" aria-live="polite">{status === "submitting" ? "Sending securely…" : status === "error" ? "Your entries are still here." : ""}</p>
          </div>
        </form>
      </div>
    </section>
  );
}
