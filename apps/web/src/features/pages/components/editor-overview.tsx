"use client";

import type { OwnerPageProjection } from "@letterly/contracts/pages";
import styles from "./editor-overview.module.css";
import { QrSharingPanel } from "./qr-sharing-panel";

interface EditorOverviewProps {
  page: OwnerPageProjection;
  imageCount: number;
  questionCount: number;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EditorOverview({
  page,
  imageCount,
  questionCount,
}: EditorOverviewProps): React.JSX.Element {
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
          <span>Content version</span>
          <strong>{page.contentVersion}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Memories</span>
          <strong>{imageCount}</strong>
        </div>
        <div className={styles.statCard}>
          <span>Questions</span>
          <strong>{questionCount}</strong>
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
            Private responses{" "}
            <strong>
              {page.settings.responsesEnabled ? "Enabled" : "Add a question"}
            </strong>
          </p>
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
