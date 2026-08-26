"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { QuestionFlowCanvas } from "./question-flow-canvas";

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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"status" | "error">("status");
  const [version, setVersion] = useState(savedVersion);
  const [lastFailedAction, setLastFailedAction] = useState<"save" | null>(null);
  const [inlineErrorQuestionId, setInlineErrorQuestionId] = useState<
    string | null
  >(null);
  const questionPromptRef = useRef<HTMLTextAreaElement>(null);

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
    setChoices(initialChoices());
    setInlineErrorQuestionId(null);
  }

  function editQuestion(question: PageQuestion): void {
    setIsEditorOpen(true);
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
    window.requestAnimationFrame(() => questionPromptRef.current?.focus());
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
      setIsEditorOpen(false);
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
      setIsEditorOpen(false);
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
    setIsEditorOpen(true);
    setMessage(null);
    window.requestAnimationFrame(() => questionPromptRef.current?.focus());
  }

  function closeEditor(): void {
    if (saveMutation.isPending) return;
    resetForm();
    setIsEditorOpen(false);
    setMessage(null);
    setLastFailedAction(null);
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
          questions={questions}
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

      {isEditorOpen ? (
        <div
          className="mt-6 rounded-large border border-border bg-surface-muted p-5"
          role="dialog"
          aria-modal="false"
          aria-labelledby="question-form-title"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label font-bold uppercase tracking-[0.1em] text-wine">
                {editingId
                  ? "Edit question"
                  : questions.length === 0
                    ? "Create base question"
                    : "Add a question"}
              </p>
              <h3 id="question-form-title" className="sr-only">
                {editingId ? "Edit question" : "Add a question"}
              </h3>
              <p className="mt-1 text-small text-ink-muted">
                The question number, position, and internal key are created
                automatically.
              </p>
            </div>
            <button
              className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
              type="button"
              onClick={closeEditor}
            >
              Cancel
            </button>
          </div>

          <form className="mt-4 space-y-4" onSubmit={submit}>
            <label className="block space-y-2 text-small font-bold text-ink">
              What should visitors answer?
              <textarea
                ref={questionPromptRef}
                className="mt-1 min-h-20 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                aria-describedby="question-prompt-help"
              />
              <span
                id="question-prompt-help"
                className="block font-normal text-ink-muted"
              >
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
                      current.length >= 2 ? current : initialChoices(),
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
                <legend className="text-small font-bold text-ink">
                  Answer choices and next steps
                </legend>
                {choices.map((choice, index) => (
                  <div
                    className="rounded-medium border border-border bg-surface p-3"
                    key={choice.key}
                  >
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
                          className="mt-6 min-h-11 rounded-small border border-border px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                          type="button"
                          onClick={() =>
                            setChoices((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
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
                        value={destinationValue(
                          choice.nextQuestionId,
                          choice.endsJourney,
                        )}
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
                        <option value={CONTINUE_VALUE}>
                          Continue in order
                        </option>
                        <option value={FINISH_VALUE}>Finish the journey</option>
                        {destinationOptions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {describeQuestion(
                              question,
                              questions.indexOf(question),
                            )}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ))}
                {choices.length < 10 ? (
                  <button
                    className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold hover:border-wine hover:text-wine"
                    type="button"
                    onClick={() =>
                      setChoices((current) => [
                        ...current,
                        emptyChoice(current.map((choice) => choice.key)),
                      ])
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
              Editing “{currentQuestion.prompt}”. Changes that affect existing
              responses ask for confirmation.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
