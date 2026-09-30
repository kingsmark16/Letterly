"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  WebApiError,
} from "../../../lib/api-client";
import { QuestionList } from "./question-list";
import {
  QuestionFormDialog,
  type QuestionChoiceDraft,
  type QuestionFormType,
} from "./question-form-dialog";
import {
  MAX_EDITOR_CHOICE_LABEL_LENGTH,
  MAX_EDITOR_QUESTION_PROMPT_LENGTH,
} from "./question-limits";
import styles from "./question-editor.module.css";

interface QuestionEditorProps {
  pageId: string;
  savedVersion: number;
  onChanged: () => void;
  readOnly?: boolean;
}

type QuestionType = QuestionFormType;
type ChoiceDraft = QuestionChoiceDraft;

interface PendingQuestionRemoval {
  question: PageQuestion;
  returnToEditor: boolean;
  requiresResponseDeletionConfirmation: boolean;
}

interface ReorderVariables {
  questionIds: string[];
  startingOrder: string[];
}

interface ReorderResult {
  questionIds: string[];
  contentVersion: number;
  alreadySaved?: boolean;
}

interface ReorderContext {
  previous: PageQuestion[] | undefined;
}

class QuestionOrderChangedError extends Error {
  constructor(
    readonly questions: PageQuestion[],
    readonly contentVersion: number,
  ) {
    super(
      "The question list changed elsewhere. We loaded the latest order; reorder it again to apply your changes.",
    );
    this.name = "QuestionOrderChangedError";
  }
}

function sortQuestions(questions: PageQuestion[]): PageQuestion[] {
  return [...questions].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
}

function getQuestionIds(questions: PageQuestion[]): string[] {
  return sortQuestions(questions).map((question) => question.id);
}

function hasSameOrder(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}

function staleVersion(error: WebApiError): number | null {
  const currentContentVersion =
    error.details && "currentContentVersion" in error.details
      ? error.details.currentContentVersion
      : null;
  return typeof currentContentVersion === "number"
    ? currentContentVersion
    : null;
}

function emptyChoice(): ChoiceDraft {
  return { label: "" };
}

function initialChoices(): ChoiceDraft[] {
  const first = emptyChoice();
  return [first, emptyChoice()];
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
  const [pendingRemoval, setPendingRemoval] =
    useState<PendingQuestionRemoval | null>(null);
  const [isConfirmingSaveImpact, setIsConfirmingSaveImpact] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [localVersion, setLocalVersion] = useState({
    pageId,
    value: savedVersion,
  });
  const version =
    localVersion.pageId === pageId
      ? Math.max(savedVersion, localVersion.value)
      : savedVersion;
  const [lastFailedAction, setLastFailedAction] = useState<
    "save" | "reorder" | null
  >(null);
  const [lastReorderIds, setLastReorderIds] = useState<string[] | null>(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const questions = useMemo(
    () => sortQuestions(questionsQuery.data ?? []),
    [questionsQuery.data],
  );
  const choicesValid =
    choices.length >= 2 && choices.every((choice) => choice.label.trim());

  function advanceVersion(nextVersion: number): void {
    setLocalVersion((current) =>
      current.pageId === pageId
        ? { pageId, value: Math.max(current.value, nextVersion) }
        : { pageId, value: Math.max(savedVersion, nextVersion) },
    );
  }

  async function refreshQuestionOrder(): Promise<{
    questions: PageQuestion[];
    contentVersion: number;
  }> {
    const [page, latestQuestions] = await Promise.all([
      getOwnerPage(pageId),
      listPageQuestions(pageId),
    ]);
    const orderedQuestions = sortQuestions(latestQuestions);
    const contentVersion = Math.max(page.contentVersion, version);
    queryClient.setQueryData(["questions", pageId], orderedQuestions);
    advanceVersion(contentVersion);
    return { questions: orderedQuestions, contentVersion };
  }

  function setFeedback(nextMessage: string, kind: "status" | "error"): void {
    setMessage(nextMessage);
    setMessageKind(kind);
  }

  function resetForm(): void {
    setPendingRemoval(null);
    setIsConfirmingSaveImpact(false);
    setEditingId(null);
    setIsCreating(false);
    setType("CHOICE");
    setPrompt("");
    setChoices(initialChoices());
  }

  function editQuestion(question: PageQuestion): void {
    if (readOnly) return;

    setPendingRemoval(null);
    setIsConfirmingSaveImpact(false);
    setIsCreating(false);
    setEditingId(question.id);
    setType(question.type);
    setPrompt(question.prompt);
    setChoices(
      question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        creatorMessage: choice.creatorMessage,
      })),
    );
    setMessage(null);
  }

  const saveMutation = useMutation({
    mutationFn: async (confirmResponseDeletion: boolean) => {
      const commonQuestionInput = {
        type,
        prompt,
      };
      if (editingId) {
        const input: UpdatePageQuestionRequest = {
          ...commonQuestionInput,
          ...(type === "CHOICE"
            ? {
                choices: choices.map((choice) => ({
                  ...(choice.id ? { id: choice.id } : {}),
                  label: choice.label,
                  creatorMessage: choice.creatorMessage ?? null,
                })),
              }
            : {}),
          expectedContentVersion: version,
          confirmResponseDeletion,
        };
        return updatePageQuestion(pageId, editingId, input);
      }
      const input: CreatePageQuestionRequest = {
        ...commonQuestionInput,
        ...(type === "CHOICE"
          ? {
              choices: choices.map((choice) => ({
                label: choice.label,
                creatorMessage: choice.creatorMessage ?? null,
              })),
            }
          : {}),
        expectedContentVersion: version,
      };
      return createPageQuestion(pageId, input);
    },
    onSuccess: (result) => {
      advanceVersion(result.contentVersion);
      setLastFailedAction(null);
      setLastReorderIds(null);
      setFeedback(
        editingId
          ? "Question saved."
          : questions.length === 0
            ? "First question added. It will appear first in the letter."
            : "",
        "status",
      );
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError, confirmedResponseDeletion: boolean) => {
      if (error.code === "RESPONSE_IMPACT" && !confirmedResponseDeletion) {
        setIsConfirmingSaveImpact(true);
        setMessage(null);
        return;
      }
      setIsConfirmingSaveImpact(false);
      if (error.code === "STALE_VERSION") {
        const currentContentVersion = staleVersion(error);
        if (currentContentVersion !== null) {
          advanceVersion(currentContentVersion);
        } else {
          void getOwnerPage(pageId)
            .then((page) => advanceVersion(page.contentVersion))
            .catch(() => undefined);
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
      advanceVersion(result.contentVersion);
      setFeedback(
        "Question deleted. The remaining questions stay in order.",
        "status",
      );
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError, variables) => {
      if (
        error.code === "RESPONSE_IMPACT" &&
        !variables.confirmResponseDeletion
      ) {
        setPendingRemoval((current) =>
          current
            ? { ...current, requiresResponseDeletionConfirmation: true }
            : current,
        );
        setMessage(null);
        return;
      }
      setFeedback(error.message, "error");
    },
  });

  const reorderMutation = useMutation<
    ReorderResult,
    Error,
    ReorderVariables,
    ReorderContext
  >({
    mutationFn: async ({ questionIds, startingOrder }) => {
      try {
        return await reorderPageQuestions(pageId, {
          questionIds,
          expectedContentVersion: Math.max(version, savedVersion),
        });
      } catch (error) {
        if (!(error instanceof WebApiError) || error.code !== "STALE_VERSION") {
          throw error;
        }

        let latest: Awaited<ReturnType<typeof refreshQuestionOrder>>;
        try {
          latest = await refreshQuestionOrder();
        } catch {
          throw error;
        }

        const currentVersion = Math.max(
          latest.contentVersion,
          staleVersion(error) ?? 0,
        );
        advanceVersion(currentVersion);
        const currentIds = getQuestionIds(latest.questions);

        if (hasSameOrder(currentIds, questionIds)) {
          return {
            questionIds: currentIds,
            contentVersion: currentVersion,
            alreadySaved: true,
          };
        }

        if (!hasSameOrder(currentIds, startingOrder)) {
          throw new QuestionOrderChangedError(latest.questions, currentVersion);
        }

        try {
          return await reorderPageQuestions(pageId, {
            questionIds,
            expectedContentVersion: currentVersion,
          });
        } catch (retryError) {
          if (
            !(retryError instanceof WebApiError) ||
            retryError.code !== "STALE_VERSION"
          ) {
            throw retryError;
          }

          let newest: Awaited<ReturnType<typeof refreshQuestionOrder>>;
          try {
            newest = await refreshQuestionOrder();
          } catch {
            throw retryError;
          }

          const newestVersion = Math.max(
            newest.contentVersion,
            staleVersion(retryError) ?? 0,
          );
          advanceVersion(newestVersion);
          const newestIds = getQuestionIds(newest.questions);

          if (hasSameOrder(newestIds, questionIds)) {
            return {
              questionIds: newestIds,
              contentVersion: newestVersion,
              alreadySaved: true,
            };
          }

          throw new QuestionOrderChangedError(newest.questions, newestVersion);
        }
      }
    },
    onMutate: async ({ questionIds }) => {
      await queryClient.cancelQueries({ queryKey: ["questions", pageId] });
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
      setLastFailedAction(null);
      setFeedback("Saving question order…", "status");
      return { previous };
    },
    onSuccess: (result) => {
      advanceVersion(result.contentVersion);
      setLastFailedAction(null);
      setLastReorderIds(null);
      setFeedback(
        result.alreadySaved
          ? "That question order was already saved."
          : "Question order saved.",
        "status",
      );
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error, variables, context) => {
      if (error instanceof QuestionOrderChangedError) {
        queryClient.setQueryData(["questions", pageId], error.questions);
        advanceVersion(error.contentVersion);
        setLastFailedAction(null);
        setLastReorderIds(null);
        setFeedback(error.message, "status");
        onChanged();
        return;
      }

      if (context?.previous) {
        queryClient.setQueryData(["questions", pageId], context.previous);
      }
      const isStale =
        error instanceof WebApiError && error.code === "STALE_VERSION";
      if (isStale) {
        const currentContentVersion = staleVersion(error);
        if (currentContentVersion !== null) {
          advanceVersion(currentContentVersion);
        }
        void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      }
      setLastFailedAction("reorder");
      setLastReorderIds(variables.questionIds);
      setFeedback(
        isStale
          ? "This page has newer changes, but we couldn't refresh its questions. Try again."
          : error.message ||
              "We couldn't save the question order. Your previous order was restored.",
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
    if (prompt.length > MAX_EDITOR_QUESTION_PROMPT_LENGTH) {
      setFeedback(
        `Keep the question to ${MAX_EDITOR_QUESTION_PROMPT_LENGTH} characters or fewer.`,
        "error",
      );
      return;
    }
    if (type === "CHOICE" && !choicesValid) {
      setFeedback("Add at least two choices, each with a label.", "error");
      return;
    }
    if (
      type === "CHOICE" &&
      choices.some(
        (choice) => choice.label.length > MAX_EDITOR_CHOICE_LABEL_LENGTH,
      )
    ) {
      setFeedback(
        `Keep each choice to ${MAX_EDITOR_CHOICE_LABEL_LENGTH} characters or fewer.`,
        "error",
      );
      return;
    }
    setLastFailedAction(null);
    saveMutation.mutate(false);
  }

  function beginNewQuestion(): void {
    if (readOnly) return;
    if (questions.length >= 100) {
      setFeedback("This letter can contain at most 100 questions.", "error");
      return;
    }

    resetForm();
    setIsCreating(true);
    setMessage(null);
  }

  function closeEditor(): void {
    if (saveMutation.isPending || deleteMutation.isPending) return;
    setPendingRemoval(null);
    setIsConfirmingSaveImpact(false);
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
    setChoices((current) => [...current, emptyChoice()]);
  }

  function removeChoice(index: number): void {
    setChoices((current) =>
      current.filter((_, choiceIndex) => choiceIndex !== index),
    );
  }

  function deleteQuestion(
    question: PageQuestion,
    returnToEditor = false,
  ): void {
    if (readOnly) return;

    setIsConfirmingSaveImpact(false);
    if (!returnToEditor) {
      setIsCreating(false);
      setEditingId(question.id);
      setType(question.type);
      setPrompt(question.prompt);
      setChoices(
        question.choices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          creatorMessage: choice.creatorMessage,
        })),
      );
    }
    setMessage(null);
    setPendingRemoval({
      question,
      returnToEditor,
      requiresResponseDeletionConfirmation: false,
    });
  }

  function confirmQuestionRemoval(): void {
    if (!pendingRemoval || readOnly) return;
    deleteMutation.mutate({
      questionId: pendingRemoval.question.id,
      confirmResponseDeletion:
        pendingRemoval.requiresResponseDeletionConfirmation,
    });
  }

  function confirmSaveWithResponseDeletion(): void {
    if (readOnly || saveMutation.isPending) return;
    saveMutation.mutate(true);
  }

  function cancelSaveWithResponseDeletion(): void {
    setIsConfirmingSaveImpact(false);
    setMessage(null);
  }

  function cancelQuestionRemoval(): void {
    const returnToEditor = pendingRemoval?.returnToEditor ?? false;
    setPendingRemoval(null);
    setMessage(null);
    if (!returnToEditor) closeEditor();
  }

  const isFormOpen = !readOnly && Boolean(editingId || isCreating);
  const editingQuestion = questions.find(
    (question) => question.id === editingId,
  );

  function retryReorder(): void {
    const questionIds = lastReorderIds ?? getQuestionIds(questions);
    reorderMutation.mutate({
      questionIds,
      startingOrder: getQuestionIds(questions),
    });
  }

  const feedback = message ? (
    <div
      className={styles.feedback}
      data-kind={messageKind}
      role={messageKind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className={styles.feedbackMark} aria-hidden="true" />
      <p className={styles.feedbackMessage}>{message}</p>
      {messageKind === "error" ? (
        <div className={styles.feedbackActions}>
          {lastFailedAction === "save" ? (
            <button
              type="button"
              className={styles.feedbackAction}
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
            >
              Retry save
            </button>
          ) : null}
          {lastFailedAction === "reorder" ? (
            <button
              type="button"
              className={styles.feedbackAction}
              onClick={retryReorder}
              disabled={reorderMutation.isPending}
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <section
      className={styles.editorPanel}
      aria-labelledby="question-editor-title"
    >
      <div className={styles.editorHeading}>
        <div className={styles.sectionHeading}>
          <div>
            <div className={styles.titleRow}>
              <h2 id="question-editor-title" className={styles.editorTitle}>
                Questions
              </h2>
              <span className={styles.optional}>(optional)</span>
            </div>
            <p className={styles.editorDescription}>
              {readOnly
                ? "Published questions are locked until this letter is unpublished."
                : questions.length > 1
                  ? "Drag questions to change their order."
                  : "Ask something your reader can answer privately."}
            </p>
          </div>
        </div>
      </div>

      {questionsQuery.isPending ? (
        <p className="mt-3 text-small text-ink-muted" aria-busy="true">
          Loading questions...
        </p>
      ) : null}
      {questionsQuery.isError ? (
        <p className="mt-3 text-small text-error" role="alert">
          {(questionsQuery.error as WebApiError).message}
        </p>
      ) : null}

      {!isFormOpen ? feedback : null}

      <div>
        <QuestionList
          questions={questions}
          onEdit={editQuestion}
          onDelete={deleteQuestion}
          onAddQuestion={beginNewQuestion}
          onReorder={(questionIds) => {
            if (readOnly || reorderMutation.isPending) return;
            const startingOrder = getQuestionIds(questions);
            if (hasSameOrder(questionIds, startingOrder)) return;
            setLastReorderIds(questionIds);
            reorderMutation.mutate({ questionIds, startingOrder });
          }}
          readOnly={readOnly}
          isReordering={reorderMutation.isPending}
        />
      </div>
      {isFormOpen ? (
        <QuestionFormDialog
          editor={{
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
          }}
          feedback={feedback}
          isRemoving={deleteMutation.isPending}
          saveImpactConfirmation={isConfirmingSaveImpact}
          onConfirmSaveImpact={confirmSaveWithResponseDeletion}
          onCancelSaveImpact={cancelSaveWithResponseDeletion}
          removal={
            pendingRemoval
              ? {
                  prompt: pendingRemoval.question.prompt,
                  requiresResponseDeletionConfirmation:
                    pendingRemoval.requiresResponseDeletionConfirmation,
                  returnToEditor: pendingRemoval.returnToEditor,
                }
              : null
          }
          onConfirmRemoval={confirmQuestionRemoval}
          onCancelRemoval={cancelQuestionRemoval}
          onRemove={
            editingQuestion
              ? () => deleteQuestion(editingQuestion, true)
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
