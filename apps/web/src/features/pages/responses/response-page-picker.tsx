"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { PageSummary } from "@letterly/contracts/pages";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { LoadingState } from "../../../components/loading-state";
import { authClient } from "../../../lib/auth-client";
import { WebApiError } from "../../../lib/api/errors";
import { listPages } from "../api/list-pages";
import { pageKeys } from "../api/query-keys";
import styles from "./response-page-picker.module.css";

const pageSize = 20;

const pageStatusLabels: Record<PageSummary["status"], string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
};

function getPageTitle(page: PageSummary): string {
  return (
    page.preview?.title?.trim() ||
    (page.template.key === "choose-your-heart"
      ? page.template.name
      : "Untitled page")
  );
}

export function ResponsePagePicker(): React.JSX.Element {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const creatorId = session.data?.user.id ?? null;
  const previousCreatorId = useRef<string | null>(null);

  const pagesQuery = useInfiniteQuery({
    queryKey: [...pageKeys.list(creatorId ?? "anonymous"), "ALL"],
    queryFn: ({ pageParam, signal }) =>
      listPages(
        { cursor: pageParam, size: pageSize, status: "ALL" },
        { signal },
      ),
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
      <LoadingState
        variant="page"
        id="dashboard-content"
        title="Opening your responses"
        description="Checking your session."
      />
    );
  }

  if (!session.data) {
    return (
      <main className={styles.page} id="dashboard-content">
        <section
          className={styles.statePanel}
          aria-labelledby="responses-title"
        >
          <p className={styles.eyebrow}>Your private inboxes</p>
          <h1 id="responses-title">Sign in to see your responses.</h1>
          <p>Only page creators can read private replies.</p>
          <Link className={styles.primaryLink} href="/sign-in">
            Continue to sign in
          </Link>
        </section>
      </main>
    );
  }

  const pages = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className={styles.page} id="dashboard-content">
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Your private inboxes</p>
          <h1>Responses</h1>
          <p className={styles.description}>
            Choose a page to open its inbox. Only you can read the replies
            visitors leave there.
          </p>
        </header>

        <section className={styles.pageSection} aria-labelledby="pages-title">
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="pages-title">Choose a page</h2>
              <p>Each page has its own private response inbox.</p>
            </div>
            <Link className={styles.secondaryLink} href="/dashboard/pages">
              View all pages
            </Link>
          </div>

          {pagesQuery.isPending ? (
            <LoadingState
              variant="section"
              hideFooter
              title="Loading your pages"
              description="Finding the pages connected to your inboxes."
            />
          ) : pagesQuery.isError ? (
            <section className={styles.statePanel} role="alert">
              <p className={styles.eyebrow}>Your pages are unavailable</p>
              <h2>We could not load your pages.</h2>
              <p>
                {pagesQuery.error instanceof WebApiError
                  ? pagesQuery.error.message
                  : "Please try again."}
              </p>
              <button
                className={styles.primaryLink}
                type="button"
                onClick={() => void pagesQuery.refetch()}
              >
                Try again
              </button>
            </section>
          ) : pages.length === 0 ? (
            <section className={styles.statePanel}>
              <p className={styles.eyebrow}>A place for your replies</p>
              <h2>You do not have any pages yet.</h2>
              <p>
                Create a page first. Its private inbox will be ready here when
                visitors send replies.
              </p>
              <Link className={styles.primaryLink} href="/templates">
                Create a page
              </Link>
            </section>
          ) : (
            <>
              <ul className={styles.pageList}>
                {pages.map((page) => {
                  const title = getPageTitle(page);

                  return (
                    <li key={page.id}>
                      <Link
                        className={styles.pageLink}
                        href={`/dashboard/pages/${page.id}/responses`}
                        aria-label={`Open responses for ${title}, addressed to ${page.recipientLabel}`}
                      >
                        <span className={styles.pageDetails}>
                          <span
                            className={styles.status}
                            data-status={page.status}
                          >
                            <span aria-hidden="true" />
                            {pageStatusLabels[page.status]}
                          </span>
                          <span className={styles.title}>{title}</span>
                          <span className={styles.recipient}>
                            {page.template.name} · To {page.recipientLabel}
                          </span>
                        </span>
                        <span className={styles.openAction}>
                          Open private inbox
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            focusable="false"
                          >
                            <path d="M5 12h14m-6-6 6 6-6 6" />
                          </svg>
                        </span>
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
                      ? "Loading more pages…"
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
