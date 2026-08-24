"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import {
  deleteSubmission,
  getOwnerPage,
  getSubmission,
  listSubmissions,
  markSubmissionRead,
  WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import type { OwnerSubmissionSummary } from "@letterly/contracts/submissions";

interface ResponseDashboardProps {
  pageId: string;
}

type MutationErrorState = {
  action: "read" | "delete";
  submissionId: string;
  message: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

export function ResponseDashboard({
  pageId,
}: ResponseDashboardProps): React.JSX.Element {
  const session = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] =
    useState<MutationErrorState | null>(null);
  const filter = searchParams.get("filter") === "unread" ? "unread" : "all";
  const selectedId = searchParams.get("selected");

  const pageQuery = useQuery({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getOwnerPage(pageId),
    enabled: Boolean(session.data),
  });
  const listQuery = useInfiniteQuery({
    queryKey: pageKeys.submissions(pageId, filter),
    queryFn: ({ pageParam }) =>
      listSubmissions(pageId, { filter, cursor: pageParam, size: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(session.data),
  });
  const detailQuery = useQuery({
    queryKey: ["submission", pageId, selectedId],
    queryFn: () => getSubmission(pageId, selectedId ?? ""),
    enabled: Boolean(session.data && selectedId),
  });
  const summaries = useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [listQuery.data],
  );
  const unreadCount = listQuery.data?.pages[0]?.unreadCount ?? 0;

  const readMutation = useMutation({
    mutationFn: (submissionId: string) =>
      markSubmissionRead(pageId, submissionId),
    onSuccess: () => {
      setMutationError(null);
      setStatusMessage("Response marked as read.");
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "unread"),
      });
      void queryClient.invalidateQueries({
        queryKey: ["submission", pageId, selectedId],
      });
    },
    onError: (error, submissionId) => {
      setStatusMessage(null);
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
  const deleteMutation = useMutation({
    mutationFn: (submissionId: string) =>
      deleteSubmission(pageId, submissionId, { confirm: true }),
    onSuccess: () => {
      setMutationError(null);
      router.replace(updateSearch(pathname, filter, null));
      setStatusMessage("Response deleted.");
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(pageId, "unread"),
      });
      window.setTimeout(() => headingRef.current?.focus(), 0);
    },
    onError: (error, submissionId) => {
      setStatusMessage(null);
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

  function selectResponse(item: OwnerSubmissionSummary): void {
    setMutationError(null);
    router.push(updateSearch(pathname, filter, item.id));
  }

  function retryFailedMutation(): void {
    if (!mutationError) {
      return;
    }

    const failedMutation = mutationError;
    setMutationError(null);

    if (failedMutation.action === "read") {
      readMutation.mutate(failedMutation.submissionId);
      return;
    }

    deleteMutation.mutate(failedMutation.submissionId);
  }

  if (session.isPending || pageQuery.isPending || listQuery.isPending) {
    return (
      <main className="min-h-screen bg-canvas px-5 py-10 text-ink">
        <div
          className="mx-auto max-w-6xl rounded-large border border-border bg-surface p-8 shadow-low"
          aria-busy="true"
        >
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Private responses
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            Opening your responses...
          </h1>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10 text-ink">
        <section className="w-full max-w-xl rounded-large border border-border bg-surface p-8 text-center shadow-low">
          <h1 className="font-display text-4xl font-semibold">
            Sign in to read responses.
          </h1>
          <p className="mt-4 text-body-large text-ink-muted">
            Only the page creator can open private responses.
          </p>
          <Link
            className="mt-7 inline-flex min-h-11 items-center rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface"
            href="/sign-in"
          >
            Continue to sign in
          </Link>
        </section>
      </main>
    );
  }

  if (pageQuery.isError || listQuery.isError) {
    const error = (pageQuery.error ?? listQuery.error) as WebApiError;
    return (
      <main className="min-h-screen bg-canvas px-5 py-10 text-ink">
        <section
          className="mx-auto max-w-2xl rounded-large border border-border bg-surface p-8 shadow-low"
          role="alert"
        >
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Responses unavailable
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold">
            We could not load this page.
          </h1>
          <p className="mt-4 text-body-large text-ink-muted">{error.message}</p>
          <button
            className="mt-7 min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface"
            type="button"
            onClick={() => {
              void pageQuery.refetch();
              void listQuery.refetch();
            }}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  const selectedDetail = detailQuery.data;
  const hasResponses = summaries.length > 0 || unreadCount > 0;

  return (
    <main className="min-h-screen bg-canvas px-5 py-8 text-ink sm:px-7 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-5 border-b border-border pb-7">
          <div>
            <Link
              className="font-display text-3xl font-semibold tracking-tight"
              href="/dashboard"
            >
              letterly
            </Link>
            <p className="mt-5 text-label font-bold uppercase tracking-[0.14em] text-wine">
              Private responses
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="mt-2 font-display text-4xl font-semibold tracking-tight"
            >
              {pageQuery.data?.recipientLabel ?? "Your letter"}
            </h1>
            <p className="mt-2 text-body text-ink-muted">
              {unreadCount} unread response{unreadCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold hover:border-wine hover:text-wine"
              href={`/dashboard/letters/${pageId}/edit`}
            >
              Back to editor
            </Link>
            <Link
              className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold hover:border-wine hover:text-wine"
              href="/dashboard"
            >
              My letters
            </Link>
          </div>
        </header>

        {statusMessage ? (
          <p
            className="mt-5 text-small text-olive"
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </p>
        ) : null}
        {mutationError ? (
          <div
            className="mt-5 flex flex-wrap items-center gap-3 text-small text-error"
            role="alert"
          >
            <p>{mutationError.message}</p>
            <button
              className="min-h-10 rounded-medium border border-error px-3 py-2 font-bold text-error hover:bg-surface-muted"
              type="button"
              onClick={retryFailedMutation}
              disabled={readMutation.isPending || deleteMutation.isPending}
            >
              {mutationError.action === "read"
                ? "Try marking as read again"
                : "Try deleting again"}
            </button>
          </div>
        ) : null}
        <div
          className="mt-7 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Response filter"
        >
          {(["all", "unread"] as const).map((value) => (
            <Link
              key={value}
              role="tab"
              aria-selected={filter === value}
              className={`min-h-11 rounded-round border px-4 py-2 text-small font-bold ${filter === value ? "border-wine bg-wine text-surface" : "border-border bg-surface hover:border-wine hover:text-wine"}`}
              href={updateSearch(pathname, value, selectedId)}
            >
              {value === "all" ? "All responses" : `Unread (${unreadCount})`}
            </Link>
          ))}
        </div>

        {!hasResponses ? (
          <section
            className="mt-7 rounded-large border border-border bg-surface p-9 shadow-low"
            aria-live="polite"
          >
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Nothing here yet
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">
              {filter === "unread"
                ? "No unread responses."
                : "Your first response will appear here."}
            </h2>
            <p className="mt-3 max-w-2xl text-body-large leading-relaxed text-ink-muted">
              Responses are private to this page and never shown publicly.
            </p>
          </section>
        ) : (
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(17rem,0.72fr)_minmax(0,1.28fr)]">
            <section
              className={`${selectedId ? "hidden lg:block" : "block"} rounded-large border border-border bg-surface p-4 shadow-low`}
              aria-labelledby="response-list-title"
            >
              <div className="flex items-center justify-between gap-3 px-3 pb-3">
                <h2
                  id="response-list-title"
                  className="font-display text-2xl font-semibold"
                >
                  Responses
                </h2>
                <span className="text-small text-ink-muted">
                  {summaries.length}
                </span>
              </div>
              <ul className="divide-y divide-border">
                {summaries.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`w-full rounded-medium px-3 py-4 text-left hover:bg-surface-muted ${item.id === selectedId ? "bg-surface-muted" : ""}`}
                      onClick={() => selectResponse(item)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-small font-bold text-ink">
                          {item.readState === "UNREAD"
                            ? "Unread response"
                            : "Read response"}
                        </span>
                        <time
                          className="text-label text-ink-muted"
                          dateTime={item.submittedAt}
                        >
                          {formatDate(item.submittedAt)}
                        </time>
                      </span>
                      <span className="mt-2 block text-small text-ink-muted">
                        {item.answerCount} answer
                        {item.answerCount === 1 ? "" : "s"}
                        {item.hasVisitorMessage ? " · private message" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {listQuery.hasNextPage ? (
                <button
                  className="mt-4 min-h-11 w-full rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold hover:border-wine hover:text-wine"
                  type="button"
                  disabled={listQuery.isFetchingNextPage}
                  onClick={() => void listQuery.fetchNextPage()}
                >
                  {listQuery.isFetchingNextPage
                    ? "Loading more..."
                    : "Load more"}
                </button>
              ) : null}
            </section>

            <section
              className={`${selectedId ? "block" : "hidden lg:block"} rounded-large border border-border bg-surface p-6 shadow-low sm:p-8`}
              aria-live="polite"
            >
              {!selectedId ? (
                <div className="grid min-h-64 place-items-center text-center">
                  <div>
                    <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                      Choose a response
                    </p>
                    <h2 className="mt-2 font-display text-3xl font-semibold">
                      Your private inbox
                    </h2>
                    <p className="mt-3 text-body text-ink-muted">
                      Select a response to read it here.
                    </p>
                  </div>
                </div>
              ) : detailQuery.isPending ? (
                <p aria-busy="true" className="text-body-large text-ink-muted">
                  Opening this response...
                </p>
              ) : detailQuery.isError ? (
                <div role="alert">
                  <h2 className="font-display text-3xl font-semibold">
                    We could not open this response.
                  </h2>
                  <p className="mt-3 text-body text-ink-muted">
                    {(detailQuery.error as WebApiError).message}
                  </p>
                  <button
                    className="mt-5 min-h-11 rounded-medium bg-wine px-4 py-3 text-small font-bold text-surface"
                    type="button"
                    onClick={() => void detailQuery.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : !selectedDetail ? (
                <div role="alert">
                  <h2 className="font-display text-3xl font-semibold">
                    This response is unavailable.
                  </h2>
                  <p className="mt-3 text-body text-ink-muted">
                    It may have been deleted or is no longer part of this
                    page.
                  </p>
                </div>
              ) : (
                <article>
                  <button
                    className="mb-6 min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold lg:hidden"
                    type="button"
                    onClick={() =>
                      router.replace(updateSearch(pathname, filter, null))
                    }
                  >
                    Back to responses
                  </button>
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
                    <div>
                      <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                        Private response
                      </p>
                      <time
                        className="mt-2 block text-small text-ink-muted"
                        dateTime={selectedDetail.submittedAt}
                      >
                        {formatDate(selectedDetail.submittedAt)}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedDetail.readState === "UNREAD" ? (
                        <button
                          className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold hover:border-wine hover:text-wine"
                          type="button"
                          disabled={readMutation.isPending}
                          onClick={() => readMutation.mutate(selectedDetail.id)}
                        >
                          {readMutation.isPending
                            ? "Marking..."
                            : "Mark as read"}
                        </button>
                      ) : (
                        <span className="rounded-round bg-surface-muted px-3 py-2 text-small font-bold text-olive">
                          Read
                        </span>
                      )}
                      <button
                        className="min-h-11 rounded-medium border border-error px-4 py-3 text-small font-bold text-error hover:bg-surface-muted"
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (
                            window.confirm("Delete this response permanently?")
                          )
                            deleteMutation.mutate(selectedDetail.id);
                        }}
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-7 space-y-7">
                    {selectedDetail.journeySnapshot ? (
                      <>
                        {selectedDetail.journeySnapshot.answers.map((answer) => (
                          <div key={`${answer.questionKey}-${answer.choiceKey}`}>
                            <p className="text-small font-bold uppercase tracking-[0.1em] text-ink-muted">
                              {answer.prompt}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-body-large leading-relaxed text-ink">
                              {answer.choiceLabel}
                            </p>
                          </div>
                        ))}
                        <div className="rounded-medium border border-border bg-surface-muted p-5">
                          <p className="text-small font-bold uppercase tracking-[0.1em] text-ink-muted">
                            Journey result
                          </p>
                          <p className="mt-2 font-display text-2xl font-semibold text-ink">
                            {selectedDetail.journeySnapshot.outcomeTitle}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-body leading-relaxed text-ink">
                            {selectedDetail.journeySnapshot.outcomeMessage}
                          </p>
                        </div>
                      </>
                    ) : (
                      selectedDetail.answers.map((answer) => (
                        <div key={answer.questionId}>
                          <p className="text-small font-bold uppercase tracking-[0.1em] text-ink-muted">
                            {answer.promptSnapshot}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-body-large leading-relaxed text-ink">
                            {answer.choiceLabelSnapshot ?? answer.textAnswer}
                          </p>
                        </div>
                      ))
                    )}
                    {selectedDetail.visitorMessage ? (
                      <div className="rounded-medium border border-border bg-surface-muted p-5">
                        <p className="text-small font-bold uppercase tracking-[0.1em] text-ink-muted">
                          {selectedDetail.visitorMessage.promptSnapshot}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-body-large leading-relaxed text-ink">
                          {selectedDetail.visitorMessage.message}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </article>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
