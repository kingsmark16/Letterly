"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { LoadingState } from "../../../components/loading-state";
import { authClient } from "../../../lib/auth-client";
import {
  shouldRetryTransientApiRead,
  WebApiError,
} from "../../../lib/api/errors";
import { listPages } from "../api/list-pages";
import { pageKeys } from "../api/query-keys";
import {
  getPageSummaryTitle,
  PageSummaryCard,
} from "../dashboard/page-summary-card";
import workspaceStyles from "../dashboard/page-workspace.module.css";

const pageSize = 20;

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
      <main className={workspaceStyles.page} id="dashboard-content">
        <div className={workspaceStyles.shell}>
          <section className={workspaceStyles.pageSection}>
            <div className={workspaceStyles.statePanel}>
              <p className={workspaceStyles.eyebrow}>Private responses</p>
              <h1>Sign in to see your responses.</h1>
              <p>Only page creators can read private replies.</p>
              <Link className={workspaceStyles.primaryButton} href="/sign-in">
                Continue to sign in
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const pages = pagesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className={workspaceStyles.page} id="dashboard-content">
      <div className={workspaceStyles.shell}>
        <section
          className={workspaceStyles.hero}
          aria-labelledby="responses-title"
        >
          <p className={workspaceStyles.heroContext}>Your Responses</p>
          <h1 className="sr-only" id="responses-title">
            Responses
          </h1>
          <p className={workspaceStyles.heroDescription}>
            Open a private inbox to read replies visitors sent to your pages.
            Only you can see them.
          </p>
        </section>

        <section
          className={workspaceStyles.pageSection}
          aria-label="Pages with private response inboxes"
        >
          {pagesQuery.isPending ? (
            <LoadingState
              variant="section"
              hideFooter
              title="Loading your pages"
              description="Finding the pages connected to your inboxes."
            />
          ) : pagesQuery.isError ? (
            <section className={workspaceStyles.statePanel} role="alert">
              <p className={workspaceStyles.eyebrow}>
                Your pages are unavailable
              </p>
              <h2>We could not load your pages.</h2>
              <p>
                {pagesQuery.error instanceof WebApiError
                  ? pagesQuery.error.message
                  : "Please try again."}
              </p>
              <button
                className={workspaceStyles.primaryButton}
                type="button"
                onClick={() => void pagesQuery.refetch()}
              >
                Try again
              </button>
            </section>
          ) : pages.length === 0 ? (
            <section className={workspaceStyles.statePanel}>
              <p className={workspaceStyles.eyebrow}>
                A place for your replies
              </p>
              <h2>You do not have any pages yet.</h2>
              <p>
                Create a page first. Its private inbox will be ready here when
                visitors send replies.
              </p>
              <Link className={workspaceStyles.primaryButton} href="/templates">
                Create a page
              </Link>
            </section>
          ) : (
            <>
              <ul className={workspaceStyles.pageGrid}>
                {pages.map((page) => {
                  const title = getPageSummaryTitle(page);

                  return (
                    <PageSummaryCard
                      key={page.id}
                      page={page}
                      href={`/dashboard/pages/${page.id}/responses`}
                      ariaLabel={`Open responses for ${title}, addressed to ${page.recipientLabel}`}
                      signature={
                        <>
                          Private replies <span>♡</span>
                        </>
                      }
                      metadataLabel="Responses"
                      metadataValue="Open private inbox"
                      thumbnailInstanceId={`response-page-${page.id}`}
                    />
                  );
                })}
              </ul>

              {pagesQuery.hasNextPage ? (
                <div className={workspaceStyles.loadMoreArea}>
                  <button
                    className={workspaceStyles.secondaryButton}
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
