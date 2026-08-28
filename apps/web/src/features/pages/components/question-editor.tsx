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
  reorderPageQuestions,
  updatePageQuestion,
  type WebApiError,
} from "../../../lib/api-client";
import {
  QuestionList,
  type QuestionListChoiceDraft,
  type QuestionListType,
} from "./question-list";
import styles from "./question-editor.module.css";

interface QuestionEditorProps {
  pageId: string;
  savedVersion: number;
  onChanged: () => void;
  readOnly?: boolean;
}

type QuestionType = QuestionListType;
type ChoiceDraft = QuestionListChoiceDraft;

function emptyChoice(existingKeys: Iterable<string>): ChoiceDraft {
  const keys = new Set(existingKeys);
  let suffix = 1;
  while (keys.has(`choice-${suffix}`)) suffix += 1;
  return { key: `choice-${suffix}`, label: "" };
}

function initialChoices(): ChoiceDraft[] {
  const first = emptyChoice([]);
  return [first, emptyChoice([first.key])];
}

export function QuestionEditor({
  pageId,
  savedVersion,
  onChanged,
  readOnly = false,
}: QuestionEditorProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [type, setType] = useState<QuestionType>("CHOICE");
  const [prompt, setPrompt] = useState("");
  const [choices, setChoices] = useState<ChoiceDraft[]>(initialChoices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [version, setVersion] = useState(savedVersion);
  const [lastFailedAction, setLastFailedAction] = useState<
    "save" | "reorder" | null
  >(null);
  const [lastReorderIds, setLastReorderIds] = useState<string[] | null>(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const questions = useMemo(
    () =>
      [...(questionsQuery.data ?? [])].sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.id.localeCompare(right.id),
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
    setChoices(initialChoices());
  }

  function editQuestion(question: PageQuestion): void {
    if (readOnly) return;

    setIsCreating(false);
    setEditingId(question.id);
    setType(question.type);
    setPrompt(question.prompt);
    setChoices(
      question.choices.map((choice) => ({
        key: choice.key,
        label: choice.label,
        creatorMessage: choice.creatorMessage,
      })),
    );
    setMessage(null);
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
      const questionInput = {
        type,
        prompt,
        choices:
          type === "CHOICE"
            ? choices.map((choice, index) => ({
                key: choice.key,
                label: choice.label,
                displayOrder: index,
                ...(choice.creatorMessage
                  ? { creatorMessage: choice.creatorMessage }
                  : {}),
              }))
            : undefined,
      };
      if (editingId) {
        const input: UpdatePageQuestionRequest = {
          ...questionInput,
          expectedContentVersion: version,
          confirmResponseDeletion,
        };
        return updatePageQuestion(pageId, editingId, input);
      }
      const input: CreatePageQuestionRequest = {
        ...questionInput,
        config: null,
      };
      return createPageQuestion(pageId, input);
    },
    onSuccess: (result) => {
      setVersion(result.contentVersion);
      setLastFailedAction(null);
      setLastReorderIds(null);
      setFeedback(
        editingId
          ? "Question saved."
          : questions.length === 0
            ? "First question added. It will appear first in the letter."
            : "Question added to the end of the list.",
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
          void getOwnerPage(pageId).then((page) =>
            setVersion(page.contentVersion),
          );
        }
        setLastFailedAction("save");
        setFeedback(
          "This page changed elsewhere. Your edits are still here. Retry save to keep them.",
          "error",
        );
        return;
      }
      setLastFailedAction("save");
      setFeedback(
        error.message ||
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
        "Question deleted. The remaining questions stay in order.",
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
      setFeedback(error.message, "error");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (questionIds: string[]) =>
      reorderPageQuestions(pageId, {
        questionIds,
        expectedContentVersion: version,
      }),
    onMutate: (questionIds) => {
      const previous = queryClient.getQueryData<PageQuestion[]>([
        "questions",
        pageId,
      ]);
      if (previous) {
        const byId = new Map(
          previous.map((question) => [question.id, question]),
        );
        queryClient.setQueryData(
          ["questions", pageId],
          questionIds
            .map((id, displayOrder) => {
              const question = byId.get(id);
              return question ? { ...question, displayOrder } : null;
            })
            .filter((question): question is PageQuestion => question !== null),
        );
      }
      return { previous };
    },
    onSuccess: (result) => {
      setVersion(result.contentVersion);
      setLastFailedAction(null);
      setFeedback("Question order saved.", "status");
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["questions", pageId], context.previous);
      }
      if (error.code === "STALE_VERSION") {
        const currentContentVersion =
          error.details && "currentContentVersion" in error.details
            ? error.details.currentContentVersion
            : null;
        if (typeof currentContentVersion === "number") {
          setVersion(currentContentVersion);
        } else {
          void getOwnerPage(pageId).then((page) =>
            setVersion(page.contentVersion),
          );
        }
      }
      setLastFailedAction("reorder");
      setFeedback(
        error.message ||
          "We could not save the question order. Retry to keep it.",
        "error",
      );
    },
  });

  function saveQuestion(): void {
    if (readOnly) return;

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
    if (readOnly) return;

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
      setChoices((current) =>
        current.length >= 2 ? current : initialChoices(),
      );
    }
  }

  function changeChoice(index: number, patch: Partial<ChoiceDraft>): void {
    setChoices((current) =>
      current.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, ...patch } : choice,
      ),
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
    if (readOnly) return;

    if (window.confirm("Delete this question?")) {
      deleteMutation.mutate({
        questionId: question.id,
        confirmResponseDeletion: false,
      });
    }
  }

  return (
    <section
      className={styles.editorPanel}
      aria-labelledby="question-editor-title"
    >
      <div className={styles.editorHeading}>
        <div>
          <p className={styles.editorEyebrow}>Questions</p>
          <h2 id="question-editor-title" className={styles.editorTitle}>
            Questions visitors will see
          </h2>
          <p className={styles.editorDescription}>
            {readOnly
              ? "Published questions are locked until this letter is unpublished."
              : "Drag and drop to reorder."}
          </p>
        </div>
      </div>

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
          className={`mt-5 rounded-medium border p-4 text-small ${messageKind === "error" ? "border-error bg-surface text-error" : "border-border bg-surface-muted text-ink"}`}
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
          {messageKind === "error" && lastFailedAction === "reorder" ? (
            <button
              type="button"
              className="mt-3 min-h-11 rounded-small border border-error px-3 py-2 font-bold text-error hover:bg-surface"
              onClick={() =>
                reorderMutation.mutate(
                  lastReorderIds ?? questions.map((question) => question.id),
                )
              }
              disabled={reorderMutation.isPending}
            >
              Retry reorder
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <QuestionList
          questions={questions}
          editor={
            !readOnly && (editingId || isCreating)
              ? {
                  editingId,
                  isCreating,
                  draft: { type, prompt, choices },
                  isSaving: saveMutation.isPending,
                  canSave: !saveMutation.isPending,
                  onPromptChange: setPrompt,
                  onTypeChange: changeType,
                  onChoiceChange: changeChoice,
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
          onReorder={(questionIds) => {
            if (readOnly) return;
            setLastReorderIds(questionIds);
            reorderMutation.mutate(questionIds);
          }}
          readOnly={readOnly}
        />
      </div>
    </section>
  );
}
