"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { PageSummary } from "@letterly/contracts/pages";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { LoadingState } from "../../../components/loading-state";
import { listPages } from "../api/list-pages";
import {
  shouldRetryTransientApiRead,
  type WebApiError,
} from "../../../lib/api/errors";
import { pageKeys } from "../api/query-keys";
import { getPageSummaryTitle, PageSummaryCard } from "./page-summary-card";
import styles from "./page-workspace.module.css";

const pageSize = 20;
const statusFilters = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const;
type StatusFilter = (typeof statusFilters)[number];

const statusFilterLabels: Record<StatusFilter, string> = {
  ALL: "All",
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const pageStatusLabels: Record<PageSummary["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "always",
});

function formatRelativeDate(value: string, now: number): string {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "Unknown date";
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - timestamp) / 1_000));

  if (elapsedSeconds < 1) {
    return "just now";
  }

  if (elapsedSeconds < 60) {
    return relativeTimeFormatter.format(-elapsedSeconds, "second");
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  if (elapsedMinutes < 60) {
    return relativeTimeFormatter.format(-elapsedMinutes, "minute");
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return relativeTimeFormatter.format(-elapsedHours, "hour");
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 30) {
    return relativeTimeFormatter.format(-elapsedDays, "day");
  }

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) {
    return relativeTimeFormatter.format(-elapsedMonths, "month");
  }

  return relativeTimeFormatter.format(-Math.floor(elapsedMonths / 12), "year");
}

export function DraftDashboard({
  initialStatus = "ALL",
}: { initialStatus?: StatusFilter } = {}): React.JSX.Element {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const creatorId = session.data?.user.id ?? null;
  const previousCreatorId = useRef<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const pagesQuery = useInfiniteQuery({
    queryKey: [...pageKeys.list(creatorId ?? "anonymous"), statusFilter],
    queryFn: ({ pageParam, signal }) =>
      listPages(
        { cursor: pageParam, size: pageSize, status: statusFilter },
        { signal },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    retry: shouldRetryTransientApiRead,
    retryDelay: 250,
    enabled: Boolean(creatorId),
  });

  useEffect(() => {
    const previousId = previousCreatorId.current;

    if (previousId && previousId !== creatorId) {
      void queryClient.cancelQueries({ queryKey: pageKeys.list(previousId) });
      queryClient.removeQueries({ queryKey: pageKeys.list(previousId) });
    }

    previousCreatorId.current = creatorId;
  }, [creatorId, queryClient]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (session.isPending) {
    return (
      <LoadingState
        variant="page"
        id="dashboard-content"
        title="Opening your pages"
        description="Checking your session."
      />
    );
  }

  if (!session.data) {
    return (
      <main className={styles.page} id="dashboard-content">
        <div className={styles.statePanel}>
          <p className={styles.eyebrow}>Your private pages</p>
          <h1>Sign in to see your pages.</h1>
          <p>Your pages are visible only to the creator who made them.</p>
          <Link className={styles.primaryButton} href="/sign-in">
            Continue to sign in
          </Link>
        </div>
      </main>
    );
  }

  const items = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const selectedFilterLabel = statusFilterLabels[statusFilter].toLowerCase();

  return (
    <main className={styles.page} id="dashboard-content">
      <div className={styles.shell}>
        <section
          className={styles.hero}
          aria-labelledby="private-letters-title"
        >
          <p className={styles.heroContext}>Your Page</p>
          <h1 className="sr-only" id="private-letters-title">
            Your pages
          </h1>
          <p className={styles.heroDescription}>
            Pick up an unfinished letter, revisit one you’ve shared, or find a
            page you saved for later.
          </p>
        </section>

        <section
          className={styles.pageSection}
          aria-labelledby="private-letters-title"
        >
          <div
            className={styles.filterBar}
            role="group"
            aria-label="Filter pages by status"
          >
            <div className={styles.filterList}>
              {statusFilters.map((filter) => (
                <button
                  className={
                    filter === statusFilter
                      ? `${styles.filterButton} ${styles.filterButtonActive}`
                      : styles.filterButton
                  }
                  key={filter}
                  type="button"
                  aria-pressed={filter === statusFilter}
                  onClick={() => setStatusFilter(filter)}
                >
                  {statusFilterLabels[filter]}
                </button>
              ))}
            </div>
            <Link className={styles.primaryButton} href="/templates">
              Create a page
            </Link>
          </div>

          {pagesQuery.isPending ? (
            <LoadingState
              variant="section"
              hideFooter
              title="Loading your pages"
              description="Finding your drafts and shared letters."
            />
          ) : pagesQuery.isError ? (
            <section className={styles.statePanel} role="alert">
              <p className={styles.eyebrow}>Your pages are unavailable</p>
              <h2>We could not load your pages.</h2>
              <p>{(pagesQuery.error as WebApiError).message}</p>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={() => void pagesQuery.refetch()}
              >
                Try again
              </button>
            </section>
          ) : items.length === 0 ? (
            <section className={styles.statePanel}>
              <p className={styles.eyebrow}>A blank beginning</p>
              <h2>
                {statusFilter === "ALL"
                  ? "Your first page is still waiting."
                  : `No ${selectedFilterLabel.toLowerCase()} pages yet.`}
              </h2>
              <p>
                Start with a feeling, a memory, or the words you have been
                carrying around.
              </p>
              <Link className={styles.primaryButton} href="/templates">
                Choose a category
              </Link>
            </section>
          ) : (
            <>
              <ul className={styles.pageGrid}>
                {items.map((item) => {
                  const pageTitle = getPageSummaryTitle(item);
                  const initialSection =
                    item.status === "PUBLISHED" ? "analytics" : "content";

                  return (
                    <PageSummaryCard
                      key={item.id}
                      page={item}
                      href={`/dashboard/pages/${item.id}/edit?section=${initialSection}`}
                      ariaLabel={`Open ${pageStatusLabels[item.status].toLowerCase()} page "${pageTitle}" for ${item.recipientLabel}, last edited ${formatRelativeDate(item.updatedAt, currentTime)}`}
                      signature={
                        <>
                          with love <span>♡</span>
                        </>
                      }
                      metadataLabel="Last edited"
                      metadataValue={
                        <time dateTime={item.updatedAt}>
                          {formatRelativeDate(item.updatedAt, currentTime)}
                        </time>
                      }
                    />
                  );
                })}
              </ul>

              {pagesQuery.hasNextPage ? (
                <div className={styles.loadMoreArea}>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    disabled={pagesQuery.isFetchingNextPage}
                    onClick={() => void pagesQuery.fetchNextPage()}
                  >
                    {pagesQuery.isFetchingNextPage
                      ? "Loading more…"
                      : "Load more pages"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
