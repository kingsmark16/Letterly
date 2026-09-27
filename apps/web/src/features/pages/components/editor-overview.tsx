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

const statusLabels: Record<OwnerPageProjection["status"], string> = {
  DRAFT: "Private draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
};

function RequirementMark({
  complete,
}: {
  complete: boolean;
}): React.JSX.Element {
  return (
    <span
      className={`${styles.requirementMark} ${complete ? styles.requirementMarkComplete : ""}`}
      aria-hidden="true"
    >
      {complete ? (
        <svg viewBox="0 0 20 20" fill="none" focusable="false">
          <path d="m4.5 10 3.5 3.5 7.5-7.5" />
        </svg>
      ) : (
        <span className={styles.requirementDot} />
      )}
    </span>
  );
}

function getResponseStatus(
  page: OwnerPageProjection,
  readiness: QuestionReadiness,
): { label: string; retry: boolean } {
  if (readiness.isLoading) {
    return { label: "Checking private reply availability.", retry: false };
  }
  if (readiness.isError) {
    return { label: "Private reply availability is unavailable.", retry: true };
  }
  if (page.status === "ARCHIVED") {
    return {
      label: "Private replies are unavailable while archived.",
      retry: false,
    };
  }
  if (readiness.isUpdating) {
    return { label: "Updating private reply availability.", retry: false };
  }
  if (readiness.questionCount === 0) {
    return {
      label: "Add a question to receive private replies.",
      retry: false,
    };
  }
  return page.status === "PUBLISHED"
    ? { label: "Private replies are on.", retry: false }
    : { label: "Private replies turn on when you publish.", retry: false };
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
  const hasRecipient = recipientName.trim().length > 0;
  const hasMessage = mainMessage.trim().length > 0;
  const responseStatus = getResponseStatus(page, questionReadiness);
  const isPublished = page.status === "PUBLISHED";
  const optionalParts = [
    imageCount > 0
      ? `${imageCount} ${imageCount === 1 ? "memory" : "memories"}`
      : null,
    !questionReadiness.isLoading &&
    !questionReadiness.isError &&
    questionReadiness.questionCount > 0
      ? `${questionReadiness.questionCount} ${questionReadiness.questionCount === 1 ? "question" : "questions"}`
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <section className={styles.panel} aria-labelledby="overview-title">
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Review &amp; share</p>
          <h2 id="overview-title">
            {isPublished
              ? "Your letter is live"
              : "A final look before sharing"}
          </h2>
          <p>
            {isPublished
              ? "Your public link is ready. Review the letter or send it to someone."
              : "Check the essentials, then publish to create a link you can share."}
          </p>
        </div>
        <span className={styles.status}>
          <span className={styles.statusDot} aria-hidden="true" />
          {statusLabels[page.status]}
        </span>
      </header>

      <section className={styles.reviewSection} aria-labelledby="review-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.stepLabel}>01 / CHECK</p>
            <h3 id="review-title">The essentials</h3>
            <p>Both are needed before this letter can be published.</p>
          </div>
          <button
            className={styles.editButton}
            type="button"
            onClick={onEditContent}
          >
            Edit letter
          </button>
        </div>

        <ul className={styles.requirementList}>
          <li>
            <RequirementMark complete={hasRecipient} />
            <span className={styles.requirementCopy}>
              <strong>Recipient</strong>
              <span>
                {hasRecipient
                  ? `For ${recipientName.trim()}`
                  : "Add who this letter is for."}
              </span>
            </span>
            <span className={styles.requirementState}>
              {hasRecipient ? "Ready" : "Needed"}
            </span>
          </li>
          <li>
            <RequirementMark complete={hasMessage} />
            <span className={styles.requirementCopy}>
              <strong>Message</strong>
              <span>
                {hasMessage
                  ? "Your message is written."
                  : "Write the message you want to share."}
              </span>
            </span>
            <span className={styles.requirementState}>
              {hasMessage ? "Ready" : "Needed"}
            </span>
          </li>
        </ul>

        {isSaving || isDirty ? (
          <p className={styles.saveNotice} role="status">
            {isSaving
              ? "Saving your latest changes."
              : isPublished
                ? "Save your changes to update the public letter."
                : "Your changes need to finish saving before publishing."}
          </p>
        ) : null}

        {optionalParts.length > 0 ? (
          <p className={styles.optionalSummary}>
            Also included: {optionalParts.join(" and ")}.
          </p>
        ) : null}
        <p className={styles.responseNote} role="status">
          {responseStatus.label}
          {responseStatus.retry ? (
            <button
              className={styles.retryButton}
              type="button"
              onClick={questionReadiness.onRetry}
            >
              Retry
            </button>
          ) : null}
        </p>
      </section>

      <div className={styles.publishSection}>
        <p className={styles.stepLabel} aria-hidden="true">
          {isPublished ? "02 / LINK" : "02 / PUBLISH"}
        </p>
        <PublishControls
          page={page}
          isDirty={isDirty}
          isSaving={isSaving}
          title={title}
          recipientName={recipientName}
          mainMessage={mainMessage}
          creatorName={creatorName}
          embedded
          showPrimaryAction
          showUnpublishAction={false}
          onChanged={onChanged}
        />
      </div>

      {isPublished && page.canonicalUrl ? (
        <section className={styles.shareSection} aria-labelledby="share-title">
          <div className={styles.shareIntro}>
            <p className={styles.stepLabel}>03 / SHARE</p>
            <h3 id="share-title">Send the link</h3>
            <p>Use the link above or download a QR code for your letter.</p>
          </div>
          <QrSharingPanel
            canonicalUrl={page.canonicalUrl}
            slug={page.slug}
            compact
          />
        </section>
      ) : null}
    </section>
  );
}
