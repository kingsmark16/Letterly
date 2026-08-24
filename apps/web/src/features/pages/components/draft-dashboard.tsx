"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type {
  PageListResponse,
  PageSummary,
} from "@letterly/contracts/pages";
import { authClient } from "../../../lib/auth-client";
import {
  deletePage,
  listPages,
  type WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { DashboardHeader } from "./dashboard-header";
import styles from "./draft-dashboard.module.css";

const pageSize = 20;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function removePageFromCache(
  current: InfiniteData<PageListResponse, string | undefined> | undefined,
  pageId: string,
): InfiniteData<PageListResponse, string | undefined> | undefined {
  if (!current) {
    return current;
  }

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== pageId),
    })),
  };
}

export function DraftDashboard(): React.JSX.Element {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const creatorId = session.data?.user.id ?? null;
  const previousCreatorId = useRef<string | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<PageSummary | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const pagesQuery = useInfiniteQuery({
    queryKey: pageKeys.list(creatorId ?? "anonymous"),
    queryFn: ({ pageParam }) =>
      listPages({ cursor: pageParam, size: pageSize }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(creatorId),
  });

  const deleteMutation = useMutation<void, WebApiError, string>({
    mutationFn: deletePage,
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
    if (deleteTarget && deleteDialogRef.current) {
      deleteDialogRef.current.showModal();
    }
  }, [deleteTarget]);

  function closeDeleteDialog(): void {
    deleteDialogRef.current?.close();
    setDeleteTarget(null);
    setDeleteError(null);

    window.setTimeout(() => {
      deleteTriggerRef.current?.focus();
    }, 0);
  }

  function openDeleteDialog(
    target: PageSummary,
    trigger: HTMLButtonElement,
  ): void {
    deleteTriggerRef.current = trigger;
    setDeleteError(null);
    setDeleteTarget(target);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget || !creatorId) {
      return;
    }

    const target = deleteTarget;
    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(target.id);
      queryClient.setQueryData(
        pageKeys.list(creatorId),
        (
          current:
            InfiniteData<PageListResponse, string | undefined> | undefined,
        ) => removePageFromCache(current, target.id),
      );
      setStatusMessage(`${target.recipientLabel} was permanently deleted.`);
      closeDeleteDialog();
    } catch (caught: unknown) {
      const error = caught as WebApiError;

      if (error.code === "TIMEOUT") {
        const refreshed = await pagesQuery.refetch();
        const stillExists = refreshed.data?.pages.some((page) =>
          page.items.some((item) => item.id === target.id),
        );

        if (!stillExists) {
          setStatusMessage(`${target.recipientLabel} was permanently deleted.`);
          closeDeleteDialog();
          return;
        }
      }

      setDeleteError(error.message);
    }
  }

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

  return (
    <main className={styles.page}>
      <DashboardHeader />
      <div className={styles.shell}>
        <section className={styles.intro} aria-labelledby="dashboard-title">
          <div>
            <p className={styles.eyebrow}>Your private pages</p>
            <h1 id="dashboard-title">My letters</h1>
            <p>
              Keep writing in the quiet moments. Your letters stay private until
              you decide they are ready to share.
            </p>
          </div>
          <Link className={styles.primaryButton} href="/templates">
            Create a new letter
          </Link>
        </section>

        {statusMessage ? (
          <p className={styles.statusMessage} role="status" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}

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
            <h2>Your first letter is still waiting.</h2>
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
            aria-labelledby="draft-list-title"
          >
            <div className={styles.listHeading}>
              <div>
                <p className={styles.eyebrow}>Saved privately</p>
                <h2 id="draft-list-title">Continue where you left off</h2>
              </div>
              <span>
                {items.length} letter{items.length === 1 ? "" : "s"}
              </span>
            </div>

            <ul className={styles.draftList}>
              {items.map((item) => (
                <li className={styles.draftCard} key={item.id}>
                  <div className={styles.draftCopy}>
                    <p className={styles.draftType}>{item.template.name}</p>
                    <h3>{item.recipientLabel}</h3>
                    <dl className={styles.draftMeta}>
                      <div>
                        <dt>Status</dt>
                        <dd>{item.status}</dd>
                      </div>
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
                  <div className={styles.cardActions}>
                    <Link
                      className={styles.primaryButton}
                      href={`/dashboard/letters/${item.id}/edit`}
                    >
                      Open letter
                    </Link>
                    <button
                      className={styles.dangerButton}
                      type="button"
                      onClick={(event) =>
                        openDeleteDialog(item, event.currentTarget)
                      }
                    >
                      Delete permanently
                    </button>
                  </div>
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

      {deleteTarget ? (
        <dialog
          ref={deleteDialogRef}
          className={styles.deleteDialog}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          onCancel={(event) => {
            event.preventDefault();
            closeDeleteDialog();
          }}
        >
          <p className={styles.eyebrow}>Permanent deletion</p>
          <h2 id="delete-dialog-title">
            Delete “{deleteTarget.recipientLabel}”?
          </h2>
          <p id="delete-dialog-description">
            This permanently removes the letter and releases its page link. The
            action cannot be undone.
          </p>
          {deleteError ? (
            <p className={styles.dialogError} role="alert">
              {deleteError}
            </p>
          ) : null}
          <div className={styles.dialogActions}>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={closeDeleteDialog}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </button>
            <button
              className={styles.dangerButton}
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
              aria-busy={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
            </button>
          </div>
        </dialog>
      ) : null}
    </main>
  );
}
