"use client";

import type { OwnerSubmissionDetail } from "@letterly/contracts/submissions";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Dialog } from "radix-ui";
import confessionThumbnail from "../../../../assets/categories/confession/confession-thumbnail.png";
import { getSubmission, WebApiError } from "../../../lib/api-client";
import styles from "./submission-response-dialog.module.css";

type ReadStatus = "read" | "unread" | "pending" | "error";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

interface SubmissionResponseDialogProps {
  pageId: string;
  responseId: string | null;
  readStatus: ReadStatus | null;
  readError: string | null;
  onRetryRead: () => void;
  deletePending?: boolean;
  deleteError?: string | null;
  onRetryDelete?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function SubmissionResponseDialog({
  pageId,
  responseId,
  readStatus,
  readError,
  onRetryRead,
  deletePending = false,
  deleteError = null,
  onRetryDelete,
  onDelete,
  onClose,
}: SubmissionResponseDialogProps): React.JSX.Element {
  const detailQuery = useQuery<OwnerSubmissionDetail, WebApiError>({
    queryKey: ["submission", pageId, responseId],
    queryFn: () => getSubmission(pageId, responseId ?? ""),
    enabled: responseId !== null,
  });
  const detail = detailQuery.data;
  const answers = detail?.journeySnapshot
    ? detail.journeySnapshot.answers.map((answer) => ({
        key: `${answer.questionKey}-${answer.choiceKey}`,
        prompt: answer.prompt,
        value: answer.choiceLabel,
      }))
    : (detail?.answers.map((answer) => ({
        key: answer.questionId,
        prompt: answer.promptSnapshot,
        value:
          answer.choiceLabelSnapshot ??
          answer.textAnswer ??
          "No answer provided.",
      })) ?? []);

  return (
    <Dialog.Root
      open={responseId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <header className={styles.header}>
            <div className={styles.headerArt} aria-hidden="true">
              <Image
                src={confessionThumbnail}
                alt=""
                fill
                sizes="(max-width: 40rem) 13rem, 23rem"
              />
            </div>
            <div className={styles.headerIntro}>
              <span className={styles.headerIcon} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M3.5 9.5 12 16l8.5-6.5" />
                  <path d="M4 8.5h16a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19v-9A1.5 1.5 0 0 1 4 8.5Z" />
                  <path d="m8 8.5 4-4 4 4" />
                </svg>
              </span>
              <div className={styles.headerText}>
                <p className={styles.eyebrow}>Private response</p>
                <Dialog.Title className={styles.title}>
                  Anonymous response
                </Dialog.Title>
                <Dialog.Description className={styles.description}>
                  A reader&apos;s answers, visible only to you.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close
              className={styles.closeButton}
              aria-label="Close response"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </Dialog.Close>
          </header>

          <div className={styles.body}>
            {detailQuery.isPending ? (
              <p className={styles.state} aria-busy="true">
                Opening response…
              </p>
            ) : detailQuery.isError ? (
              <div className={styles.state} role="alert">
                <div>
                  <strong>Response could not be loaded.</strong>
                  <p>{detailQuery.error.message}</p>
                </div>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => void detailQuery.refetch()}
                >
                  Try again
                </button>
              </div>
            ) : !detail ? (
              <p className={styles.state} role="alert">
                This response is no longer available.
              </p>
            ) : (
              <article className={styles.response}>
                <div
                  className={styles.metadata}
                  role="group"
                  aria-label="Response details"
                >
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <rect x="3.5" y="5" width="17" height="16" rx="2" />
                        <path d="M7.5 3v4M16.5 3v4M3.5 9h17" />
                      </svg>
                    </span>
                    <div>
                      <span className={styles.metadataLabel}>Received on</span>
                      <time dateTime={detail.submittedAt}>
                        {formatDate(detail.submittedAt)}
                      </time>
                    </div>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3.5 2" />
                      </svg>
                    </span>
                    <div>
                      <span className={styles.metadataLabel}>Time</span>
                      <time dateTime={detail.submittedAt}>
                        {formatTime(detail.submittedAt)}
                      </time>
                    </div>
                  </div>
                  <div className={styles.metadataItem}>
                    <span className={styles.metadataIcon} aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M4.5 20v-2a7.5 7.5 0 0 1 15 0v2H4.5Z" />
                      </svg>
                    </span>
                    <div>
                      <span className={styles.metadataLabel}>Sent as</span>
                      <span>Anonymous</span>
                    </div>
                  </div>
                </div>

                <div className={styles.answerList}>
                  {answers.map((answer, index) => (
                    <section className={styles.answerSection} key={answer.key}>
                      <div className={styles.questionHeading}>
                        <span
                          className={styles.questionIcon}
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v11A1.5 1.5 0 0 1 19 18.5H9l-4.5 3v-3A1.5 1.5 0 0 1 3 17V6A1.5 1.5 0 0 1 5 4.5Z" />
                            <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1.1.9-1.7 1.3-1.7 2.5M12 16h.01" />
                          </svg>
                        </span>
                        <div>
                          <h3>Question {index + 1}</h3>
                          <p>{answer.prompt}</p>
                        </div>
                      </div>
                      <div className={styles.answerCard}>
                        <span className={styles.answerLabel}>Answer</span>
                        <p>{answer.value}</p>
                      </div>
                    </section>
                  ))}
                </div>

                {detail.journeySnapshot ? (
                  <section className={styles.extraSection}>
                    <div className={styles.questionHeading}>
                      <span className={styles.questionIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="m12 20-7.5-7.2A4.6 4.6 0 0 1 11 6.3l1 1 1-1a4.6 4.6 0 0 1 6.5 6.5L12 20Z" />
                        </svg>
                      </span>
                      <div>
                        <h3>Journey result</h3>
                        <p>{detail.journeySnapshot.outcomeTitle}</p>
                      </div>
                    </div>
                    <div className={styles.answerCard}>
                      <span className={styles.answerLabel}>Result</span>
                      <p>{detail.journeySnapshot.outcomeMessage}</p>
                    </div>
                  </section>
                ) : null}

                {detail.visitorMessage ? (
                  <section className={styles.extraSection}>
                    <div className={styles.questionHeading}>
                      <span className={styles.questionIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v11A1.5 1.5 0 0 1 19 18.5H9l-4.5 3v-3A1.5 1.5 0 0 1 3 17V6A1.5 1.5 0 0 1 5 4.5Z" />
                          <path d="M8 9h8M8 13h5" />
                        </svg>
                      </span>
                      <div>
                        <h3>Private message</h3>
                        <p>{detail.visitorMessage.promptSnapshot}</p>
                      </div>
                    </div>
                    <div className={styles.answerCard}>
                      <span className={styles.answerLabel}>Message</span>
                      <p>{detail.visitorMessage.message}</p>
                    </div>
                  </section>
                ) : null}

                {answers.length === 0 &&
                !detail.journeySnapshot &&
                !detail.visitorMessage ? (
                  <p className={styles.emptyResponse}>
                    This response did not include any answers.
                  </p>
                ) : null}
              </article>
            )}
          </div>

          {responseId ? (
            <footer className={styles.footer}>
              {deletePending ? (
                <p className={styles.footerMessage} role="status">
                  Deleting this response…
                </p>
              ) : deleteError ? (
                <div className={styles.readError} role="alert">
                  <p>{deleteError}</p>
                  {onRetryDelete ? (
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={onRetryDelete}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : readStatus === "pending" ? (
                <p className={styles.footerMessage} role="status">
                  Marking this response as read…
                </p>
              ) : readStatus === "error" ? (
                <div className={styles.readError} role="alert">
                  <p>{readError ?? "This response is still unread."}</p>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={onRetryRead}
                  >
                    Retry
                  </button>
                </div>
              ) : readStatus === "read" ? (
                <span className={styles.visuallyHidden} role="status">
                  Response is read.
                </span>
              ) : null}
              {onDelete ? (
                <button
                  className={styles.deleteButton}
                  type="button"
                  disabled={deletePending || readStatus === "pending"}
                  onClick={onDelete}
                >
                  {deletePending ? "Deleting…" : "Delete response"}
                </button>
              ) : null}
              <Dialog.Close className={styles.doneButton}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8.5 12 2.4 2.5 4.7-5" />
                </svg>
                Done
              </Dialog.Close>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
