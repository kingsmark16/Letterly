"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type {
  CreatePageQuestionRequest,
  PageQuestion,
  UpdatePageQuestionRequest,
} from "@letterly/contracts/questions";
import {
  createPageQuestion,
  deletePageQuestion,
  getOwnerPage,
  listPageQuestions,
  updatePageQuestion,
  type WebApiError,
} from "../../../lib/api-client";
import {
  QuestionFlowCanvas,
  type QuestionCanvasChoiceDraft,
  type QuestionCanvasType,
} from "./question-flow-canvas";

interface QuestionEditorProps {
  pageId: string;
  savedVersion: number;
  onChanged: () => void;
}

type QuestionType = QuestionCanvasType;
type ChoiceDraft = QuestionCanvasChoiceDraft;

const CONTINUE_VALUE = "__continue__";
const FINISH_VALUE = "__finish__";

function generatedQuestionKey(prompt: string): string {
  const readablePrompt = prompt
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `question-${readablePrompt || "question"}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}

function emptyChoice(existingKeys: Iterable<string>): ChoiceDraft {
  const keys = new Set(existingKeys);
  let suffix = 1;
  while (keys.has(`choice-${suffix}`)) suffix += 1;
  return {
    key: `choice-${suffix}`,
    label: "",
    nextQuestionId: null,
    endsJourney: false,
  };
}

function initialChoices(): ChoiceDraft[] {
  const first = emptyChoice([]);
  return [first, emptyChoice([first.key])];
}

export function QuestionEditor({
  pageId,
  savedVersion,
  onChanged,
}: QuestionEditorProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [type, setType] = useState<QuestionType>("CHOICE");
  const [prompt, setPrompt] = useState("");
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
  const [endsJourney, setEndsJourney] = useState(false);
  const [choices, setChoices] = useState<ChoiceDraft[]>(initialChoices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [version, setVersion] = useState(savedVersion);
  const [lastFailedAction, setLastFailedAction] = useState<"save" | null>(null);
  const [inlineErrorQuestionId, setInlineErrorQuestionId] = useState<
    string | null
  >(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const questions = useMemo(
    () =>
      [...(questionsQuery.data ?? [])].sort((a, b) =>
        a.displayOrder === b.displayOrder
          ? a.id.localeCompare(b.id)
          : a.displayOrder - b.displayOrder,
      ),
    [questionsQuery.data],
  );
  const choicesValid =
    choices.length >= 2 && choices.every((choice) => choice.label.trim());

  useEffect(() => setVersion(savedVersion), [savedVersion]);

  function setFeedback(nextMessage: string, kind: "status" | "error"): void {
    setMessage(nextMessage);
    setMessageKind(kind);
  }

  function resetForm(): void {
    setEditingId(null);
    setIsCreating(false);
    setType("CHOICE");
    setPrompt("");
    setNextQuestionId(null);
    setEndsJourney(false);
    setChoices(initialChoices());
    setInlineErrorQuestionId(null);
  }

  function editQuestion(question: PageQuestion): void {
    setIsCreating(false);
    setEditingId(question.id);
    setType(question.type);
    setPrompt(question.prompt);
    setNextQuestionId(question.nextQuestionId);
    setEndsJourney(question.endsJourney);
    setChoices(
      question.choices.map((choice) => ({
        key: choice.key,
        label: choice.label,
        nextQuestionId: choice.nextQuestionId,
        endsJourney: choice.endsJourney,
      })),
    );
    setMessage(null);
    setInlineErrorQuestionId(null);
  }

  function applyDestination(
    value: string,
    setTarget: (target: string | null) => void,
    setFinish: (finish: boolean) => void,
  ): void {
    if (value === FINISH_VALUE) {
      setTarget(null);
      setFinish(true);
      return;
    }
    setTarget(value === CONTINUE_VALUE ? null : value);
    setFinish(false);
  }

  function responseImpactConfirmed(error: WebApiError): boolean {
    return (
      error.code === "RESPONSE_IMPACT" &&
      window.confirm(
        "This change removes answers that use this question. Continue?",
      )
    );
  }

  const saveMutation = useMutation({
    mutationFn: async (confirmResponseDeletion: boolean) => {
      if (editingId) {
        const input: UpdatePageQuestionRequest = {
          type,
          prompt,
          endsJourney: type === "PLAIN_MESSAGE" ? endsJourney : false,
          nextQuestionId:
            type === "PLAIN_MESSAGE" && !endsJourney ? nextQuestionId : null,
          choices:
            type === "CHOICE"
              ? choices.map((choice, index) => ({
                  key: choice.key,
                  label: choice.label,
                  displayOrder: index,
                  nextQuestionId: choice.endsJourney
                    ? null
                    : choice.nextQuestionId,
                  endsJourney: choice.endsJourney,
                }))
              : undefined,
          expectedContentVersion: version,
          confirmResponseDeletion,
        };
        return updatePageQuestion(pageId, editingId, input);
      }

      const input: CreatePageQuestionRequest = {
        key: generatedQuestionKey(prompt),
        type,
        prompt,
        endsJourney: type === "PLAIN_MESSAGE" ? endsJourney : false,
        nextQuestionId:
          type === "PLAIN_MESSAGE" && !endsJourney ? nextQuestionId : null,
        choices:
          type === "CHOICE"
            ? choices.map((choice, index) => ({
                key: choice.key,
                label: choice.label,
                displayOrder: index,
                nextQuestionId: choice.endsJourney
                  ? null
                  : choice.nextQuestionId,
                endsJourney: choice.endsJourney,
              }))
            : undefined,
        config: null,
      };
      return createPageQuestion(pageId, input);
    },
    onSuccess: (result) => {
      setVersion(result.contentVersion);
      setLastFailedAction(null);
      setFeedback(
        editingId
          ? "Question saved. Visitors will follow the updated path."
          : questions.length === 0
            ? "Base question added. It will appear first in the letter."
            : "Question added to the end of the flow.",
        "status",
      );
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError) => {
      if (responseImpactConfirmed(error)) {
        saveMutation.mutate(true);
        return;
      }
      if (error.code === "STALE_VERSION") {
        const currentContentVersion =
          error.details && "currentContentVersion" in error.details
            ? error.details.currentContentVersion
            : null;
        if (typeof currentContentVersion === "number") {
          setVersion(currentContentVersion);
        } else {
          void getOwnerPage(pageId).then((page) => {
            setVersion(page.contentVersion);
          });
        }
        setLastFailedAction("save");
        setInlineErrorQuestionId(editingId);
        setFeedback(
          "This page changed elsewhere. Your edits are still here, and the latest version is ready. Retry save to keep them.",
          "error",
        );
        return;
      }
      setLastFailedAction("save");
      setInlineErrorQuestionId(editingId);
      setFeedback(
        error.code === "QUESTION_REFERENCED"
          ? "This question is used by another answer. Redirect that answer before deleting it."
          : error.message ||
              "We could not save this question. Your edits are still here.",
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      questionId,
      confirmResponseDeletion,
    }: {
      questionId: string;
      confirmResponseDeletion: boolean;
    }) =>
      deletePageQuestion(pageId, questionId, {
        expectedContentVersion: version,
        confirmResponseDeletion,
      }),
    onSuccess: (result) => {
      setVersion(result.contentVersion);
      setFeedback(
        "Question deleted. The remaining flow was kept in order.",
        "status",
      );
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError, variables) => {
      if (responseImpactConfirmed(error)) {
        deleteMutation.mutate({ ...variables, confirmResponseDeletion: true });
        return;
      }
      setInlineErrorQuestionId(
        error.code === "QUESTION_REFERENCED" ? variables.questionId : null,
      );
      setFeedback(
        error.code === "QUESTION_REFERENCED"
          ? "This question is referenced by another answer. Redirect that answer before deleting it."
          : error.message,
        "error",
      );
    },
  });

  function saveQuestion(): void {
    if (!prompt.trim()) {
      setFeedback("Add a prompt before saving this question.", "error");
      return;
    }
    if (type === "CHOICE" && !choicesValid) {
      setFeedback(
        "Add at least two answer choices, each with a label.",
        "error",
      );
      return;
    }
    setLastFailedAction(null);
    saveMutation.mutate(false);
  }

  function beginNewQuestion(): void {
    resetForm();
    setIsCreating(true);
    setMessage(null);
  }

  function closeEditor(): void {
    if (saveMutation.isPending) return;
    resetForm();
    setMessage(null);
    setLastFailedAction(null);
  }

  function changeType(nextType: QuestionType): void {
    setType(nextType);
    if (nextType === "CHOICE") {
      setEndsJourney(false);
      setNextQuestionId(null);
      setChoices((current) =>
        current.length >= 2 ? current : initialChoices(),
      );
    }
  }

  function changePlainDestination(value: string): void {
    applyDestination(value, setNextQuestionId, setEndsJourney);
  }

  function changeChoice(index: number, patch: Partial<ChoiceDraft>): void {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...patch } : choice,
      ),
    );
  }

  function changeChoiceDestination(index: number, value: string): void {
    setChoices((current) =>
      current.map((choice, choiceIndex) => {
        if (choiceIndex !== index) return choice;
        if (value === FINISH_VALUE) {
          return { ...choice, nextQuestionId: null, endsJourney: true };
        }
        return {
          ...choice,
          nextQuestionId: value === CONTINUE_VALUE ? null : value,
          endsJourney: false,
        };
      }),
    );
  }

  function addChoice(): void {
    setChoices((current) => [
      ...current,
      emptyChoice(current.map((choice) => choice.key)),
    ]);
  }

  function removeChoice(index: number): void {
    setChoices((current) =>
      current.filter((_, choiceIndex) => choiceIndex !== index),
    );
  }

  function deleteQuestion(question: PageQuestion): void {
    const warning =
      questions[0]?.id === question.id
        ? "Delete the base question? The next question will become the new base."
        : "Delete this question?";
    if (window.confirm(warning)) {
      deleteMutation.mutate({
        questionId: question.id,
        confirmResponseDeletion: false,
      });
    }
  }

  const destinationOptions = questions.filter(
    (question, index) => question.id !== editingId && index > 0,
  );

  return (
    <section
      className="mt-8 border-t border-border pt-7"
      aria-labelledby="question-editor-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Response flow
          </p>
          <h2
            id="question-editor-title"
            className="mt-2 font-display text-2xl font-semibold"
          >
            Questions visitors will see
          </h2>
          <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-muted">
            Build one connected path. Your first question is the base, and each
            new question is added after it. Answers can continue to the next
            question, branch to a named question, or finish the journey.
          </p>
        </div>
      </div>

      <aside
        className="mt-5 rounded-medium border border-rose bg-rose/20 p-4 text-small text-ink"
        aria-labelledby="branching-help-title"
      >
        <h3 id="branching-help-title" className="font-bold text-wine">
          How this flow works
        </h3>
        <p className="mt-1 leading-relaxed">
          The first question is always the base question in the letter. New
          questions append below it, so you never need to number or reorder
          them. Choose a destination on each answer to connect branches. A named
          destination jumps to that question, Continue follows the next
          question, and Finish opens the private response area.
        </p>
      </aside>

      {questionsQuery.isPending ? (
        <p className="mt-5 text-small text-ink-muted" aria-busy="true">
          Loading questions...
        </p>
      ) : null}
      {questionsQuery.isError ? (
        <p className="mt-5 text-small text-error" role="alert">
          {(questionsQuery.error as WebApiError).message}
        </p>
      ) : null}

      {message ? (
        <div
          className={`mt-5 rounded-medium border p-4 text-small ${
            messageKind === "error"
              ? "border-error bg-surface text-error"
              : "border-border bg-surface-muted text-ink"
          }`}
          role={messageKind === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <p>{message}</p>
          {messageKind === "error" && lastFailedAction === "save" ? (
            <button
              type="button"
              className="mt-3 min-h-11 rounded-small border border-error px-3 py-2 font-bold text-error hover:bg-surface"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
            >
              Retry save
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <QuestionFlowCanvas
          pageId={pageId}
          questions={questions}
          editor={
            editingId || isCreating
              ? {
                  editingId,
                  isCreating,
                  draft: {
                    type,
                    prompt,
                    nextQuestionId,
                    endsJourney,
                    choices,
                  },
                  isSaving: saveMutation.isPending,
                  canSave: !saveMutation.isPending,
                  destinationOptions,
                  onPromptChange: setPrompt,
                  onTypeChange: changeType,
                  onPlainDestinationChange: changePlainDestination,
                  onChoiceChange: changeChoice,
                  onChoiceDestinationChange: changeChoiceDestination,
                  onAddChoice: addChoice,
                  onRemoveChoice: removeChoice,
                  onSave: saveQuestion,
                  onCancel: closeEditor,
                }
              : null
          }
          onEdit={editQuestion}
          onDelete={deleteQuestion}
          onAddQuestion={beginNewQuestion}
        />
        {inlineErrorQuestionId ? (
          <p className="mt-4 text-small text-error" role="alert">
            Redirect the answer that points here before deleting this question.
          </p>
        ) : null}
      </div>
    </section>
  );
}
