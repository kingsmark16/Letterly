"use client";

import type {
  OwnerPageProjection,
  PageLifecycleResponse,
} from "@letterly/contracts/pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import styles from "./draft-editor.module.css";
import { EditorFieldChecklist } from "./editor-field-checklist";
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
  photoCaptionCount: number;
  choiceQuestionCount: number;
  choiceCount: number;
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

function getResponseStatus(
  page: OwnerPageProjection,
  readiness: QuestionReadiness,
): { label: string; retry: boolean } {
  if (readiness.isLoading) {
    return { label: "Checking private replies.", retry: false };
  }
  if (readiness.isError) {
    return { label: "Private reply status is unavailable.", retry: true };
  }
  if (page.status === "ARCHIVED") {
    return {
      label: "Private replies are unavailable while archived.",
      retry: false,
    };
  }
  if (readiness.isUpdating) {
    return { label: "Updating private replies.", retry: false };
  }
  if (readiness.questionCount === 0) {
    return {
      label: "Add a question to receive replies.",
      retry: false,
    };
  }
  return page.status === "PUBLISHED"
    ? { label: "Private replies are on.", retry: false }
    : { label: "Replies turn on after publishing.", retry: false };
}

export function EditorOverview({
  page,
  questionReadiness,
  title,
  recipientName,
  mainMessage,
  creatorName,
  imageCount,
  photoCaptionCount,
  choiceQuestionCount,
  choiceCount,
  isDirty,
  isSaving,
  onEditContent,
  onChanged,
}: EditorOverviewProps): React.JSX.Element {
  const hasTitle = title.trim().length > 0;
  const hasRecipient = recipientName.trim().length > 0;
  const hasSender = Boolean(creatorName?.trim());
  const hasMessage = mainMessage.trim().length > 0;
  const responseStatus = getResponseStatus(page, questionReadiness);
  const isPublished = page.status === "PUBLISHED";
  const musicSource = page.audioLink
    ? "YouTube link"
    : page.audio
      ? "Audio upload"
      : null;
  const musicStatus = page.audioLink
    ? "ready"
    : !page.audio
      ? "optional"
      : page.audio.state === "READY"
        ? "ready"
        : page.audio.state === "FAILED" || page.audio.state === "EXPIRED"
          ? "unavailable"
          : "checking";
  const publishContent = (
    <>
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
        showPublicLinkActions={false}
        showPrivatePreview={false}
        showUnpublishAction
        onChanged={onChanged}
      />
      {responseStatus.retry ? (
        <p
          className="m-0 flex flex-wrap items-center justify-between gap-2 rounded-medium bg-surface px-3 py-2 text-small leading-snug text-ink-muted"
          role="status"
        >
          <span>{responseStatus.label}</span>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 rounded-full px-3 font-semibold text-wine hover:bg-surface-muted hover:text-wine focus-visible:ring-focus"
            type="button"
            onClick={questionReadiness.onRetry}
          >
            Retry
          </Button>
        </p>
      ) : null}
    </>
  );
  const qrSharePanel =
    isPublished && page.canonicalUrl ? (
      <details
        className="group min-w-0 rounded-medium bg-surface px-2 py-1 sm:px-3 sm:py-2"
        open
      >
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-small font-semibold text-wine focus-visible:rounded-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus [&::-webkit-details-marker]:hidden">
          <span>Share by QR code</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4 shrink-0 transition-transform group-open:rotate-180"
          >
            <path
              d="m5 7.5 5 5 5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.6"
            />
          </svg>
        </summary>
        <QrSharingPanel
          canonicalUrl={page.canonicalUrl}
          slug={page.slug}
          compact
        />
      </details>
    ) : null;

  return (
    <section
      className="flex min-h-0 min-w-0 flex-1 flex-col text-ink"
      aria-label="Review and share"
    >
      <Card
        className={`grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-large border-0 bg-surface p-2 shadow-low sm:p-3 lg:p-4 ${styles.overviewCard}`}
      >
        <div
          className={`grid min-h-0 min-w-0 content-start gap-2 overflow-y-auto overscroll-contain sm:gap-3 ${styles.overviewScroll}`}
        >
          {isPublished ? (
            <div className="grid min-w-0 content-start gap-1.5 rounded-large bg-surface-muted p-2 sm:gap-3 sm:p-3">
              {publishContent}
              {qrSharePanel}
            </div>
          ) : null}
          <EditorFieldChecklist
            hasTitle={hasTitle}
            hasRecipient={hasRecipient}
            hasSender={hasSender}
            hasMessage={hasMessage}
            photoCount={imageCount}
            photoCaptionCount={photoCaptionCount}
            musicSource={musicSource}
            musicStatus={musicStatus}
            questionCount={questionReadiness.questionCount}
            choiceQuestionCount={choiceQuestionCount}
            choiceCount={choiceCount}
            questionsLoading={questionReadiness.isLoading}
            questionsError={questionReadiness.isError}
            onEditContent={onEditContent}
          />
          {!isPublished ? publishContent : null}
        </div>
      </Card>
    </section>
  );
}
