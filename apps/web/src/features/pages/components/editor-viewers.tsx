"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { listSubmissions, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import styles from "./editor-viewers.module.css";

interface EditorViewersProps {
  page: OwnerPageProjection;
  active: boolean;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EditorViewers({
  page,
  active,
}: EditorViewersProps): React.JSX.Element {
  const submissionsQuery = useQuery({
    queryKey: pageKeys.submissions(page.id, "all"),
    queryFn: () => listSubmissions(page.id, { filter: "all", size: 20 }),
    enabled: active,
  });
  const responses = submissionsQuery.data?.items ?? [];

  return (
    <section className={styles.panel} aria-labelledby="viewers-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Anonymous viewers</p>
          <h2 id="viewers-title">Responses from your readers</h2>
          <p>
            Visitors stay anonymous. Their private responses are visible only to
            you and remain separate from the public letter.
          </p>
        </div>
        <Link
          className={styles.primaryButton}
          href={`/dashboard/letters/${page.id}/responses`}
        >
          Open inbox
        </Link>
      </header>

      {submissionsQuery.isPending ? (
        <div className={styles.state} aria-busy="true">
          Loading viewer activity...
        </div>
      ) : submissionsQuery.isError ? (
        <div className={styles.state} role="alert">
          <strong>Viewer activity is unavailable.</strong>
          <p>{(submissionsQuery.error as WebApiError).message}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => void submissionsQuery.refetch()}
          >
            Try again
          </button>
        </div>
      ) : responses.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyMark} aria-hidden="true" />
          <h3>No responses yet</h3>
          <p>
            When someone answers a question or leaves a private message, their
            anonymous activity will appear here.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHeader} role="row">
            <span role="columnheader">Viewer</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Response</span>
            <span role="columnheader" className={styles.actionColumn}>
              Action
            </span>
          </div>
          <ul className={styles.rows} aria-label="Anonymous viewer responses">
            {responses.map((response) => (
              <li className={styles.row} key={response.id}>
                <div className={styles.viewerCell}>
                  <span className={styles.avatar} aria-hidden="true" />
                  <span>Anonymous reader</span>
                </div>
                <div className={styles.statusCell}>
                  <span
                    className={
                      response.readState === "UNREAD"
                        ? styles.unreadDot
                        : styles.readDot
                    }
                    aria-hidden="true"
                  />
                  <span>
                    {response.readState === "UNREAD"
                      ? "New response"
                      : "Read response"}
                  </span>
                  <time dateTime={response.submittedAt}>
                    {formatDate(response.submittedAt)}
                  </time>
                </div>
                <span className={styles.responseCell}>
                  {response.answerCount} answer
                  {response.answerCount === 1 ? "" : "s"}
                  {response.hasVisitorMessage ? " · private message" : ""}
                </span>
                <Link
                  className={styles.viewLink}
                  href={`/dashboard/letters/${page.id}/responses?selected=${response.id}`}
                >
                  View response
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
