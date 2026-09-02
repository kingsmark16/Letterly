"use client";

import type { OwnerPageProjection } from "@letterly/contracts/pages";
import styles from "./editor-overview.module.css";
import { QrSharingPanel } from "./qr-sharing-panel";

interface EditorOverviewProps {
  page: OwnerPageProjection;
  questionReadiness: QuestionReadiness;
}

export interface QuestionReadiness {
  questionCount: number;
  isLoading: boolean;
  isError: boolean;
  isUpdating: boolean;
  onRetry: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EditorOverview({
  page,
  questionReadiness,
}: EditorOverviewProps): React.JSX.Element {
  const responseStatus = getResponseStatus(page, questionReadiness);

  return (
    <section className={styles.panel} aria-labelledby="overview-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Letter overview</p>
          <h2 id="overview-title">A quiet view of your progress</h2>
          <p>
            Keep an eye on what is ready to share, then open the preview when
            you want to read the whole letter as a visitor will.
          </p>
        </div>
        <span className={styles.status}>{page.status}</span>
      </header>

      <section className={styles.stats} aria-label="Letter statistics">
        <div className={styles.statCard}>
          <span>Total views</span>
          <strong aria-label="View analytics unavailable">—</strong>
        </div>
        <div className={styles.statCard}>
          <span>Responses</span>
          <strong aria-label="Response analytics unavailable">—</strong>
        </div>
        <div className={styles.statCard}>
          <span>Unique views</span>
          <strong aria-label="Unique view analytics unavailable">—</strong>
        </div>
      </section>

      <section
        className={styles.infoSection}
        aria-labelledby="quick-info-title"
      >
        <h3 id="quick-info-title">Quick info</h3>
        <dl className={styles.infoList}>
          <div>
            <dt>Recipient</dt>
            <dd>{page.recipientLabel}</dd>
          </div>
          <div>
            <dt>Date created</dt>
            <dd>
              <time dateTime={page.createdAt}>
                {formatDate(page.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Last modified</dt>
            <dd>
              <time dateTime={page.updatedAt}>
                {formatDate(page.updatedAt)}
              </time>
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.infoSection} aria-labelledby="privacy-title">
        <h3 id="privacy-title">Status and privacy</h3>
        <div className={styles.privacyRow}>
          <p>
            <span className={styles.statusGlyph} aria-hidden="true">
              ●
            </span>
            Current status <strong>{page.status}</strong>
          </p>
          <p>
            <span className={styles.statusGlyph} aria-hidden="true">
              ●
            </span>
            Private responses <strong>{responseStatus.label}</strong>
          </p>
          {responseStatus.retry ? (
            <button type="button" onClick={questionReadiness.onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      </section>

      {page.canonicalUrl ? (
        <QrSharingPanel canonicalUrl={page.canonicalUrl} slug={page.slug} />
      ) : (
        <section
          className={styles.qrUnavailable}
          aria-labelledby="qr-link-title"
        >
          <p className={styles.eyebrow} id="qr-link-title">
            Share by QR
          </p>
          <p className={styles.feedback}>
            Publish this letter to generate a QR code for its public link.
          </p>
        </section>
      )}
    </section>
  );
}

function getResponseStatus(
  page: OwnerPageProjection,
  readiness: QuestionReadiness,
): { label: string; retry: boolean } {
  if (readiness.isLoading) return { label: "Loading...", retry: false };
  if (readiness.isError) return { label: "Unavailable", retry: true };
  if (page.status === "ARCHIVED") {
    return { label: "Unavailable while archived", retry: false };
  }
  if (readiness.isUpdating) return { label: "Updating...", retry: false };
  if (readiness.questionCount === 0) {
    return { label: "Add a question", retry: false };
  }
  return page.status === "PUBLISHED"
    ? { label: "Enabled automatically", retry: false }
    : { label: "Ready when published", retry: false };
}
