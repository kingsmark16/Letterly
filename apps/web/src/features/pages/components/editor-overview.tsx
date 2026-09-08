"use client";

import type {
  OwnerPageProjection,
  PageLifecycleResponse,
} from "@letterly/contracts/pages";
import styles from "./editor-overview.module.css";
import { PublishControls } from "./publish-controls";
import { QrSharingPanel } from "./qr-sharing-panel";

interface EditorOverviewProps {
  page: OwnerPageProjection;
  questionReadiness: QuestionReadiness;
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName?: string;
  imageCount: number;
  isDirty: boolean;
  isSaving: boolean;
  onEditContent: () => void;
  onChanged: (response: PageLifecycleResponse) => void;
}

export interface QuestionReadiness {
  questionCount: number;
  isLoading: boolean;
  isError: boolean;
  isUpdating: boolean;
  onRetry: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(
    new Date(value),
  );
}

function formatLastEdited(value: string): string {
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed >= 0 && elapsed < 60_000) return "Just now";
  if (elapsed >= 0 && elapsed < 3_600_000) {
    const minutes = Math.max(1, Math.floor(elapsed / 60_000));
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }
  return formatDate(value);
}

function countWords(value: string): number {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

function CheckIcon({ complete }: { complete: boolean }): React.JSX.Element {
  return (
    <span
      className={`${styles.checkIcon} ${complete ? styles.checkIconComplete : ""}`}
      aria-hidden="true"
    >
      {complete ? "✓" : ""}
    </span>
  );
}

export function EditorOverview({
  page,
  questionReadiness,
  title,
  recipientName,
  mainMessage,
  creatorName,
  imageCount,
  isDirty,
  isSaving,
  onEditContent,
  onChanged,
}: EditorOverviewProps): React.JSX.Element {
  const responseStatus = getResponseStatus(page, questionReadiness);
  const hasRecipient = recipientName.trim().length > 0;
  const hasMessage = mainMessage.trim().length > 0;
  const hasQuestions = questionReadiness.questionCount > 0;
  const hasMemory = imageCount > 0;
  const completedCount = [
    hasMessage,
    hasRecipient,
    hasQuestions,
    hasMemory,
  ].filter(Boolean).length;
  const progressDegrees = completedCount * 90;

  return (
    <section className={styles.panel} aria-labelledby="overview-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Letter overview</p>
          <h2 id="overview-title">Almost ready to share</h2>
          <p>
            Review the details below, then continue to choose who can view your
            letter.
          </p>
        </div>
        <span className={styles.status}>{page.status}</span>
      </header>

      <section
        className={styles.readinessCard}
        aria-labelledby="readiness-title"
      >
        <h3 id="readiness-title" className={styles.visuallyHidden}>
          Letter readiness
        </h3>
        <div
          className={styles.progressRing}
          style={
            {
              "--progress-degrees": `${progressDegrees}deg`,
            } as React.CSSProperties
          }
          role="img"
          aria-label={`${completedCount} of 4 letter details complete`}
        >
          <span>
            <strong>{completedCount} of 4</strong>
            complete
          </span>
        </div>
        <div className={styles.readinessDetails}>
          <ul className={styles.readinessList}>
            <li>
              <span>
                <CheckIcon complete={hasMessage} />
                Message added
              </span>
              <strong>{hasMessage ? "Complete" : "Required"}</strong>
            </li>
            <li>
              <span>
                <CheckIcon complete={hasRecipient} />
                Recipient added
              </span>
              <strong>{hasRecipient ? "Complete" : "Required"}</strong>
            </li>
            <li>
              <span>
                <CheckIcon complete={hasQuestions} />
                {questionReadiness.isLoading
                  ? "Loading visitor questions"
                  : `${questionReadiness.questionCount} visitor ${questionReadiness.questionCount === 1 ? "question" : "questions"}`}
              </span>
              <strong>{hasQuestions ? "Complete" : "Required"}</strong>
            </li>
            <li>
              <span>
                <CheckIcon complete={hasMemory} />
                Add a memory
              </span>
              <strong>{hasMemory ? "Complete" : "Optional"}</strong>
            </li>
          </ul>
          {questionReadiness.isError ? (
            <button
              className={styles.retryButton}
              type="button"
              onClick={questionReadiness.onRetry}
            >
              Retry questions
            </button>
          ) : null}
          <button
            className={styles.editButton}
            type="button"
            onClick={onEditContent}
          >
            Edit content
          </button>
        </div>
      </section>

      <section
        className={styles.detailsSection}
        aria-labelledby="letter-details-title"
      >
        <h3 id="letter-details-title">Letter details</h3>
        <dl className={styles.detailsGrid}>
          <div>
            <dt>Title</dt>
            <dd>{title.trim() || "For you, always"}</dd>
          </div>
          <div>
            <dt>Recipient</dt>
            <dd>{recipientName.trim() || "Not added"}</dd>
          </div>
          <div>
            <dt>Length</dt>
            <dd>{countWords(mainMessage)} words</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              <time dateTime={page.createdAt}>
                {formatDate(page.createdAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Memories</dt>
            <dd>{imageCount} of 10</dd>
          </div>
          <div>
            <dt>Last edited</dt>
            <dd>
              <time dateTime={page.updatedAt}>
                {formatLastEdited(page.updatedAt)}
              </time>
            </dd>
          </div>
          <div>
            <dt>Questions</dt>
            <dd>
              {questionReadiness.isLoading
                ? "Loading"
                : questionReadiness.isError
                  ? "Unavailable"
                  : questionReadiness.questionCount}
            </dd>
          </div>
          <div>
            <dt>Sign-off</dt>
            <dd>{creatorName?.trim() || "Not added"}</dd>
          </div>
        </dl>
      </section>

      <section
        className={styles.sharingSection}
        aria-label="Publishing and sharing"
      >
        <div className={styles.sharingGrid}>
          <PublishControls
            page={page}
            isDirty={isDirty}
            isSaving={isSaving}
            title={title}
            recipientName={recipientName}
            mainMessage={mainMessage}
            creatorName={creatorName}
            embedded
            showPrimaryAction={false}
            onChanged={onChanged}
          />
          {page.canonicalUrl ? (
            <QrSharingPanel
              canonicalUrl={page.canonicalUrl}
              slug={page.slug}
              compact
            />
          ) : (
            <section
              className={styles.qrUnavailable}
              aria-labelledby="qr-link-title"
            >
              <p className={styles.qrTitle} id="qr-link-title">
                Scan to open
              </p>
              <div className={styles.qrPlaceholder} aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <rect x="3" y="3" width="6" height="6" rx="1" />
                  <rect x="15" y="3" width="6" height="6" rx="1" />
                  <rect x="3" y="15" width="6" height="6" rx="1" />
                  <path d="M15 15h2v2h-2zm4 0h2v6h-2zm-4 4h2v2h-2z" />
                </svg>
              </div>
              <p>This QR code will activate when you publish.</p>
            </section>
          )}
        </div>

        <div className={styles.privacyBar}>
          <span className={styles.lockIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <span>Visitor responses</span>
          <strong>{responseStatus.label}</strong>
          {responseStatus.retry ? (
            <button type="button" onClick={questionReadiness.onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      </section>
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
    return { label: "Private · Add a question", retry: false };
  }
  return page.status === "PUBLISHED"
    ? { label: "Private · Enabled automatically", retry: false }
    : { label: "Private · Ready when published", retry: false };
}
