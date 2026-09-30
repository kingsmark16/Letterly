"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { PageSummary } from "@letterly/contracts/pages";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { listPages, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { TemplateFirstSectionThumbnail } from "../../../components/template-first-section-thumbnail";
import { DashboardIcon } from "./dashboard-icons";
import styles from "./draft-dashboard.module.css";

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
    queryFn: ({ pageParam }) =>
      listPages({
        cursor: pageParam,
        size: pageSize,
        status: statusFilter,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
      <main className={styles.page} aria-busy="true" id="dashboard-content">
        <div className={styles.statePanel}>
          <p className={styles.eyebrow}>Your private pages</p>
          <h1>Opening your pages…</h1>
          <p>Checking your secure session.</p>
        </div>
      </main>
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
            <section className={styles.statePanel} aria-busy="true">
              <p className={styles.eyebrow}>Loading your pages</p>
              <div className={styles.skeletonList} aria-hidden="true">
                <div />
                <div />
                <div />
              </div>
            </section>
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
                  const pageTitle =
                    item.preview?.title?.trim() ||
                    (item.template.key === "choose-your-heart"
                      ? item.template.name
                      : "Untitled page");
                  const initialSection =
                    item.status === "PUBLISHED" ? "analytics" : "content";

                  return (
                    <li key={item.id}>
                      <Link
                        className={styles.pageCard}
                        href={`/dashboard/pages/${item.id}/edit?section=${initialSection}`}
                        aria-label={`Open ${pageStatusLabels[item.status].toLowerCase()} page "${pageTitle}" for ${item.recipientLabel}, last edited ${formatRelativeDate(item.updatedAt, currentTime)}`}
                      >
                        <div className={styles.pageCardArtwork}>
                          <TemplateFirstSectionThumbnail
                            context="page"
                            instanceId={`page-${item.id}`}
                            journeyQuestion={
                              item.template.key === "choose-your-heart"
                                ? (item.preview?.firstQuestion ?? null)
                                : undefined
                            }
                            letterTitle={item.preview?.title}
                            templateKey={item.template.key}
                          />
                        </div>
                        <div className={styles.pageCardBody}>
                          <div className={styles.pageCardHeader}>
                            <span className={styles.pageTemplate}>
                              <span className={styles.templateIcon}>
                                <DashboardIcon
                                  name={
                                    item.template.key === "choose-your-heart"
                                      ? "heart"
                                      : "envelope"
                                  }
                                />
                              </span>
                              <span>{item.template.name}</span>
                            </span>
                            <span
                              className={styles.statusBadge}
                              data-status={item.status}
                            >
                              <span
                                className={styles.statusDot}
                                aria-hidden="true"
                              />
                              {pageStatusLabels[item.status]}
                            </span>
                          </div>
                          <div className={styles.pageCardContent}>
                            <h3>{pageTitle}</h3>
                            <div className={styles.pageCardSubline}>
                              <p className={styles.pageRecipient}>
                                To {item.recipientLabel}
                              </p>
                              <span className={styles.cardSignature}>
                                with love <span>♡</span>
                              </span>
                            </div>
                            <div
                              className={styles.cardDivider}
                              aria-hidden="true"
                            >
                              <span className={styles.cardDividerLine} />
                              <DashboardIcon
                                className={styles.cardDividerIcon}
                                name="heart"
                              />
                              <span className={styles.cardDividerLine} />
                            </div>
                            <dl className={styles.pageMeta}>
                              <div>
                                <dt>Last edited</dt>
                                <dd>
                                  <time dateTime={item.updatedAt}>
                                    {formatRelativeDate(
                                      item.updatedAt,
                                      currentTime,
                                    )}
                                  </time>
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </Link>
                    </li>
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
