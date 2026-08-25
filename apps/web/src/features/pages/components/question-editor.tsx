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

type QuestionType = "CHOICE" | "PLAIN_MESSAGE";
type ChoiceDraft = {
  key: string;
  label: string;
  nextQuestionId: string | null;
  endsJourney: boolean;
};

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

const emptyChoice = (index: number): ChoiceDraft => ({
  key: `choice-${index + 1}`,
  label: "",
  nextQuestionId: null,
  endsJourney: false,
});

function destinationValue(
  nextQuestionId: string | null,
  endsJourney: boolean,
): string {
  if (endsJourney) return FINISH_VALUE;
  return nextQuestionId ?? CONTINUE_VALUE;
}

function describeQuestion(question: PageQuestion, index: number): string {
  return `Question ${index + 1}: ${question.prompt}`;
}

function describeDestination(
  nextQuestionId: string | null,
  endsJourney: boolean,
  questions: PageQuestion[],
  editingId: string | null,
): string {
  if (endsJourney) return "Finish the journey";
  if (!nextQuestionId) return "Continue in order";
  const target = questions.find(
    (question) => question.id === nextQuestionId && question.id !== editingId,
  );
  return target ? `Go to “${target.prompt}”` : "Choose a valid next question";
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
  const [choices, setChoices] = useState<ChoiceDraft[]>([
    emptyChoice(0),
    emptyChoice(1),
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [version, setVersion] = useState(savedVersion);
  const [lastFailedAction, setLastFailedAction] = useState<"save" | null>(
    null,
  );
  const [inlineErrorQuestionId, setInlineErrorQuestionId] = useState<
    string | null
  >(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const questions = useMemo(
    () => [...(questionsQuery.data ?? [])].sort((a, b) =>
      a.displayOrder === b.displayOrder
        ? a.id.localeCompare(b.id)
        : a.displayOrder - b.displayOrder,
    ),
    [questionsQuery.data],
  );
  const currentQuestion = useMemo(
    () => questions.find((question) => question.id === editingId) ?? null,
    [editingId, questions],
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
    setType("CHOICE");
    setPrompt("");
    setNextQuestionId(null);
    setEndsJourney(false);
    setChoices([emptyChoice(0), emptyChoice(1)]);
    setInlineErrorQuestionId(null);
  }

  function editQuestion(question: PageQuestion): void {
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
      const questionOrder = currentQuestion?.displayOrder ?? questions.length;
      if (editingId) {
        const input: UpdatePageQuestionRequest = {
          type,
          prompt,
          displayOrder: questionOrder,
          endsJourney: type === "PLAIN_MESSAGE" ? endsJourney : false,
          nextQuestionId:
            type === "PLAIN_MESSAGE" && !endsJourney
              ? nextQuestionId
              : null,
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
        displayOrder: questions.length,
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
          : "Question added to the end of the journey.",
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
      setLastFailedAction("save");
      setInlineErrorQuestionId(editingId);
      setFeedback(
        error.code === "QUESTION_REFERENCED"
          ? "This question is used by another answer. Redirect that answer before deleting it."
          : error.message || "We could not save this question. Your edits are still here.",
        "error",
      );
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
      setFeedback(
        "Questions reordered. Continue in order now follows this new order; named branches stay connected.",
        "status",
      );
      void queryClient.invalidateQueries({ queryKey: ["questions", pageId] });
      onChanged();
    },
    onError: (error: WebApiError) => {
      setFeedback(error.message, "error");
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
      setFeedback("Question deleted.", "status");
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

  function submit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!prompt.trim()) {
      setFeedback("Add a prompt before saving this question.", "error");
      return;
    }
    if (type === "CHOICE" && !choicesValid) {
      setFeedback("Add at least two answer choices, each with a label.", "error");
      return;
    }
    setLastFailedAction(null);
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

  const destinationOptions = questions.filter(
    (question) => question.id !== editingId,
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
            Build a simple journey one question at a time. New questions are
            added in order, and each answer can continue, branch to a named
            question, or finish the journey.
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

      <aside className="mt-5 rounded-medium border border-rose bg-rose/20 p-4 text-small text-ink" aria-labelledby="branching-help-title">
        <h3 id="branching-help-title" className="font-bold text-wine">
          How branching works
        </h3>
        <p className="mt-1 leading-relaxed">
          Continue in order shows the next question in this list. Go to a
          question creates a named branch. Finish the journey stops questions
          and opens the private response area. Reordering changes only the
          automatic path, never a named branch.
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
              className="mt-3 min-h-10 rounded-small border border-error px-3 py-2 font-bold text-error hover:bg-surface"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
            >
              Retry save
            </button>
          ) : null}
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="mt-5 grid gap-4" aria-label="Question list">
          <ul className="space-y-3">
            {questions.map((question, index) => (
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
                className="rounded-medium border border-border bg-surface-muted p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-1 cursor-grab text-ink-muted" aria-hidden="true">
                      ⋮⋮
                    </span>
                    <div className="min-w-0">
                      <p className="text-label font-bold uppercase tracking-[0.1em] text-wine">
                        Question {index + 1} · {question.type === "CHOICE" ? "Choose one" : "Written answer"}
                      </p>
                      <h3 className="mt-1 text-base font-bold text-ink">
                        {question.prompt}
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={reorderMutation.isPending || index === 0}
                      onClick={() => moveQuestion(question.id, -1)}
                      aria-label={`Move ${question.prompt} up`}
                    >
                      ↑
                    </button>
                    <button
                      className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={
                        reorderMutation.isPending || index === questions.length - 1
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
                        if (window.confirm("Delete this question?")) {
                          deleteMutation.mutate({
                            questionId: question.id,
                            confirmResponseDeletion: false,
                          });
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-small text-ink-muted sm:grid-cols-2">
                  {question.type === "CHOICE" ? (
                    question.choices.map((choice) => (
                      <p key={choice.id} className="rounded-small bg-surface px-3 py-2">
                        <span className="font-bold text-ink">{choice.label}</span>
                        <span className="ml-2">→ {describeDestination(choice.nextQuestionId, choice.endsJourney, questions, question.id)}</span>
                      </p>
                    ))
                  ) : (
                    <p className="rounded-small bg-surface px-3 py-2 sm:col-span-2">
                      Answer → {describeDestination(question.nextQuestionId, question.endsJourney, questions, question.id)}
                    </p>
                  )}
                </div>
                {inlineErrorQuestionId === question.id ? (
                  <p className="mt-3 text-small text-error" role="alert">
                    Redirect the answer that points here before deleting this question.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="rounded-medium border border-border bg-surface p-4">
            <h3 className="text-small font-bold text-ink">Journey preview</h3>
            <ol className="mt-3 space-y-2 text-small text-ink-muted">
              {questions.map((question, index) => (
                <li key={question.id}>
                  <span className="font-bold text-ink">{index + 1}. {question.prompt}</span>
                  <span className="ml-2">({question.type === "CHOICE" ? "answers choose the next step" : describeDestination(question.nextQuestionId, question.endsJourney, questions, question.id)})</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-medium border border-border bg-surface-muted p-5 text-small text-ink-muted">
          <p className="font-bold text-ink">Your journey is empty.</p>
          <p className="mt-1">Try a warm first question such as “What do you remember most?” with answers like “The happy moments” and “The quiet moments.”</p>
        </div>
      )}

      <form
        className="mt-6 space-y-4 rounded-large border border-border bg-surface-muted p-5"
        onSubmit={submit}
      >
        <div>
          <p className="text-label font-bold uppercase tracking-[0.1em] text-wine">
            {editingId ? "Edit question" : "Add a question"}
          </p>
          <p className="mt-1 text-small text-ink-muted">
            The question number and internal key are created automatically.
          </p>
        </div>

        <label className="block space-y-2 text-small font-bold text-ink">
          What should visitors answer?
          <textarea
            className="mt-1 min-h-20 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            aria-describedby="question-prompt-help"
          />
          <span id="question-prompt-help" className="block font-normal text-ink-muted">
            Keep it personal and easy to understand.
          </span>
        </label>

        <label className="block space-y-2 text-small font-bold text-ink sm:max-w-xs">
          Answer style
          <select
            className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
            value={type}
            onChange={(event) => {
              const nextType = event.target.value as QuestionType;
              setType(nextType);
              if (nextType === "CHOICE") {
                setEndsJourney(false);
                setNextQuestionId(null);
                setChoices((current) =>
                  current.length >= 2
                    ? current
                    : [emptyChoice(0), emptyChoice(1)],
                );
              }
            }}
          >
            <option value="CHOICE">Choose one answer</option>
            <option value="PLAIN_MESSAGE">Write an answer</option>
          </select>
        </label>

        {type === "PLAIN_MESSAGE" ? (
          <label className="block space-y-2 text-small font-bold text-ink">
            After they answer
            <select
              className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
              value={destinationValue(nextQuestionId, endsJourney)}
              onChange={(event) =>
                applyDestination(
                  event.target.value,
                  setNextQuestionId,
                  setEndsJourney,
                )
              }
            >
              <option value={CONTINUE_VALUE}>Continue in order</option>
              <option value={FINISH_VALUE}>Finish the journey</option>
              {destinationOptions.map((question) => (
                <option key={question.id} value={question.id}>
                  {describeQuestion(question, questions.indexOf(question))}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <fieldset className="space-y-3">
            <legend className="text-small font-bold text-ink">Answer choices and next steps</legend>
            {choices.map((choice, index) => (
              <div className="rounded-medium border border-border bg-surface p-3" key={`${choice.key}-${index}`}>
                <div className="flex items-start gap-2">
                  <label className="min-w-0 flex-1 text-small font-bold text-ink">
                    Answer {index + 1}
                    <input
                      className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface-muted px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
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
                      placeholder={`Answer ${index + 1}`}
                      aria-label={`Answer ${index + 1} label`}
                    />
                  </label>
                  {choices.length > 2 ? (
                    <button
                      className="mt-6 min-h-10 rounded-small border border-border px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                      type="button"
                      onClick={() =>
                        setChoices((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      aria-label={`Remove answer ${index + 1}`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <label className="mt-3 block text-small font-bold text-ink">
                  Then
                  <select
                    className="mt-1 min-h-11 w-full rounded-small border border-border bg-surface-muted px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                    value={destinationValue(choice.nextQuestionId, choice.endsJourney)}
                    onChange={(event) =>
                      setChoices((current) =>
                        current.map((item, itemIndex) => {
                          if (itemIndex !== index) return item;
                          let nextQuestion: string | null = null;
                          let finish = false;
                          applyDestination(
                            event.target.value,
                            (target) => {
                              nextQuestion = target;
                            },
                            (value) => {
                              finish = value;
                            },
                          );
                          return {
                            ...item,
                            nextQuestionId: nextQuestion,
                            endsJourney: finish,
                          };
                        }),
                      )
                    }
                    aria-label={`Answer ${index + 1} next step`}
                  >
                    <option value={CONTINUE_VALUE}>Continue in order</option>
                    <option value={FINISH_VALUE}>Finish the journey</option>
                    {destinationOptions.map((question) => (
                      <option key={question.id} value={question.id}>
                        {describeQuestion(question, questions.indexOf(question))}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
            {choices.length < 10 ? (
              <button
                className="min-h-10 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                type="button"
                onClick={() =>
                  setChoices((current) => [...current, emptyChoice(current.length)])
                }
              >
                Add another answer
              </button>
            ) : null}
          </fieldset>
        )}

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
          Editing “{currentQuestion.prompt}”. Changes that affect existing responses ask for confirmation.
        </p>
      ) : null}
    </section>
  );
}
