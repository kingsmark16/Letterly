"use client";

import type {
  AdminReportDetail,
  AdminReportSummary,
} from "@letterly/contracts/moderation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createAdminAppeal,
  getAdminReport,
  listAdminReports,
  mutateAdminAppeal,
  mutateAdminPage,
  mutateAdminReport,
  mutateAdminUser,
  WebApiError,
} from "../../lib/api-client";

type ReportStatus = "OPEN" | "REVIEWED" | "DISMISSED";
type ReportReason =
  | "INAPPROPRIATE_CONTENT"
  | "HARASSMENT"
  | "SPAM"
  | "PERSONAL_INFORMATION"
  | "OTHER";
type ReportOperation = "review" | "dismiss" | "reopen";

type Confirmation =
  | {
      kind: "report";
      operation: ReportOperation;
      targetId: string;
      expectedVersion: number;
      reason: ReportReason;
      title: string;
      idempotencyKey: string;
    }
  | {
      kind: "page" | "user";
      operation: "disable" | "restore";
      targetId: string;
      expectedVersion: number;
      reason: ReportReason;
      title: string;
      idempotencyKey: string;
    }
  | {
      kind: "appeal";
      operation: "accept" | "reject";
      targetId: string;
      expectedVersion: number;
      title: string;
      idempotencyKey: string;
  };

type ConfirmationAttempt = {
  action: Confirmation;
  note: string;
  reason: ReportReason;
};

const reasons: Array<{ value: ReportReason; label: string }> = [
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SPAM", label: "Spam" },
  { value: "PERSONAL_INFORMATION", label: "Personal information" },
  { value: "OTHER", label: "Other" },
];

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/gu, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "The administrator service is unavailable. Please try again.";
}

function updateQueueUrl(
  pathname: string,
  current: ReturnType<typeof useSearchParams>,
  changes: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  if (Object.keys(changes).some((key) => key !== "report")) {
    params.delete("cursor");
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function isReportStatus(value: string | null): value is ReportStatus {
  return value === "OPEN" || value === "REVIEWED" || value === "DISMISSED";
}

function isReportReason(value: string | null): value is ReportReason {
  return reasons.some((reason) => reason.value === value);
}

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

function ConfirmationDialog({
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

  const needsReason = action.kind === "report" || action.operation === "disable";
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-ink/40 px-5 py-8" role="presentation">
      <section
        ref={dialogRef}
        className="w-full max-w-lg rounded-large border border-border bg-surface p-6 shadow-medium sm:p-8"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="moderation-confirm-title"
        aria-describedby="moderation-confirm-description"
      >
        <h2 id="moderation-confirm-title" className="font-display text-2xl font-semibold">
          {action.title}
        </h2>
        <p id="moderation-confirm-description" className="mt-3 text-small leading-relaxed text-ink-muted">
          This action is recorded in the moderation history. Confirm it only after reviewing the safe report details.
        </p>
        {needsReason ? (
          <label className="mt-5 block text-small font-semibold" htmlFor="moderation-reason">
            Reason
            <select
              ref={firstControlRef as React.RefObject<HTMLSelectElement>}
              id="moderation-reason"
              className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 text-small"
              value={reason}
              onChange={(event) => onReasonChange(event.target.value as ReportReason)}
              disabled={pending || attempted}
            >
              {reasons.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="mt-5 block text-small font-semibold" htmlFor="moderation-note">
          Internal note <span className="font-normal text-ink-muted">(optional)</span>
          <textarea
            ref={!needsReason ? (firstControlRef as React.RefObject<HTMLTextAreaElement>) : undefined}
            id="moderation-note"
            className="mt-2 min-h-24 w-full rounded-medium border border-border bg-surface-muted px-3 py-3 text-small outline-none focus:border-wine focus:ring-2 focus:ring-rose"
            maxLength={500}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            disabled={pending || attempted}
            aria-describedby="moderation-note-count"
          />
          <span id="moderation-note-count" className="mt-1 block text-label font-normal text-ink-muted">{note.length} / 500</span>
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={onCancel} disabled={pending}>Cancel</button>
          <button type="button" className="min-h-11 rounded-medium bg-wine px-4 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:opacity-60" onClick={onConfirm} disabled={pending}>{pending ? "Saving…" : attempted ? "Retry action" : "Confirm action"}</button>
        </div>
      </section>
    </div>
  );
}

type AdminReportConsoleProps = { reportId?: string };

export function AdminReportConsole({ reportId }: AdminReportConsoleProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const confirmationAttemptRef = useRef<ConfirmationAttempt | null>(null);
  const selectedId = reportId ?? searchParams.get("report");
  const statusParam = searchParams.get("status");
  const reasonParam = searchParams.get("reason");
  const statusFilter: ReportStatus | undefined = isReportStatus(statusParam) ? statusParam : undefined;
  const reasonFilter: ReportReason | undefined = isReportReason(reasonParam) ? reasonParam : undefined;
  const pageFilter = searchParams.get("pageId") ?? undefined;
  const userFilter = searchParams.get("userId") ?? undefined;
  const [pageDraft, setPageDraft] = useState(pageFilter ?? "");
  const [userDraft, setUserDraft] = useState(userFilter ?? "");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [confirmationReason, setConfirmationReason] = useState<ReportReason>("OTHER");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [appealReference, setAppealReference] = useState("");
  const [appealReason, setAppealReason] = useState<ReportReason>("OTHER");

  const queueQuery = useInfiniteQuery({
    queryKey: ["admin-reports", statusFilter, reasonFilter, pageFilter, userFilter],
    queryFn: ({ pageParam }) => listAdminReports({ status: statusFilter, reason: reasonFilter, pageId: pageFilter, userId: userFilter, size: 20, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const detailQuery = useQuery({
    queryKey: ["admin-report", selectedId],
    queryFn: () => getAdminReport(selectedId ?? ""),
    enabled: Boolean(selectedId),
  });
  const reports = useMemo<AdminReportSummary[]>(() => queueQuery.data?.pages.flatMap((page) => page.items) ?? [], [queueQuery.data]);
  const detail = detailQuery.data;

  const actionMutation = useMutation({
    mutationFn: async (attempt: ConfirmationAttempt): Promise<unknown> => {
      const { action } = attempt;
      const shared = { confirm: true as const, expectedModerationVersion: action.expectedVersion, note: attempt.note || undefined, idempotencyKey: action.idempotencyKey };
      if (action.kind === "report") return mutateAdminReport(action.targetId, action.operation, { ...shared, reason: attempt.reason });
      if (action.kind === "page") {
        return action.operation === "disable"
          ? mutateAdminPage(action.targetId, "disable", { ...shared, reason: attempt.reason })
          : mutateAdminPage(action.targetId, "restore", shared);
      }
      if (action.kind === "user") {
        return action.operation === "disable"
          ? mutateAdminUser(action.targetId, "disable", { ...shared, reason: attempt.reason })
          : mutateAdminUser(action.targetId, "restore", shared);
      }
      if (action.kind === "appeal") return mutateAdminAppeal(action.targetId, action.operation, shared);
      throw new Error("Unknown moderation action.");
    },
    onSuccess: () => {
      closeConfirmation();
      setConfirmationNote("");
      setStatusMessage("Moderation action saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-report", selectedId] });
    },
    onError: (error: unknown) => {
      if (error instanceof WebApiError && error.code === "STALE_MODERATION_VERSION") {
        closeConfirmation();
        setStatusMessage("This record changed while you were reviewing it. The latest state is loaded; confirm a new action.");
        void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-report", selectedId] });
        return;
      }
      setStatusMessage(`${errorText(error)} Your confirmation is still open so you can retry safely.`);
    },
  });
  const appealMutation = useMutation({
    mutationFn: () => {
      const targetActionId = detail?.actions.at(-1)?.id;
      if (!targetActionId) throw new Error("This report has no moderation action to appeal.");
      return createAdminAppeal({ targetActionId, externalReference: appealReference.trim(), reasonCode: appealReason, idempotencyKey: crypto.randomUUID() });
    },
    onSuccess: () => {
      setAppealReference("");
      setStatusMessage("Appeal intake recorded.");
      void queryClient.invalidateQueries({ queryKey: ["admin-report", selectedId] });
    },
    onError: (error: unknown) => setStatusMessage(errorText(error)),
  });

  function navigate(changes: Record<string, string | null>): void {
    router.replace(updateQueueUrl(pathname, searchParams, changes));
  }

  function closeConfirmation(): void {
    const trigger = confirmationTriggerRef.current;
    confirmationTriggerRef.current = null;
    confirmationAttemptRef.current = null;
    setConfirmation(null);
    window.setTimeout(() => {
      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        headingRef.current?.focus();
      }
    }, 0);
  }

  function openConfirmation(action: Confirmation): void {
    confirmationTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    confirmationAttemptRef.current = null;
    setConfirmation(action);
    setConfirmationNote("");
    setConfirmationReason(action.kind === "report" ? action.reason : action.kind === "appeal" ? "OTHER" : action.reason);
    setStatusMessage(null);
  }

  function confirmAction(): void {
    if (!confirmation) return;
    const attempt = confirmationAttemptRef.current ?? {
      action: confirmation,
      note: confirmationNote.trim(),
      reason: confirmationReason,
    };
    confirmationAttemptRef.current = attempt;
    actionMutation.mutate(attempt);
  }

  function openReportAction(operation: ReportOperation): void {
    if (!detail) return;
    openConfirmation({ kind: "report", operation, targetId: detail.id, expectedVersion: detail.moderationVersion, reason: detail.reason, title: `${humanize(operation)} report`, idempotencyKey: crypto.randomUUID() });
  }

  function openPageAction(operation: "disable" | "restore"): void {
    if (!detail) return;
    openConfirmation({ kind: "page", operation, targetId: detail.pageId, expectedVersion: detail.pageModerationVersion, reason: detail.reason, title: `${operation === "disable" ? "Disable" : "Restore"} page`, idempotencyKey: crypto.randomUUID() });
  }

  function openUserAction(operation: "disable" | "restore"): void {
    if (!detail) return;
    openConfirmation({ kind: "user", operation, targetId: detail.creatorId, expectedVersion: detail.creatorModerationVersion, reason: detail.reason, title: `${operation === "disable" ? "Disable" : "Restore"} creator`, idempotencyKey: crypto.randomUUID() });
  }

  function openAppealAction(operation: "accept" | "reject"): void {
    if (!detail?.appeal) return;
    openConfirmation({ kind: "appeal", operation, targetId: detail.appeal.id, expectedVersion: detail.appeal.moderationVersion, title: `${operation === "accept" ? "Accept" : "Reject"} appeal`, idempotencyKey: crypto.randomUUID() });
  }

  return (
    <>
      <main className="min-h-screen bg-canvas px-5 py-9 text-ink sm:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
            <div>
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Administration</p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-2 font-display text-4xl font-semibold tracking-tight">Report queue</h1>
              <p className="mt-3 max-w-2xl text-body text-ink-muted">Review only safe report and moderation metadata. Letter content and visitor responses never appear here.</p>
            </div>
            <nav className="flex flex-wrap gap-3 text-small font-bold" aria-label="Administration navigation">
              <Link className="min-h-11 rounded-medium border border-border px-4 py-3 hover:border-wine hover:text-wine" href="/admin/moderation/reports">Reports</Link>
              <Link className="min-h-11 rounded-medium border border-border px-4 py-3 hover:border-wine hover:text-wine" href="/admin/moderation/audit">Audit history</Link>
            </nav>
          </header>
          {statusMessage ? <p className="mt-5 rounded-medium border border-border bg-surface px-4 py-3 text-small" role="status" aria-live="polite">{statusMessage}</p> : null}
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
            <section className="rounded-large border border-border bg-surface p-6 shadow-low" aria-labelledby="report-list-title">
              <div className="flex items-start justify-between gap-3"><div><h2 id="report-list-title" className="font-display text-2xl font-semibold">Reports</h2><p className="mt-1 text-small text-ink-muted">Newest reports appear first.</p></div><span className="text-label font-bold uppercase tracking-[0.12em] text-ink-muted">Private</span></div>
              <div className="mt-6 grid gap-4">
                <label className="text-small font-semibold" htmlFor="report-status">Status<select id="report-status" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3" value={statusFilter ?? ""} onChange={(event) => navigate({ status: event.target.value || null, report: null })}><option value="">All reports</option><option value="OPEN">Open</option><option value="REVIEWED">Reviewed</option><option value="DISMISSED">Dismissed</option></select></label>
                <label className="text-small font-semibold" htmlFor="report-reason">Reason<select id="report-reason" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3" value={reasonFilter ?? ""} onChange={(event) => navigate({ reason: event.target.value || null, report: null })}><option value="">All reasons</option>{reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="text-small font-semibold" htmlFor="report-page-id">Page ID<input id="report-page-id" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3" value={pageDraft} onChange={(event) => setPageDraft(event.target.value)} /></label><button type="button" className="min-h-11 self-end rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={() => navigate({ pageId: pageDraft.trim() || null, report: null })}>Apply</button></div>
                <label className="text-small font-semibold" htmlFor="report-user-id">Creator ID<input id="report-user-id" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3" value={userDraft} onChange={(event) => setUserDraft(event.target.value)} /></label>
                <button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine" onClick={() => navigate({ userId: userDraft.trim() || null, report: null })}>Apply creator filter</button>
              </div>
              {queueQuery.isPending ? <p className="mt-6 text-small text-ink-muted" role="status">Loading reports…</p> : null}
              {queueQuery.error ? <div className="mt-6 rounded-medium border border-rose bg-surface-muted p-4 text-small text-wine" role="alert"><p>{errorText(queueQuery.error)}</p><button type="button" className="mt-3 min-h-11 underline underline-offset-4" onClick={() => void queueQuery.refetch()}>Try again</button></div> : null}
              {!queueQuery.isPending && !queueQuery.error && reports.length === 0 ? <p className="mt-6 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">No reports match these filters.</p> : null}
              <ul className="mt-6 space-y-3" aria-label="Reports">
                {reports.map((item) => <li key={item.id}><button type="button" className={`w-full rounded-medium border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine ${selectedId === item.id ? "border-wine bg-surface-muted" : "border-border bg-surface"}`} onClick={() => navigate({ report: item.id })}><span className="flex items-center justify-between gap-3 text-small font-semibold"><span>{humanize(item.reason)}</span><span className="text-label uppercase text-ink-muted">{item.status}</span></span><span className="mt-2 block break-all text-label text-ink-muted">Page {item.pageId}</span><span className="mt-1 block text-label text-ink-muted">{formatDate(item.createdAt)}</span></button></li>)}
              </ul>
              {queueQuery.hasNextPage ? <button type="button" className="mt-5 min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={queueQuery.isFetchingNextPage} onClick={() => void queueQuery.fetchNextPage()}>{queueQuery.isFetchingNextPage ? "Loading…" : "Load more reports"}</button> : null}
            </section>
            <section className="rounded-large border border-border bg-surface p-6 shadow-low sm:p-8" aria-labelledby="report-detail-title">
              {selectedId ? <button type="button" className="mb-5 min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine lg:hidden" onClick={() => navigate({ report: null })}>Back to reports</button> : null}
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">Review</p>
              <h2 id="report-detail-title" className="mt-2 font-display text-3xl font-semibold tracking-tight">Report detail</h2>
              {!selectedId ? <p className="mt-6 text-body text-ink-muted">Choose a report to review its safe moderation history.</p> : null}
              {detailQuery.isPending ? <p className="mt-6 text-small text-ink-muted" role="status">Loading report detail…</p> : null}
              {detailQuery.error ? <div className="mt-6 rounded-medium border border-rose bg-surface-muted p-4 text-small text-wine" role="alert"><p>{errorText(detailQuery.error)}</p><button type="button" className="mt-3 min-h-11 underline underline-offset-4" onClick={() => void detailQuery.refetch()}>Try again</button></div> : null}
              {detail ? <ReportDetail detail={detail} mutating={actionMutation.isPending} appealMutating={appealMutation.isPending} onReportAction={openReportAction} onPageAction={openPageAction} onUserAction={openUserAction} onAppealAction={openAppealAction} appealReference={appealReference} appealReason={appealReason} onAppealReferenceChange={setAppealReference} onAppealReasonChange={setAppealReason} onCreateAppeal={() => appealMutation.mutate()} /> : null}
            </section>
          </div>
        </div>
      </main>
      {confirmation ? <ConfirmationDialog action={confirmation} note={confirmationNote} reason={confirmationReason} onNoteChange={setConfirmationNote} onReasonChange={setConfirmationReason} onCancel={closeConfirmation} onConfirm={confirmAction} pending={actionMutation.isPending} attempted={Boolean(confirmationAttemptRef.current)} /> : null}
    </>
  );
}

interface ReportDetailProps {
  detail: AdminReportDetail;
  mutating: boolean;
  appealMutating: boolean;
  onReportAction: (operation: ReportOperation) => void;
  onPageAction: (operation: "disable" | "restore") => void;
  onUserAction: (operation: "disable" | "restore") => void;
  onAppealAction: (operation: "accept" | "reject") => void;
  appealReference: string;
  appealReason: ReportReason;
  onAppealReferenceChange: (value: string) => void;
  onAppealReasonChange: (value: ReportReason) => void;
  onCreateAppeal: () => void;
}

function ReportDetail({
  detail,
  mutating,
  appealMutating,
  onReportAction,
  onPageAction,
  onUserAction,
  onAppealAction,
  appealReference,
  appealReason,
  onAppealReferenceChange,
  onAppealReasonChange,
  onCreateAppeal,
}: ReportDetailProps): React.JSX.Element {
  return (
    <div className="mt-6 space-y-7">
      <dl className="grid gap-4 text-small sm:grid-cols-2"><div><dt className="font-semibold text-ink-muted">Reason</dt><dd className="mt-1">{humanize(detail.reason)}</dd></div><div><dt className="font-semibold text-ink-muted">Status</dt><dd className="mt-1">{humanize(detail.status)}</dd></div><div><dt className="font-semibold text-ink-muted">Page</dt><dd className="mt-1 break-all">{detail.pageId}</dd></div><div><dt className="font-semibold text-ink-muted">Creator</dt><dd className="mt-1 break-all">{detail.creatorId}</dd></div><div><dt className="font-semibold text-ink-muted">Page moderation</dt><dd className="mt-1">{humanize(detail.pageModerationStatus)} · version {detail.pageModerationVersion}</dd></div><div><dt className="font-semibold text-ink-muted">Creator moderation</dt><dd className="mt-1">{humanize(detail.creatorModerationStatus)} · version {detail.creatorModerationVersion}</dd></div></dl>
      {detail.message ? <div><h3 className="font-display text-xl font-semibold">Report message</h3><p className="mt-3 whitespace-pre-wrap rounded-medium border border-border bg-surface-muted p-4 text-body">{detail.message}</p></div> : <p className="rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">No additional message was provided.</p>}
      <section aria-labelledby="report-actions-title"><h3 id="report-actions-title" className="font-display text-xl font-semibold">Report actions</h3><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-medium bg-wine px-4 py-3 text-small font-bold text-surface disabled:opacity-60" disabled={mutating || detail.status === "REVIEWED"} onClick={() => onReportAction("review")}>Mark reviewed</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.status === "DISMISSED"} onClick={() => onReportAction("dismiss")}>Dismiss</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.status === "OPEN"} onClick={() => onReportAction("reopen")}>Reopen</button></div></section>
      <section aria-labelledby="target-actions-title"><h3 id="target-actions-title" className="font-display text-xl font-semibold">Target safety controls</h3><p className="mt-2 text-small text-ink-muted">These controls change moderation state only. They never open the page or expose private content.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.pageModerationStatus === "DISABLED"} onClick={() => onPageAction("disable")}>Disable page</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.pageModerationStatus === "ACTIVE"} onClick={() => onPageAction("restore")}>Restore page</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.creatorModerationStatus === "DISABLED"} onClick={() => onUserAction("disable")}>Disable creator</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating || detail.creatorModerationStatus === "ACTIVE"} onClick={() => onUserAction("restore")}>Restore creator</button></div></section>
      <section aria-labelledby="appeal-title"><h3 id="appeal-title" className="font-display text-xl font-semibold">Appeal state</h3>{detail.appeal ? <div className="mt-3 rounded-medium border border-border bg-surface-muted p-4 text-small"><p><span className="font-semibold">{humanize(detail.appeal.status)}</span> · {detail.appeal.externalReference}</p><p className="mt-1 text-ink-muted">{humanize(detail.appeal.reasonCode)} · version {detail.appeal.moderationVersion}</p>{detail.appeal.status === "REQUESTED" ? <div className="mt-4 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-medium bg-wine px-4 py-3 text-small font-bold text-surface disabled:opacity-60" disabled={mutating} onClick={() => onAppealAction("accept")}>Accept appeal</button><button type="button" className="min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={mutating} onClick={() => onAppealAction("reject")}>Reject appeal</button></div> : null}</div> : <form className="mt-3 rounded-medium border border-border bg-surface-muted p-4" onSubmit={(event) => { event.preventDefault(); onCreateAppeal(); }}><p className="text-small text-ink-muted">Record an external support intake without adding creator writing to the moderation record.</p><label className="mt-4 block text-small font-semibold" htmlFor="appeal-reference">External reference<input id="appeal-reference" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" maxLength={120} required value={appealReference} onChange={(event) => onAppealReferenceChange(event.target.value)} /></label><label className="mt-4 block text-small font-semibold" htmlFor="appeal-reason">Reason<select id="appeal-reason" className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface px-3" value={appealReason} onChange={(event) => onAppealReasonChange(event.target.value as ReportReason)}>{reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><button type="submit" className="mt-4 min-h-11 rounded-medium border border-border px-4 py-3 text-small font-bold hover:border-wine hover:text-wine disabled:opacity-60" disabled={appealMutating || !detail.actions.length}>{appealMutating ? "Saving…" : "Record appeal intake"}</button></form>}</section>
      <section aria-labelledby="history-title"><h3 id="history-title" className="font-display text-xl font-semibold">Moderation history</h3>{detail.actions.length === 0 ? <p className="mt-3 text-small text-ink-muted">No actions have been recorded.</p> : <ol className="mt-4 space-y-3">{detail.actions.map((action) => <li key={action.id} className="rounded-medium border border-border bg-surface-muted p-4 text-small"><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">{humanize(action.actionType)}</p><time className="text-label text-ink-muted" dateTime={action.createdAt}>{formatDate(action.createdAt)}</time></div><p className="mt-1 text-ink-muted">{humanize(action.targetType)} · {action.targetId}</p>{action.note ? <p className="mt-2 whitespace-pre-wrap">{action.note}</p> : null}</li>)}</ol>}</section>
    </div>
  );
}
