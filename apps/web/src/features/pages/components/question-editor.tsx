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
  listPageQuestions,
  updatePageQuestion,
  type WebApiError,
} from "../../../lib/api-client";

interface QuestionEditorProps {
  pageId: string;
  savedVersion: number;
  onChanged: () => void;
}

type ChoiceDraft = {
  key: string;
  label: string;
  nextQuestionId: string | null;
};

function generatedQuestionKey(prompt: string): string {
  const readablePrompt = prompt
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const readablePart = readablePrompt || "question";
  return `question-${readablePart}-${crypto.randomUUID().slice(0, 8)}`;
}

const emptyChoice = (index: number): ChoiceDraft => ({
  key: `choice-${index + 1}`,
  label: "",
  nextQuestionId: null,
});

export function QuestionEditor({
  pageId,
  savedVersion,
  onChanged,
}: QuestionEditorProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"CHOICE" | "PLAIN_MESSAGE">("CHOICE");
  const [prompt, setPrompt] = useState("");
  const [nextQuestionId, setNextQuestionId] = useState<string | null>(null);
  const [choices, setChoices] = useState<ChoiceDraft[]>([
    emptyChoice(0),
    emptyChoice(1),
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(savedVersion);
  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const questions = useMemo(
    () => questionsQuery.data ?? [],
    [questionsQuery.data],
  );
  const choicesValid =
    choices.length >= 2 && choices.every((choice) => choice.label.trim());
  const currentQuestion = useMemo(
    () => questions.find((question) => question.id === editingId) ?? null,
    [editingId, questions],
  );

  useEffect(() => setVersion(savedVersion), [savedVersion]);

  function resetForm(): void {
    setEditingId(null);
    setType("CHOICE");
    setPrompt("");
    setNextQuestionId(null);
    setChoices([emptyChoice(0), emptyChoice(1)]);
  }

  function editQuestion(question: PageQuestion): void {
    setEditingId(question.id);
    setType(question.type);
    setPrompt(question.prompt);
    setNextQuestionId(question.nextQuestionId);
    setChoices(
      question.choices.map((choice) => ({
        key: choice.key,
        label: choice.label,
        nextQuestionId: choice.nextQuestionId,
      })),
    );
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
      const input = {
        type,
        prompt,
        displayOrder: editingId
          ? (questions.find((question) => question.id === editingId)
              ?.displayOrder ?? 0)
          : questions.length,
        nextQuestionId: type === "PLAIN_MESSAGE" ? nextQuestionId : null,
        choices:
          type === "CHOICE"
            ? choices.map((choice, index) => ({
                ...choice,
                displayOrder: index,
                nextQuestionId: choice.nextQuestionId,
              }))
            : undefined,
        expectedContentVersion: version,
        confirmResponseDeletion,
      } as UpdatePageQuestionRequest;
      if (editingId) return updatePageQuestion(pageId, editingId, input);
      return createPageQuestion(pageId, {
        key: generatedQuestionKey(prompt),
        type,
        prompt,
        displayOrder: questions.length,
        nextQuestionId: type === "PLAIN_MESSAGE" ? nextQuestionId : null,
        choices:
          type === "CHOICE"
            ? choices.map((choice, index) => ({
                ...choice,
                displayOrder: index,
              }))
            : undefined,
        config: null,
      } as CreatePageQuestionRequest);
    },
    onSuccess: (result) => {
      setVersion(result.contentVersion);
      setMessage("Question saved.");
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError) => {
      if (responseImpactConfirmed(error)) {
        saveMutation.mutate(true);
        return;
      }
      setMessage(error.message);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedQuestions: PageQuestion[]) => {
      let expectedContentVersion = version;

      for (const [displayOrder, question] of orderedQuestions.entries()) {
        if (question.displayOrder === displayOrder) continue;

        const result = await updatePageQuestion(pageId, question.id, {
          displayOrder,
          expectedContentVersion,
          confirmResponseDeletion: false,
        });
        expectedContentVersion = result.contentVersion;
      }

      return expectedContentVersion;
    },
    onSuccess: (contentVersion) => {
      setVersion(contentVersion);
      setMessage("Questions reordered.");
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError) => {
      setMessage(error.message);
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
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
      setMessage("Question deleted.");
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError, variables) => {
      if (responseImpactConfirmed(error)) {
        deleteMutation.mutate({ ...variables, confirmResponseDeletion: true });
        return;
      }
      setMessage(error.message);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!prompt.trim() || (type === "CHOICE" && !choicesValid)) {
      setMessage("Add a prompt and complete the required choices.");
      return;
    }
    saveMutation.mutate(false);
  }

  function reorderQuestions(nextQuestions: PageQuestion[]): void {
    if (reorderMutation.isPending) return;

    const normalizedQuestions = nextQuestions.map((question, index) => ({
      ...question,
      displayOrder: index,
    }));
    queryClient.setQueryData<PageQuestion[]>(
      ["questions", pageId],
      normalizedQuestions,
    );
    reorderMutation.mutate(nextQuestions);
  }

  function moveQuestion(questionId: string, offset: -1 | 1): void {
    const currentIndex = questions.findIndex(
      (question) => question.id === questionId,
    );
    const nextIndex = currentIndex + offset;
    if (
      currentIndex < 0 ||
      nextIndex < 0 ||
      nextIndex >= questions.length ||
      reorderMutation.isPending
    ) {
      return;
    }

    const nextQuestions = [...questions];
    const [movedQuestion] = nextQuestions.splice(currentIndex, 1);
    if (!movedQuestion) return;
    nextQuestions.splice(nextIndex, 0, movedQuestion);
    reorderQuestions(nextQuestions);
  }

  function dropQuestion(
    targetQuestionId: string,
    sourceQuestionId: string | null = draggedQuestionId,
  ): void {
    setDraggedQuestionId(null);
    if (!sourceQuestionId || sourceQuestionId === targetQuestionId) return;

    const sourceIndex = questions.findIndex(
      (question) => question.id === sourceQuestionId,
    );
    const targetIndex = questions.findIndex(
      (question) => question.id === targetQuestionId,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextQuestions = [...questions];
    const [movedQuestion] = nextQuestions.splice(sourceIndex, 1);
    if (!movedQuestion) return;
    nextQuestions.splice(targetIndex, 0, movedQuestion);
    reorderQuestions(nextQuestions);
  }

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
            Questions for visitors
          </h2>
          <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-muted">
            Add choice or written questions. New questions are added at the end;
            drag them or use the arrow controls to reorder them. Branches stay
            within this page and are checked before saving.
          </p>
        </div>
        {editingId ? (
          <button
            className="min-h-11 rounded-medium border border-border bg-surface px-4 py-3 text-small font-bold hover:border-wine hover:text-wine"
            type="button"
            onClick={resetForm}
          >
            Add new question
          </button>
        ) : null}
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
      {questions.length > 0 ? (
        <ul className="mt-5 space-y-2">
          {questions.map((question) => (
            <li
              key={question.id}
              draggable={!reorderMutation.isPending}
              onDragStart={(event) => {
                setDraggedQuestionId(question.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", question.id);
              }}
              onDragEnd={() => setDraggedQuestionId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                dropQuestion(
                  question.id,
                  event.dataTransfer.getData("text/plain") || null,
                );
              }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-medium border border-border bg-surface-muted px-4 py-3"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className="mt-1 cursor-grab text-ink-muted"
                  aria-hidden="true"
                >
                  ⋮⋮
                </span>
                <div>
                  <p className="text-small font-bold text-ink">
                    {question.prompt}
                  </p>
                  <p className="mt-1 text-label uppercase tracking-[0.1em] text-ink-muted">
                    {question.type === "CHOICE"
                      ? `${question.choices.length} choices`
                      : "Written answer"}{" "}
                    · position {question.displayOrder + 1}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={
                    reorderMutation.isPending || question.displayOrder === 0
                  }
                  onClick={() => moveQuestion(question.id, -1)}
                  aria-label={`Move ${question.prompt} up`}
                >
                  ↑
                </button>
                <button
                  className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={
                    reorderMutation.isPending ||
                    question.displayOrder === questions.length - 1
                  }
                  onClick={() => moveQuestion(question.id, 1)}
                  aria-label={`Move ${question.prompt} down`}
                >
                  ↓
                </button>
                <button
                  className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                  type="button"
                  onClick={() => editQuestion(question)}
                >
                  Edit
                </button>
                <button
                  className="min-h-10 rounded-small border border-error px-3 py-2 text-small font-bold text-error hover:bg-surface"
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this question?"))
                      deleteMutation.mutate({
                        questionId: question.id,
                        confirmResponseDeletion: false,
                      });
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">
          No questions yet. Add the first question below.
        </p>
      )}

      <form
        className="mt-6 space-y-4 rounded-large border border-border bg-surface-muted p-5"
        onSubmit={submit}
      >
        <p className="text-small text-ink-muted">
          Question keys are generated automatically from the prompt. New
          questions are placed after the current list.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-small font-bold text-ink">
            Question type
            <select
              className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
              value={type}
              onChange={(event) =>
                setType(event.target.value as "CHOICE" | "PLAIN_MESSAGE")
              }
            >
              <option value="CHOICE">Choice</option>
              <option value="PLAIN_MESSAGE">Written answer</option>
            </select>
          </label>
        </div>
        <label className="block space-y-2 text-small font-bold text-ink">
          Prompt
          <textarea
            className="mt-1 min-h-20 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        {type === "PLAIN_MESSAGE" ? (
          <label className="block space-y-2 text-small font-bold text-ink">
            Next question
            <select
              className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
              value={nextQuestionId ?? ""}
              onChange={(event) =>
                setNextQuestionId(event.target.value || null)
              }
            >
              <option value="">End this branch</option>
              {questions
                .filter((question) => question.id !== editingId)
                .map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.prompt}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          <div className="space-y-3">
            <p className="text-small font-bold text-ink">Choices</p>
            {choices.map((choice, index) => (
              <div
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                key={`${choice.key}-${index}`}
              >
                <input
                  className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                  value={choice.label}
                  onChange={(event) =>
                    setChoices((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={`Choice ${index + 1}`}
                  aria-label={`Choice ${index + 1} label`}
                />
                <select
                  className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                  value={choice.nextQuestionId ?? ""}
                  onChange={(event) =>
                    setChoices((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? {
                              ...item,
                              nextQuestionId: event.target.value || null,
                            }
                          : item,
                      ),
                    )
                  }
                  aria-label={`Choice ${index + 1} next question`}
                >
                  <option value="">End this branch</option>
                  {questions
                    .filter((question) => question.id !== editingId)
                    .map((question) => (
                      <option key={question.id} value={question.id}>
                        {question.prompt}
                      </option>
                    ))}
                </select>
                {choices.length > 2 ? (
                  <button
                    className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold"
                    type="button"
                    onClick={() =>
                      setChoices((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label={`Remove choice ${index + 1}`}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            {choices.length < 10 ? (
              <button
                className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                type="button"
                onClick={() =>
                  setChoices((current) => [
                    ...current,
                    emptyChoice(current.length),
                  ])
                }
              >
                Add choice
              </button>
            ) : null}
          </div>
        )}
        {message ? (
          <p className="text-small text-error" role="alert">
            {message}
          </p>
        ) : null}
        <button
          className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:opacity-60"
          type="submit"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving..."
            : editingId
              ? "Save question"
              : "Add question"}
        </button>
      </form>
      {currentQuestion ? (
        <p className="mt-3 text-label text-ink-muted">
          Editing “{currentQuestion.prompt}”. Changes that affect existing
          responses ask for confirmation.
        </p>
      ) : null}
    </section>
  );
}
