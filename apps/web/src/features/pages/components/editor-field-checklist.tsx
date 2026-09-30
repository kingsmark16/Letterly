"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type FieldStatus =
  "ready" | "optional" | "partial" | "needed" | "checking" | "unavailable";

interface ChecklistField {
  label: string;
  compactLabel?: string;
  detail?: string;
  compactDetail?: string;
  status: FieldStatus;
}

interface EditorFieldChecklistProps {
  hasTitle: boolean;
  hasRecipient: boolean;
  hasSender: boolean;
  hasMessage: boolean;
  photoCount: number;
  photoCaptionCount: number;
  musicSource: "YouTube link" | "Audio upload" | null;
  musicStatus: "ready" | "optional" | "checking" | "unavailable";
  questionCount: number;
  choiceQuestionCount: number;
  choiceCount: number;
  questionsLoading: boolean;
  questionsError: boolean;
  onEditContent: () => void;
}

const statusLabels: Record<FieldStatus, string> = {
  ready: "Ready",
  optional: "Optional",
  partial: "Partial",
  needed: "Needed",
  checking: "Checking",
  unavailable: "Unavailable",
};

function StatusMark({ status }: { status: FieldStatus }): React.JSX.Element {
  const colorClass =
    status === "ready"
      ? "bg-olive/10 text-olive"
      : status === "needed" || status === "unavailable"
        ? "bg-warning/10 text-warning"
        : "bg-surface-muted text-ink-muted";

  return (
    <span
      className={`grid size-4 shrink-0 place-items-center rounded-full sm:size-5 ${colorClass}`}
      aria-hidden="true"
    >
      {status === "ready" ? (
        <svg viewBox="0 0 20 20" fill="none" className="size-3 sm:size-3.5">
          <path
            d="m4.5 10 3.5 3.5 7.5-7.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      ) : status === "needed" || status === "unavailable" ? (
        <span className="text-[0.65rem] font-bold">!</span>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="size-3 sm:size-3.5">
          <path
            d="M5 10h10"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      )}
    </span>
  );
}

function ChecklistField({
  label,
  compactLabel,
  detail,
  compactDetail,
  status,
}: ChecklistField): React.JSX.Element {
  const statusColor =
    status === "ready"
      ? "text-olive"
      : status === "needed" || status === "unavailable"
        ? "text-warning"
        : "text-ink-muted";

  return (
    <li className="grid min-h-7 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-medium bg-surface px-1 py-0.5 sm:gap-3 sm:px-3 sm:py-2">
      <span className="flex min-w-0 items-center gap-1 sm:gap-2.5">
        <StatusMark status={status} />
        <span className="grid min-w-0 gap-0.5">
          <strong className="text-xs leading-tight font-semibold text-ink sm:text-small">
            <span className="sr-only">{label}</span>
            <span className="sm:hidden" aria-hidden="true">
              {compactLabel ?? label}
            </span>
            <span className="hidden sm:inline" aria-hidden="true">
              {label}
            </span>
          </strong>
          {detail ? (
            <>
              <span className="sr-only">{detail}</span>
              <span
                className="hidden break-words text-xs leading-snug text-ink-muted sm:block"
                aria-hidden="true"
              >
                {detail}
              </span>
            </>
          ) : null}
        </span>
      </span>
      {compactDetail ? (
        <span
          className="text-[0.6875rem] leading-tight font-medium text-ink-muted sm:hidden"
          aria-hidden="true"
        >
          {compactDetail}
        </span>
      ) : null}
      <span className="sr-only">{statusLabels[status]}</span>
      {status !== "ready" && status !== "optional" ? (
        <span
          className={`col-span-2 text-[0.625rem] font-semibold sm:hidden ${statusColor}`}
          aria-hidden="true"
        >
          {statusLabels[status]}
        </span>
      ) : null}
      <span
        className={`hidden text-xs font-semibold sm:inline ${statusColor}`}
        aria-hidden="true"
      >
        {statusLabels[status]}
      </span>
    </li>
  );
}

function ChecklistGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section
      className="grid min-w-0 content-start gap-0.5 sm:gap-2"
      aria-label={title}
    >
      <h4 className="font-display text-small font-semibold leading-tight text-ink sm:text-base">
        {title}
      </h4>
      <ul className="m-0 grid min-w-0 list-none gap-0.5 p-0 sm:gap-1.5">
        {children}
      </ul>
    </section>
  );
}

export function EditorFieldChecklist({
  hasTitle,
  hasRecipient,
  hasSender,
  hasMessage,
  photoCount,
  photoCaptionCount,
  musicSource,
  musicStatus,
  questionCount,
  choiceQuestionCount,
  choiceCount,
  questionsLoading,
  questionsError,
  onEditContent,
}: EditorFieldChecklistProps): React.JSX.Element {
  const questionStatus: FieldStatus = questionsLoading
    ? "checking"
    : questionsError
      ? "unavailable"
      : questionCount > 0
        ? "ready"
        : "optional";

  return (
    <section
      className="grid min-w-0 content-start gap-1.5 rounded-large bg-canvas p-1.5 sm:gap-3 sm:p-3"
      aria-labelledby="field-checklist-title"
    >
      <header className="flex min-w-0 items-center justify-between gap-2">
        <h3
          id="field-checklist-title"
          className="font-display text-base font-semibold leading-tight text-ink sm:text-xl"
        >
          Field checklist
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 shrink-0 rounded-full bg-surface-muted px-3 font-semibold text-wine hover:bg-surface hover:text-wine focus-visible:ring-focus sm:px-4"
          type="button"
          onClick={onEditContent}
        >
          Edit letter
        </Button>
      </header>

      <div className="grid min-w-0 grid-cols-2 content-start gap-1.5 sm:gap-3 xl:grid-cols-4">
        <ChecklistGroup title="Words">
          <ChecklistField
            label="Title"
            status={hasTitle ? "ready" : "optional"}
          />
          <ChecklistField
            label="To"
            status={hasRecipient ? "ready" : "needed"}
          />
          <ChecklistField
            label="From"
            status={hasSender ? "ready" : "optional"}
          />
          <ChecklistField
            label="Message"
            status={hasMessage ? "ready" : "needed"}
          />
        </ChecklistGroup>

        <ChecklistGroup title="Photos">
          <ChecklistField
            label="Photo gallery"
            compactLabel="Gallery"
            detail={`${photoCount} ${photoCount === 1 ? "photo" : "photos"} included`}
            compactDetail={String(photoCount)}
            status={photoCount > 0 ? "ready" : "optional"}
          />
          <ChecklistField
            label="Photo captions"
            compactLabel="Captions"
            detail={`${photoCaptionCount} of ${photoCount} filled`}
            compactDetail={`${photoCaptionCount}/${photoCount}`}
            status={
              photoCaptionCount === 0
                ? "optional"
                : photoCaptionCount < photoCount
                  ? "partial"
                  : "ready"
            }
          />
        </ChecklistGroup>

        <ChecklistGroup title="Music">
          <ChecklistField
            label="Music source"
            compactLabel="Source"
            detail={musicSource ?? undefined}
            compactDetail={
              musicSource === "YouTube link"
                ? "YouTube"
                : musicSource === "Audio upload"
                  ? "File"
                  : undefined
            }
            status={musicStatus}
          />
          <ChecklistField
            label="Song title"
            compactLabel="Title"
            status={musicStatus}
          />
        </ChecklistGroup>

        <ChecklistGroup title="Questions">
          <ChecklistField
            label="Question prompts"
            compactLabel="Prompts"
            detail={
              questionsLoading || questionsError
                ? undefined
                : `${questionCount} ${questionCount === 1 ? "question" : "questions"} added`
            }
            compactDetail={
              questionsLoading || questionsError
                ? undefined
                : String(questionCount)
            }
            status={questionStatus}
          />
          <ChecklistField
            label="Answer choices"
            compactLabel="Choices"
            detail={
              questionsLoading || questionsError || choiceCount === 0
                ? undefined
                : `${choiceCount} across ${choiceQuestionCount} ${choiceQuestionCount === 1 ? "question" : "questions"}`
            }
            compactDetail={
              questionsLoading || questionsError
                ? undefined
                : String(choiceCount)
            }
            status={
              questionsLoading
                ? "checking"
                : questionsError
                  ? "unavailable"
                  : choiceCount > 0
                    ? "ready"
                    : "optional"
            }
          />
        </ChecklistGroup>
      </div>
    </section>
  );
}
