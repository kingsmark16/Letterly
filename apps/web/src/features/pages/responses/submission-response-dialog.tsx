"use client";

import type { OwnerSubmissionDetail } from "@letterly/contracts/submissions";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  MailOpen,
  MessageCircleQuestion,
  MessageSquareText,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useRef } from "react";
import confessionThumbnail from "../../../../assets/categories/confession/confession-thumbnail.png";
import { getSubmission } from "../api/submissions";
import { WebApiError } from "../../../lib/api/errors";
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
  onRestoreFocus?: (responseId: string | null) => void;
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
  onRestoreFocus,
}: SubmissionResponseDialogProps): React.JSX.Element {
  const openedResponseId = useRef(responseId);
  const opener = useRef<HTMLElement | null>(null);
  const detailQuery = useQuery<OwnerSubmissionDetail, WebApiError>({
    queryKey: ["submission", pageId, responseId],
    queryFn: ({ signal }) =>
      getSubmission(pageId, responseId ?? "", { signal }),
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
        <Dialog.Content
          className={styles.content}
          onOpenAutoFocus={() => {
            openedResponseId.current = responseId;
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (onRestoreFocus) {
              onRestoreFocus(openedResponseId.current);
            } else if (opener.current?.isConnected) {
              opener.current.focus();
            }
          }}
        >
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
                <MailOpen strokeWidth={1.7} />
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
              <X strokeWidth={1.8} aria-hidden="true" />
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
                      <Calendar strokeWidth={1.7} />
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
                      <Clock strokeWidth={1.7} />
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
                      <User strokeWidth={1.7} />
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
                          <MessageCircleQuestion strokeWidth={1.7} />
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

                {detail.visitorMessage ? (
                  <section className={styles.extraSection}>
                    <div className={styles.questionHeading}>
                      <span className={styles.questionIcon} aria-hidden="true">
                        <MessageSquareText strokeWidth={1.7} />
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

                {answers.length === 0 && !detail.visitorMessage ? (
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
                <CheckCircle2 strokeWidth={1.8} aria-hidden="true" />
                Done
              </Dialog.Close>
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
