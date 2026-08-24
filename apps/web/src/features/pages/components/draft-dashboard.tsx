"use client";

import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../../lib/auth-client";
import { listPages, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { DashboardHeader } from "./dashboard-header";
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function DraftDashboard(): React.JSX.Element {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const creatorId = session.data?.user.id ?? null;
  const previousCreatorId = useRef<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

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

  if (session.isPending) {
    return (
      <main className={styles.page} aria-busy="true">
        <div className={styles.statePanel}>
          <p className={styles.eyebrow}>Your private pages</p>
          <h1>Opening your letters...</h1>
          <p>Checking your secure session.</p>
        </div>
      </main>
    );
  }

  if (!session.data) {
    return (
      <main className={styles.page}>
        <div className={styles.statePanel}>
          <p className={styles.eyebrow}>Your private pages</p>
          <h1>Sign in to see your letters.</h1>
          <p>Your letters are visible only to the creator who made them.</p>
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
    <main className={styles.page}>
      <DashboardHeader />
      <div className={styles.shell}>
        <section className={styles.intro} aria-labelledby="private-letters-title">
          <div>
            <p className={styles.eyebrow}>Your private pages</p>
            <h1 id="private-letters-title">Private Letters</h1>
          </div>
          <Link className={styles.primaryButton} href="/templates">
            Create a new letter
          </Link>
        </section>

        <div
          className={styles.filterBar}
          role="group"
          aria-label="Filter letters by status"
        >
          <span className={styles.filterLabel}>Show</span>
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
        </div>

        {pagesQuery.isPending ? (
          <section className={styles.listPanel} aria-busy="true">
            <p className={styles.eyebrow}>Loading your letters</p>
            <div className={styles.skeletonList} aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
          </section>
        ) : pagesQuery.isError ? (
          <section className={styles.statePanel} role="alert">
            <p className={styles.eyebrow}>Your letters are unavailable</p>
            <h2>We could not load your letters.</h2>
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
                ? "Your first letter is still waiting."
                : `No ${selectedFilterLabel.toLowerCase()} letters yet.`}
            </h2>
            <p>
              Start with a feeling, a memory, or the words you have been
              carrying around.
            </p>
            <Link className={styles.primaryButton} href="/templates">
              Choose a template
            </Link>
          </section>
        ) : (
          <section
            className={styles.listPanel}
            aria-labelledby="letter-list-title"
          >
            <div className={styles.listHeading}>
              <div>
                <p className={styles.eyebrow}>Saved privately</p>
                <h2 id="letter-list-title">Your letters</h2>
              </div>
              <span>
                {items.length} letter{items.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className={styles.letterList}>
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    className={styles.letterCard}
                    href={`/dashboard/letters/${item.id}/edit`}
                    aria-label={`Open letter to ${item.recipientLabel}`}
                  >
                    <div className={styles.letterCardHeader}>
                      <p className={styles.letterType}>{item.template.name}</p>
                      <span
                        className={styles.statusBadge}
                        data-status={item.status}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className={styles.letterCopy}>
                      <h3>{item.recipientLabel}</h3>
                      <dl className={styles.letterMeta}>
                        <div>
                          <dt>Version</dt>
                          <dd>{item.contentVersion}</dd>
                        </div>
                        <div>
                          <dt>Updated</dt>
                          <dd>
                            <time dateTime={item.updatedAt}>
                              {formatDate(item.updatedAt)} UTC
                            </time>
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </Link>
                </li>
              ))}
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
                    ? "Loading more..."
                    : "Load more letters"}
                </button>
              </div>
            ) : null}
          </section>
        )}

        <footer className={styles.footer}>
          <span>Private by default.</span>
          <span>Unpublished letters never appear in public pages.</span>
        </footer>
      </div>

    </main>
  );
}
