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

function formatStatus(status: OwnerPageProjection["status"]): string {
  const labels: Record<OwnerPageProjection["status"], string> = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    UNPUBLISHED: "Unpublished",
    ARCHIVED: "Archived",
  };

  return labels[status];
}

function pluralize(
  value: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return value === 1 ? singular : plural;
}

function PersonIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function LockIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function AnalyticsPlaceholder({ label }: { label: string }): React.JSX.Element {
  return (
    <span className={styles.metricAvailability}>
      <span className={styles.metricAvailabilityMark} aria-hidden="true">
        —
      </span>
      {label}
    </span>
  );
}

export function EditorViewers({
  page,
  active,
  questionReadiness,
}: EditorViewersProps): React.JSX.Element {
  const submissionsQuery = useQuery({
    queryKey: pageKeys.submissions(page.id, "all"),
    queryFn: () => listSubmissions(page.id, { filter: "all", size: 20 }),
    enabled: active,
  });
  const responses = submissionsQuery.data?.items ?? [];
  const unreadCount = submissionsQuery.data?.unreadCount ?? 0;
  const inboxPath = `/dashboard/letters/${page.id}/responses`;
  const responseCount = responses.length;

  return (
    <section className={styles.panel} aria-labelledby="viewers-title">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Letter audience</p>
          <h2 id="viewers-title">Viewers &amp; responses</h2>
          <p className={styles.contextLine}>
            For <strong>{page.recipientLabel}</strong>
            <span aria-hidden="true"> · </span>
            {formatStatus(page.status)}
          </p>
          <p className={styles.headingDescription}>
            Keep an eye on private replies without exposing who is reading your
            letter. Visitors are always shown anonymously.
          </p>
        </div>
        <div className={styles.headingActions}>
          <span className={styles.statusBadge}>
            {formatStatus(page.status)}
          </span>
          <Link className={styles.primaryButton} href={inboxPath}>
            Open inbox
          </Link>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Viewer summary">
        <article className={styles.metricCard}>
          <div className={styles.metricLabelRow}>
            <span>Unique viewers</span>
            <span className={styles.metricGlyph} aria-hidden="true">
              <PersonIcon />
            </span>
          </div>
          <strong className={styles.metricValue} aria-label="Not tracked">
            —
          </strong>
          <p>Visit analytics are not connected to this letter yet.</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricLabelRow}>
            <span>Total visits</span>
            <span className={styles.metricGlyph} aria-hidden="true">
              <span className={styles.metricDash}>—</span>
            </span>
          </div>
          <strong className={styles.metricValue} aria-label="Not tracked">
            —
          </strong>
          <p>We only show activity that the private response inbox receives.</p>
        </article>

        <article className={styles.metricCard}>
          <div className={styles.metricLabelRow}>
            <span>Question responses</span>
            <span className={styles.metricGlyph} aria-hidden="true">
              <span className={styles.questionMark}>?</span>
            </span>
          </div>
          <strong className={styles.metricValue}>
            {submissionsQuery.isPending || submissionsQuery.isFetching
              ? "…"
              : submissionsQuery.isError
                ? "—"
                : responseCount}
          </strong>
          <p>
            {submissionsQuery.isError
              ? "Responses could not be loaded."
              : `${pluralize(responseCount, "response")} loaded · ${unreadCount} unread`}
          </p>
        </article>
      </section>

      <div className={styles.contentGrid}>
        <section
          className={styles.card}
          aria-labelledby="viewer-activity-title"
        >
          <header className={styles.cardHeader}>
            <div>
              <h3 id="viewer-activity-title">Viewer activity</h3>
              <p>Anonymous responses to your letter</p>
            </div>
            <span className={styles.sortLabel}>Most recent</span>
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
            <div className={styles.emptyState} aria-live="polite">
              <span className={styles.emptyIcon} aria-hidden="true">
                <PersonIcon />
              </span>
              <h4>No private activity yet</h4>
              <p>
                When a visitor answers a question or leaves a private message,
                their anonymous response will appear here.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.activityTable}>
                <caption className={styles.visuallyHidden}>
                  Anonymous viewer responses
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Anonymous viewer</th>
                    <th scope="col">Answers</th>
                    <th scope="col">Submitted</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response) => (
                    <tr key={response.id}>
                      <td data-label="Anonymous viewer">
                        <span className={styles.viewerCell}>
                          <span className={styles.avatar} aria-hidden="true">
                            <PersonIcon />
                          </span>
                          <span>Anonymous reader</span>
                        </span>
                      </td>
                      <td data-label="Answers">
                        {response.answerCount}{" "}
                        {pluralize(response.answerCount, "answer")}
                        {response.hasVisitorMessage ? (
                          <span className={styles.tableNote}> · message</span>
                        ) : null}
                      </td>
                      <td data-label="Submitted">
                        <time dateTime={response.submittedAt}>
                          {formatDate(response.submittedAt)}
                        </time>
                      </td>
                      <td data-label="State">
                        <span className={styles.stateLabel}>
                          <span
                            className={
                              response.readState === "UNREAD"
                                ? styles.unreadDot
                                : styles.readDot
                            }
                            aria-hidden="true"
                          />
                          {response.readState === "UNREAD" ? "Unread" : "Read"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {responses.length > 0 && !submissionsQuery.isError ? (
            <Link className={styles.cardLink} href={inboxPath}>
              View all responses <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </section>

        <section
          className={styles.card}
          aria-labelledby="question-responses-title"
        >
          <header className={styles.cardHeader}>
            <div>
              <h3 id="question-responses-title">Question responses</h3>
              <p>
                {questionReadiness.isLoading
                  ? "Checking your questions..."
                  : questionReadiness.isError
                    ? "Question details are unavailable."
                    : `${questionReadiness.questionCount} ${pluralize(questionReadiness.questionCount, "question")}`}
              </p>
            </div>
            <div className={styles.filterLinks} aria-label="Response filters">
              <Link className={styles.filterLinkActive} href={inboxPath}>
                All
              </Link>
              <Link
                className={styles.filterLink}
                href={`${inboxPath}?filter=unread`}
              >
                Unread <span>{unreadCount}</span>
              </Link>
            </div>
          </header>

          {responses.length === 0 ? (
            <div className={styles.responsesEmpty} aria-live="polite">
              <span className={styles.emptyIcon} aria-hidden="true">
                <span className={styles.questionMark}>?</span>
              </span>
              <h4>No question responses yet</h4>
              <p>
                Responses will stay private and anonymous. Open the inbox when
                someone writes back.
              </p>
            </div>
          ) : (
            <ul className={styles.responseList} aria-label="Question responses">
              {responses.slice(0, 4).map((response) => (
                <li key={response.id}>
                  <Link
                    className={styles.responseItem}
                    href={`${inboxPath}?selected=${response.id}`}
                  >
                    <span className={styles.avatar} aria-hidden="true">
                      <PersonIcon />
                    </span>
                    <span className={styles.responseItemCopy}>
                      <span className={styles.responseItemHeading}>
                        <strong>Anonymous reader</strong>
                        <time dateTime={response.submittedAt}>
                          {formatDate(response.submittedAt)}
                        </time>
                      </span>
                      <span>
                        {response.answerCount}{" "}
                        {pluralize(response.answerCount, "answer")}
                        {response.hasVisitorMessage ? " · private message" : ""}
                      </span>
                    </span>
                    <span className={styles.responseItemState}>
                      {response.readState === "UNREAD" ? "Unread" : "Read"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.privacyNote}>
            <span className={styles.lockIcon} aria-hidden="true">
              <LockIcon />
            </span>
            <span>All viewers and responses are anonymous.</span>
          </div>

          {responses.length > 0 ? (
            <Link className={styles.cardLink} href={inboxPath}>
              Open private inbox <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </section>
      </div>

      <div className={styles.analyticsNote}>
        <AnalyticsPlaceholder label="Visit analytics are not available yet" />
        <span>
          The editor shows private response activity today. Reader visits will
          appear here when analytics are added to the page.
        </span>
      </div>
    </section>
  );
}
