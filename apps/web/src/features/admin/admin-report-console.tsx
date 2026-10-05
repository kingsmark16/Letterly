"use client";

import type { AdminReportSummary } from "@letterly/contracts/moderation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
} from "./api";
import { ConfirmationDialog } from "./admin-confirmation-dialog";
import { ReportDetail } from "./admin-report-detail";
import {
  humanize,
  formatDate,
  reasons,
  isReportStatus,
  isReportReason,
  type ReportStatus,
  type ReportReason,
  type ReportOperation,
  type Confirmation,
} from "./moderation-presentation";
import { WebApiError } from "../../lib/api/errors";

type ConfirmationAttempt = {
  action: Confirmation;
  note: string;
  reason: ReportReason;
};

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

type AdminReportConsoleProps = { reportId?: string };

export function AdminReportConsole({
  reportId,
}: AdminReportConsoleProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  const focusRestorationRef = useRef<{
    trigger: HTMLElement | null;
    waitForDetail: boolean;
  } | null>(null);
  const confirmationAttemptRef = useRef<ConfirmationAttempt | null>(null);
  const selectedId = reportId ?? searchParams.get("report");
  const statusParam = searchParams.get("status");
  const reasonParam = searchParams.get("reason");
  const statusFilter: ReportStatus | undefined = isReportStatus(statusParam)
    ? statusParam
    : undefined;
  const reasonFilter: ReportReason | undefined = isReportReason(reasonParam)
    ? reasonParam
    : undefined;
  const pageFilter = searchParams.get("pageId") ?? undefined;
  const userFilter = searchParams.get("userId") ?? undefined;
  const [pageDraft, setPageDraft] = useState(pageFilter ?? "");
  const [userDraft, setUserDraft] = useState(userFilter ?? "");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [confirmationNote, setConfirmationNote] = useState("");
  const [confirmationReason, setConfirmationReason] =
    useState<ReportReason>("OTHER");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [appealReference, setAppealReference] = useState("");
  const [appealReason, setAppealReason] = useState<ReportReason>("OTHER");

  const queueQuery = useInfiniteQuery({
    queryKey: [
      "admin-reports",
      statusFilter,
      reasonFilter,
      pageFilter,
      userFilter,
    ],
    queryFn: ({ pageParam, signal }) =>
      listAdminReports(
        {
          status: statusFilter,
          reason: reasonFilter,
          pageId: pageFilter,
          userId: userFilter,
          size: 20,
          cursor: pageParam,
        },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const detailQuery = useQuery({
    queryKey: ["admin-report", selectedId],
    queryFn: ({ signal }) => getAdminReport(selectedId ?? "", { signal }),
    enabled: Boolean(selectedId),
  });
  const reports = useMemo<AdminReportSummary[]>(
    () => queueQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [queueQuery.data],
  );
  const detail = detailQuery.data;

  const actionMutation = useMutation({
    mutationFn: async (attempt: ConfirmationAttempt): Promise<unknown> => {
      const { action } = attempt;
      const shared = {
        confirm: true as const,
        expectedModerationVersion: action.expectedVersion,
        note: attempt.note || undefined,
        idempotencyKey: action.idempotencyKey,
      };
      if (action.kind === "report")
        return mutateAdminReport(action.targetId, action.operation, {
          ...shared,
          reason: attempt.reason,
        });
      if (action.kind === "page") {
        return action.operation === "disable"
          ? mutateAdminPage(action.targetId, "disable", {
              ...shared,
              reason: attempt.reason,
            })
          : mutateAdminPage(action.targetId, "restore", shared);
      }
      if (action.kind === "user") {
        return action.operation === "disable"
          ? mutateAdminUser(action.targetId, "disable", {
              ...shared,
              reason: attempt.reason,
            })
          : mutateAdminUser(action.targetId, "restore", shared);
      }
      if (action.kind === "appeal")
        return mutateAdminAppeal(action.targetId, action.operation, shared);
      throw new Error("Unknown moderation action.");
    },
    onSuccess: () => {
      closeConfirmation(true);
      setConfirmationNote("");
      setStatusMessage("Moderation action saved.");
      void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin-report", selectedId],
      });
    },
    onError: (error: unknown) => {
      if (
        error instanceof WebApiError &&
        error.code === "STALE_MODERATION_VERSION"
      ) {
        closeConfirmation(true);
        setStatusMessage(
          "This record changed while you were reviewing it. The latest state is loaded; confirm a new action.",
        );
        void queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
        void queryClient.invalidateQueries({
          queryKey: ["admin-report", selectedId],
        });
        return;
      }
      setStatusMessage(
        `${errorText(error)} Your confirmation is still open so you can retry safely.`,
      );
    },
  });
  const appealMutation = useMutation({
    mutationFn: () => {
      const targetActionId = detail?.actions.at(-1)?.id;
      if (!targetActionId)
        throw new Error("This report has no moderation action to appeal.");
      return createAdminAppeal({
        targetActionId,
        externalReference: appealReference.trim(),
        reasonCode: appealReason,
        idempotencyKey: crypto.randomUUID(),
      });
    },
    onSuccess: () => {
      setAppealReference("");
      setStatusMessage("Appeal intake recorded.");
      void queryClient.invalidateQueries({
        queryKey: ["admin-report", selectedId],
      });
    },
    onError: (error: unknown) => setStatusMessage(errorText(error)),
  });

  useEffect(() => {
    if (
      confirmation ||
      actionMutation.isPending ||
      !focusRestorationRef.current ||
      (focusRestorationRef.current.waitForDetail && detailQuery.isFetching)
    )
      return;
    const { trigger } = focusRestorationRef.current;
    focusRestorationRef.current = null;
    if (trigger?.isConnected) trigger.focus();
    if (!trigger || document.activeElement !== trigger)
      headingRef.current?.focus();
  }, [confirmation, actionMutation.isPending, detailQuery.isFetching]);

  function navigate(changes: Record<string, string | null>): void {
    router.replace(updateQueueUrl(pathname, searchParams, changes));
  }

  function closeConfirmation(waitForDetail = false): void {
    const trigger = confirmationTriggerRef.current;
    confirmationTriggerRef.current = null;
    confirmationAttemptRef.current = null;
    focusRestorationRef.current = { trigger, waitForDetail };
    setConfirmation(null);
  }

  function openConfirmation(action: Confirmation): void {
    confirmationTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    confirmationAttemptRef.current = null;
    setConfirmation(action);
    setConfirmationNote("");
    setConfirmationReason(
      action.kind === "report"
        ? action.reason
        : action.kind === "appeal"
          ? "OTHER"
          : action.reason,
    );
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
    openConfirmation({
      kind: "report",
      operation,
      targetId: detail.id,
      expectedVersion: detail.moderationVersion,
      reason: detail.reason,
      title: `${humanize(operation)} report`,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  function openPageAction(operation: "disable" | "restore"): void {
    if (!detail) return;
    openConfirmation({
      kind: "page",
      operation,
      targetId: detail.pageId,
      expectedVersion: detail.pageModerationVersion,
      reason: detail.reason,
      title: `${operation === "disable" ? "Disable" : "Restore"} page`,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  function openUserAction(operation: "disable" | "restore"): void {
    if (!detail) return;
    openConfirmation({
      kind: "user",
      operation,
      targetId: detail.creatorId,
      expectedVersion: detail.creatorModerationVersion,
      reason: detail.reason,
      title: `${operation === "disable" ? "Disable" : "Restore"} creator`,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  function openAppealAction(operation: "accept" | "reject"): void {
    if (!detail?.appeal) return;
    openConfirmation({
      kind: "appeal",
      operation,
      targetId: detail.appeal.id,
      expectedVersion: detail.appeal.moderationVersion,
      title: `${operation === "accept" ? "Accept" : "Reject"} appeal`,
      idempotencyKey: crypto.randomUUID(),
    });
  }

  return (
    <>
      <main
        className="min-h-screen bg-canvas px-5 py-9 text-ink sm:px-8"
        id="main-content"
      >
        <div className="mx-auto w-full max-w-7xl">
          <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-6">
            <div>
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                Administration
              </p>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 font-display text-4xl font-semibold tracking-tight"
              >
                Report queue
              </h1>
              <p className="mt-3 max-w-2xl text-body text-ink-muted">
                Review only safe report and moderation metadata. Letter content
                and visitor responses never appear here.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-3 text-small font-bold"
              aria-label="Administration navigation"
            >
              <Link
                className="min-h-11 rounded-medium border border-border px-4 py-3 hover:border-wine hover:text-wine"
                href="/admin/moderation/reports"
              >
                Reports
              </Link>
              <Link
                className="min-h-11 rounded-medium border border-border px-4 py-3 hover:border-wine hover:text-wine"
                href="/admin/moderation/audit"
              >
                Audit history
              </Link>
            </nav>
          </header>
          {statusMessage ? (
            <p
              className="mt-5 rounded-medium border border-border bg-surface px-4 py-3 text-small"
              role="status"
              aria-live="polite"
            >
              {statusMessage}
            </p>
          ) : null}
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(0,1.2fr)]">
            <section
              className="rounded-large border border-border bg-surface p-6 shadow-low"
              aria-labelledby="report-list-title"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="report-list-title"
                    className="font-display text-2xl font-semibold"
                  >
                    Reports
                  </h2>
                  <p className="mt-1 text-small text-ink-muted">
                    Newest reports appear first.
                  </p>
                </div>
                <span className="text-label font-bold uppercase tracking-[0.12em] text-ink-muted">
                  Private
                </span>
              </div>
              <div className="mt-6 grid gap-4">
                <label
                  className="text-small font-semibold"
                  htmlFor="report-status"
                >
                  Status
                  <select
                    id="report-status"
                    className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3"
                    value={statusFilter ?? ""}
                    onChange={(event) =>
                      navigate({
                        status: event.target.value || null,
                        report: null,
                      })
                    }
                  >
                    <option value="">All reports</option>
                    <option value="OPEN">Open</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="DISMISSED">Dismissed</option>
                  </select>
                </label>
                <label
                  className="text-small font-semibold"
                  htmlFor="report-reason"
                >
                  Reason
                  <select
                    id="report-reason"
                    className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3"
                    value={reasonFilter ?? ""}
                    onChange={(event) =>
                      navigate({
                        reason: event.target.value || null,
                        report: null,
                      })
                    }
                  >
                    <option value="">All reasons</option>
                    {reasons.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <label
                    className="text-small font-semibold"
                    htmlFor="report-page-id"
                  >
                    Page ID
                    <Input
                      id="report-page-id"
                      className="mt-2 min-h-11 w-full rounded-medium bg-surface-muted px-3"
                      value={pageDraft}
                      onChange={(event) => setPageDraft(event.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    className="self-end px-4 hover:border-wine"
                    onClick={() =>
                      navigate({
                        pageId: pageDraft.trim() || null,
                        report: null,
                      })
                    }
                  >
                    Apply
                  </Button>
                </div>
                <label
                  className="text-small font-semibold"
                  htmlFor="report-user-id"
                >
                  Creator ID
                  <Input
                    id="report-user-id"
                    className="mt-2 min-h-11 w-full rounded-medium bg-surface-muted px-3"
                    value={userDraft}
                    onChange={(event) => setUserDraft(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-4 hover:border-wine"
                  onClick={() =>
                    navigate({ userId: userDraft.trim() || null, report: null })
                  }
                >
                  Apply creator filter
                </Button>
              </div>
              {queueQuery.isPending ? (
                <p className="mt-6 text-small text-ink-muted" role="status">
                  Loading reports…
                </p>
              ) : null}
              {queueQuery.error ? (
                <div
                  className="mt-6 rounded-medium border border-rose bg-surface-muted p-4 text-small text-wine"
                  role="alert"
                >
                  <p>{errorText(queueQuery.error)}</p>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    className="mt-3 min-h-11"
                    onClick={() => void queueQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
              {!queueQuery.isPending &&
              !queueQuery.error &&
              reports.length === 0 ? (
                <p className="mt-6 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">
                  No reports match these filters.
                </p>
              ) : null}
              <ul className="mt-6 space-y-3" aria-label="Reports">
                {reports.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full rounded-medium border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine ${selectedId === item.id ? "border-wine bg-surface-muted" : "border-border bg-surface"}`}
                      onClick={() => navigate({ report: item.id })}
                    >
                      <span className="flex items-center justify-between gap-3 text-small font-semibold">
                        <span>{humanize(item.reason)}</span>
                        <span className="text-label uppercase text-ink-muted">
                          {item.status}
                        </span>
                      </span>
                      <span className="mt-2 block break-all text-label text-ink-muted">
                        Page {item.pageId}
                      </span>
                      <span className="mt-1 block text-label text-ink-muted">
                        {formatDate(item.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {queueQuery.hasNextPage ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-5 px-4 hover:border-wine"
                  disabled={queueQuery.isFetchingNextPage}
                  onClick={() => void queueQuery.fetchNextPage()}
                >
                  {queueQuery.isFetchingNextPage
                    ? "Loading…"
                    : "Load more reports"}
                </Button>
              ) : null}
            </section>
            <section
              className="rounded-large border border-border bg-surface p-6 shadow-low sm:p-8"
              aria-labelledby="report-detail-title"
            >
              {selectedId ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="mb-5 px-4 hover:border-wine lg:hidden"
                  onClick={() => navigate({ report: null })}
                >
                  Back to reports
                </Button>
              ) : null}
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                Review
              </p>
              <h2
                id="report-detail-title"
                className="mt-2 font-display text-3xl font-semibold tracking-tight"
              >
                Report detail
              </h2>
              {!selectedId ? (
                <p className="mt-6 text-body text-ink-muted">
                  Choose a report to review its safe moderation history.
                </p>
              ) : null}
              {detailQuery.isPending ? (
                <p className="mt-6 text-small text-ink-muted" role="status">
                  Loading report detail…
                </p>
              ) : null}
              {detailQuery.error ? (
                <div
                  className="mt-6 rounded-medium border border-rose bg-surface-muted p-4 text-small text-wine"
                  role="alert"
                >
                  <p>{errorText(detailQuery.error)}</p>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    className="mt-3 min-h-11"
                    onClick={() => void detailQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
              {detail ? (
                <ReportDetail
                  detail={detail}
                  mutating={actionMutation.isPending}
                  appealMutating={appealMutation.isPending}
                  onReportAction={openReportAction}
                  onPageAction={openPageAction}
                  onUserAction={openUserAction}
                  onAppealAction={openAppealAction}
                  appealReference={appealReference}
                  appealReason={appealReason}
                  onAppealReferenceChange={setAppealReference}
                  onAppealReasonChange={setAppealReason}
                  onCreateAppeal={() => appealMutation.mutate()}
                />
              ) : null}
            </section>
          </div>
        </div>
      </main>
      {confirmation ? (
        <ConfirmationDialog
          action={confirmation}
          note={confirmationNote}
          reason={confirmationReason}
          onNoteChange={setConfirmationNote}
          onReasonChange={setConfirmationReason}
          onCancel={() => closeConfirmation()}
          onConfirm={confirmAction}
          pending={actionMutation.isPending}
          attempted={Boolean(confirmationAttemptRef.current)}
        />
      ) : null}
    </>
  );
}
