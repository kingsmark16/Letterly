"use client";

import type { OwnerSubmissionSummary } from "@letterly/contracts/submissions";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { LoadingState } from "../../../components/loading-state";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import {
  deleteSubmission,
  getOwnerPage,
  listSubmissions,
  markSubmissionRead,
  WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { EditorSectionNav, type EditorSection } from "./editor-section-nav";
import editorStyles from "./draft-editor.module.css";
import styles from "./response-dashboard.module.css";
import { SubmissionResponseDialog } from "./submission-response-dialog";

interface ResponseDashboardProps {
  pageId: string;
}

type MutationErrorState = {
  action: "read" | "delete";
  submissionId: string;
  message: string;
};

type ReadStatus = "read" | "unread" | "pending" | "error";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Date unavailable";

  const difference = timestamp - Date.now();
  const absoluteDifference = Math.abs(difference);
  const relativeTime = new Intl.RelativeTimeFormat(undefined, {
    numeric: "always",
  });
  const quantity = (unitInMilliseconds: number): number =>
    Math.sign(difference) * Math.floor(absoluteDifference / unitInMilliseconds);

  if (absoluteDifference < 60_000) return "Just now";
  if (absoluteDifference < 3_600_000) {
    return relativeTime.format(quantity(60_000), "minute");
  }
  if (absoluteDifference < 86_400_000) {
    return relativeTime.format(quantity(3_600_000), "hour");
  }
  if (absoluteDifference < 2_592_000_000) {
    return relativeTime.format(quantity(86_400_000), "day");
  }
  if (absoluteDifference < 31_536_000_000) {
    return relativeTime.format(quantity(2_592_000_000), "month");
  }
  return relativeTime.format(quantity(31_536_000_000), "year");
}

function updateSearch(
  pathname: string,
  filter: "all" | "unread",
  selected: string | null,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (selected) params.set("selected", selected);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function editorSectionHref(pageId: string, section: EditorSection): string {
  const editPath = `/dashboard/pages/${pageId}/edit`;
  return section === "preview" ? editPath : `${editPath}?section=${section}`;
}

function ResponseDashboardFrame({
  pageId,
  published,
  children,
}: {
  pageId: string;
  published: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <main
      className={editorStyles.page}
      data-response-page="true"
      id="dashboard-content"
    >
      <div className={`${editorStyles.editorShell} ${styles.responseShell}`}>
        <div className={editorStyles.editorTopline}>
          <Link
            className={editorStyles.backLink}
            href={editorSectionHref(pageId, "analytics")}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Link>
          <EditorSectionNav
            activeSection="analytics"
            published={published}
            hrefForSection={(section) => editorSectionHref(pageId, section)}
          />
        </div>
        {children}
      </div>
    </main>
  );
}

export function ResponseDashboard({
  pageId,
}: ResponseDashboardProps): React.JSX.Element {
  const session = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const readAttemptedIdsRef = useRef(new Set<string>());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<MutationErrorState | null>(
    null,
  );
  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const selectedId = searchParams.get("selected") || null;

  const pageQuery = useQuery({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getOwnerPage(pageId),
    enabled: Boolean(session.data),
  });
  const listQuery = useInfiniteQuery({
    queryKey: pageKeys.submissionFeed(pageId, filter),
    queryFn: ({ pageParam }) =>
      listSubmissions(pageId, { filter, cursor: pageParam, size: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(session.data),
  });
  const summaries = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );
  const unreadCount = listQuery.data?.pages[0]?.unreadCount ?? 0;

  const readMutation = useMutation({
    mutationFn: (submissionId: string) =>
      markSubmissionRead(pageId, submissionId),
    onSuccess: (_result, submissionId) => {
      setMutationError(null);
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissionFeed(pageId, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissionFeed(pageId, "unread"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: ["submission", pageId, submissionId],
      });
    },
    onError: (error, submissionId) => {
      readAttemptedIdsRef.current.delete(submissionId);
      setMutationError({
        action: "read",
        submissionId,
        message:
          error instanceof WebApiError
            ? error.message
            : "We could not mark this response as read. Please try again.",
      });
    },
  });
  const markRead = readMutation.mutate;
  const deleteMutation = useMutation({
    mutationFn: (submissionId: string) =>
      deleteSubmission(pageId, submissionId, { confirm: true }),
    onSuccess: () => {
      setDeleteTargetId(null);
      setMutationError(null);
      router.replace(updateSearch(pathname, filter, null), { scroll: false });
      setStatusMessage("Response deleted.");
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissionFeed(pageId, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissionFeed(pageId, "unread"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "all"),
      });
      window.setTimeout(() => headingRef.current?.focus(), 0);
    },
    onError: (error, submissionId) => {
      setMutationError({
        action: "delete",
        submissionId,
        message:
          error instanceof WebApiError
            ? error.message
            : "We could not delete this response. Please try again.",
      });
    },
  });

  useEffect(() => {
    if (!selectedId) return;
    const selectedResponse = summaries.find((item) => item.id === selectedId);
    if (
      selectedResponse?.readState !== "UNREAD" ||
      readAttemptedIdsRef.current.has(selectedId)
    ) {
      return;
    }

    readAttemptedIdsRef.current.add(selectedId);
    markRead(selectedId);
  }, [markRead, selectedId, summaries]);

  function selectResponse(item: OwnerSubmissionSummary): void {
    setMutationError(null);
    setStatusMessage(null);
    router.push(updateSearch(pathname, filter, item.id), { scroll: false });
  }

  function closeResponse(): void {
    const closedSubmissionId = selectedId;
    router.replace(updateSearch(pathname, filter, null), { scroll: false });
    if (!closedSubmissionId) return;

    window.requestAnimationFrame(() => {
      const responseButton = document.getElementById(
        `response-row-${closedSubmissionId}`,
      );
      if (responseButton instanceof HTMLElement) {
        responseButton.focus();
      } else {
        headingRef.current?.focus();
      }
    });
  }

  function deleteSelectedResponse(): void {
    if (!selectedId) return;
    setMutationError(null);
    setDeleteTargetId(selectedId);
  }

  function retryFailedMutation(): void {
    if (!mutationError) return;

    const failedMutation = mutationError;
    setMutationError(null);
    if (failedMutation.action === "read") {
      readAttemptedIdsRef.current.add(failedMutation.submissionId);
      readMutation.mutate(failedMutation.submissionId);
      return;
    }

    deleteMutation.mutate(failedMutation.submissionId);
  }

  if (session.isPending) {
    return (
      <LoadingState
        variant="page"
        id="dashboard-content"
        title="Checking your session"
        description="Getting your private inbox ready."
      />
    );
  }

  if (!session.data) {
    return (
      <main
        className="min-h-screen bg-canvas px-5 py-10 text-ink"
        id="dashboard-content"
      >
        <div className="grid min-h-[calc(100svh-8rem)] place-items-center">
          <section className="w-full max-w-xl rounded-medium border border-border bg-surface p-6 text-center sm:p-8">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Sign in to read responses.
            </h1>
            <p className="mt-4 text-body-large text-ink-muted">
              Only the page creator can open private responses.
            </p>
            <Link
              className="mt-7 inline-flex min-h-11 items-center rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              href="/sign-in"
            >
              Continue to sign in
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (pageQuery.isPending || listQuery.isPending) {
    return (
      <ResponseDashboardFrame
        pageId={pageId}
        published={pageQuery.data?.status === "PUBLISHED"}
      >
        <LoadingState
          variant="section"
          hideFooter
          title="Loading responses"
          description="Opening your private inbox."
        />
      </ResponseDashboardFrame>
    );
  }

  if (pageQuery.isError || listQuery.isError || !pageQuery.data) {
    const error = (pageQuery.error ?? listQuery.error) as WebApiError | null;
    return (
      <ResponseDashboardFrame
        pageId={pageId}
        published={pageQuery.data?.status === "PUBLISHED"}
      >
        <section className={styles.content} role="alert">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Responses unavailable
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            We could not load this page.
          </h1>
          <p className="mt-2 text-small text-ink-muted sm:text-body">
            {error?.message ?? "Please try loading the page again."}
          </p>
          <button
            className="mt-4 min-h-11 rounded-small bg-wine px-5 py-3 text-small font-bold text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            type="button"
            onClick={() => {
              void pageQuery.refetch();
              void listQuery.refetch();
            }}
          >
            Try again
          </button>
        </section>
      </ResponseDashboardFrame>
    );
  }

  const selectedMutationError =
    mutationError?.submissionId === selectedId ? mutationError : null;
  let readStatus: ReadStatus | null = null;
  if (selectedId) {
    if (selectedMutationError?.action === "read") {
      readStatus = "error";
    } else if (
      readMutation.variables === selectedId &&
      readMutation.isPending
    ) {
      readStatus = "pending";
    } else if (
      readMutation.variables === selectedId &&
      readMutation.isSuccess
    ) {
      readStatus = "read";
    } else {
      const selectedSummary = summaries.find((item) => item.id === selectedId);
      readStatus = selectedSummary
        ? selectedSummary.readState === "UNREAD"
          ? "unread"
          : "read"
        : null;
    }
  }

  return (
    <ResponseDashboardFrame
      pageId={pageId}
      published={pageQuery.data.status === "PUBLISHED"}
    >
      <div className={styles.content}>
        <header className="border-b border-border pb-4">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-label font-bold uppercase tracking-[0.14em] text-wine"
          >
            Private inbox
          </h1>
          <p className="mt-1.5 text-small text-ink-muted sm:text-body">
            Only you can read these replies.
          </p>
        </header>

        <nav
          className={`mt-4 flex flex-wrap gap-2 ${styles.filters}`}
          aria-label="Filter responses"
        >
          {(["all", "unread"] as const).map((value) => {
            const isActive = filter === value;
            return (
              <Link
                key={value}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 items-center justify-center rounded-small border px-3 py-2 text-small font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine ${isActive ? "border-wine bg-wine" : "border-border bg-surface hover:border-wine hover:text-wine"}`}
                href={updateSearch(pathname, value, null)}
                scroll={false}
              >
                {value === "all" ? "All responses" : `Unread (${unreadCount})`}
              </Link>
            );
          })}
        </nav>

        {statusMessage ? (
          <p
            className="mt-3 text-small text-olive"
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        ) : null}
        {mutationError && !selectedMutationError ? (
          <div
            className="mt-3 flex flex-wrap items-center gap-3 text-small text-error"
            role="alert"
          >
            <p>{mutationError.message}</p>
            <button
              className="min-h-11 rounded-small border border-error px-3 py-2 font-bold text-error hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              type="button"
              onClick={retryFailedMutation}
              disabled={readMutation.isPending || deleteMutation.isPending}
            >
              Retry
            </button>
          </div>
        ) : null}

        <section
          className="mt-4 overflow-hidden rounded-medium border border-border bg-surface"
          aria-label={filter === "all" ? "All responses" : "Unread responses"}
        >
          {summaries.length === 0 ? (
            <div className="px-4 py-6 sm:px-6 sm:py-7" aria-live="polite">
              <h2 className="font-display text-2xl font-semibold">
                {filter === "unread"
                  ? "You’re all caught up."
                  : "No responses yet."}
              </h2>
              <p className="mt-2 max-w-2xl text-body text-ink-muted">
                {filter === "unread"
                  ? "New unread replies will appear here."
                  : "When someone replies to this letter, their private response will appear here."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {summaries.map((item) => (
                <li key={item.id}>
                  <button
                    id={`response-row-${item.id}`}
                    type="button"
                    className="group flex min-h-16 w-full min-w-0 items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine sm:px-5"
                    onClick={() => selectResponse(item)}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-bold text-ink">
                          Anonymous response
                        </span>
                        {item.readState === "UNREAD" ? (
                          <span className="rounded-small bg-surface-muted px-2 py-1 text-label font-bold text-wine">
                            Unread
                          </span>
                        ) : null}
                      </span>
                      <span className="text-small text-ink-muted">
                        {item.answerCount} answer
                        {item.answerCount === 1 ? "" : "s"}
                        {item.hasVisitorMessage ? " · Private message" : ""}
                        {" · "}
                        <time
                          dateTime={item.submittedAt}
                          title={formatDate(item.submittedAt)}
                        >
                          {formatRelativeTime(item.submittedAt)}
                        </time>
                      </span>
                    </span>
                    <svg
                      className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-wine"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="m9 5 7 7-7 7"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.8"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {listQuery.hasNextPage ? (
          <div className="mt-4 flex justify-center">
            <button
              className="min-h-11 rounded-small border border-border bg-surface px-5 py-3 text-small font-bold hover:border-wine hover:text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              type="button"
              disabled={listQuery.isFetchingNextPage}
              onClick={() => void listQuery.fetchNextPage()}
            >
              {listQuery.isFetchingNextPage ? "Loading more…" : "Load more"}
            </button>
          </div>
        ) : null}
      </div>

      <SubmissionResponseDialog
        pageId={pageId}
        responseId={selectedId}
        readStatus={readStatus}
        readError={
          selectedMutationError?.action === "read"
            ? selectedMutationError.message
            : null
        }
        onRetryRead={retryFailedMutation}
        deletePending={
          deleteMutation.isPending && deleteMutation.variables === selectedId
        }
        deleteError={
          selectedMutationError?.action === "delete"
            ? selectedMutationError.message
            : null
        }
        onRetryDelete={retryFailedMutation}
        onDelete={deleteSelectedResponse}
        onClose={closeResponse}
      />
      <ConfirmationDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        title="Delete this response permanently?"
        description="This private response will be permanently removed. You cannot recover it after deleting."
        confirmLabel="Delete response"
        cancelLabel="Keep response"
        pendingLabel="Deleting..."
        pending={deleteMutation.isPending}
        error={
          mutationError?.action === "delete" &&
          mutationError.submissionId === deleteTargetId
            ? mutationError.message
            : null
        }
        onConfirm={() => {
          if (!deleteTargetId) return;
          setMutationError(null);
          deleteMutation.mutate(deleteTargetId);
        }}
      />
    </ResponseDashboardFrame>
  );
}
