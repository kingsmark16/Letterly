"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { listSubmissions, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import type { QuestionReadiness } from "./editor-overview";
import styles from "./editor-viewers.module.css";

interface EditorViewersProps {
  page: OwnerPageProjection;
  active: boolean;
  questionReadiness: QuestionReadiness;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function pluralize(
  value: number,
  singular: string,
  plural = singular + "s",
): string {
  return value === 1 ? singular : plural;
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
  const recentResponses = responses.slice(0, 5);
  const unreadCount = submissionsQuery.data?.unreadCount ?? 0;
  const inboxPath = "/dashboard/pages/" + page.id + "/responses";

  return (
    <section className={styles.panel} aria-labelledby="viewers-title">
      <header className={styles.heading}>
        <div>
          <h2 id="viewers-title">Hear back from your readers</h2>
          <p>
            Answers and messages appear here after someone replies. Only you can
            read them.
          </p>
        </div>
      </header>

      <section className={styles.recentSection} aria-labelledby="recent-title">
        <div className={styles.recentHeading}>
          <div className={styles.recentHeadingTitle}>
            <h3 id="recent-title">Recent replies</h3>
            {!submissionsQuery.isPending &&
            !submissionsQuery.isError &&
            unreadCount > 0 ? (
              <span className={styles.unreadCount} aria-live="polite">
                {unreadCount} unread{" "}
                {pluralize(unreadCount, "reply", "replies")}
              </span>
            ) : null}
          </div>
          {recentResponses.length > 0 && !submissionsQuery.isError ? (
            <Link className={styles.allLink} href={inboxPath}>
              See all replies <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>

        {submissionsQuery.isPending ? (
          <div className={styles.messageState} aria-busy="true">
            Loading replies...
          </div>
        ) : submissionsQuery.isError ? (
          <div className={styles.messageState} role="alert">
            <h4>Replies could not be loaded.</h4>
            <p>{(submissionsQuery.error as WebApiError).message}</p>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => void submissionsQuery.refetch()}
            >
              Try again
            </button>
          </div>
        ) : recentResponses.length === 0 ? (
          <div className={styles.messageState}>
            <h4>No replies yet</h4>
            <p>
              When a reader answers a question or leaves a message, the reply
              will appear here.
            </p>
          </div>
        ) : (
          <ul className={styles.responseList}>
            {recentResponses.map((response) => (
              <li key={response.id}>
                <Link
                  className={styles.responseLink}
                  href={inboxPath + "?selected=" + response.id}
                  aria-label={`Open ${response.readState === "UNREAD" ? "unread" : "read"} reply with ${response.answerCount} ${pluralize(response.answerCount, "answer")}${response.hasVisitorMessage ? " and a private message" : ""}, submitted ${formatDate(response.submittedAt)}`}
                >
                  <span
                    className={[
                      styles.responseMark,
                      response.readState === "UNREAD"
                        ? styles.responseMarkUnread
                        : "",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                  <span className={styles.responseCopy}>
                    <strong>Anonymous reply</strong>
                    <span>
                      {response.answerCount}{" "}
                      {pluralize(response.answerCount, "answer")}
                      {response.hasVisitorMessage ? " · private message" : ""}
                    </span>
                  </span>
                  <span className={styles.responseMeta}>
                    <time dateTime={response.submittedAt}>
                      {formatDate(response.submittedAt)}
                    </time>
                  </span>
                  <span className={styles.rowArrow} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
