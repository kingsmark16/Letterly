"use client";

import {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";
import {
  DEFAULT_JOURNEY_COMPLETION_OUTCOME,
  isPageJourneyTextQuestion,
  isPlaceholderJourneyQuestion,
  normalizeLinearPageJourneyGraph,
  type PageJourneyGraph,
} from "@letterly/templates/journey";
import type { ReactNode } from "react";

export interface ChooseYourHeartLetterDraft {
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName: string;
}

interface ChooseYourHeartEditorProps {
  letter?: ChooseYourHeartLetterDraft;
  onLetterChange?: (letter: ChooseYourHeartLetterDraft) => void;
  graph: PageJourneyGraph;
  readOnly: boolean;
  isDirty: boolean;
  isSaving: boolean;
  refreshConflict: boolean;
  statusMessage: string;
  saveError: string | null;
  onGraphChange: (graph: PageJourneyGraph) => void;
  onSave: () => void;
  onReload: () => void;
  lifecycleControls: ReactNode;
}

const defaultLetterDraft: ChooseYourHeartLetterDraft = {
  title: "",
  recipientName: "",
  mainMessage: "",
  creatorName: "",
};

function createNodeKey(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export function ChooseYourHeartEditor({
  letter = defaultLetterDraft,
  onLetterChange,
  graph,
  readOnly,
  isDirty,
  isSaving,
  refreshConflict,
  statusMessage,
  saveError,
  onGraphChange,
  onSave,
  onReload,
  lifecycleControls,
}: ChooseYourHeartEditorProps): React.JSX.Element {
  const completionOutcome =
    graph.outcomes[0] ?? DEFAULT_JOURNEY_COMPLETION_OUTCOME;
  const visibleQuestions = graph.questions.filter(
    (question) => !isPlaceholderJourneyQuestion(question),
  );

  function updateLetterField(
    field: keyof ChooseYourHeartLetterDraft,
    value: string,
  ): void {
    if (readOnly || !onLetterChange) return;
    onLetterChange({
      ...letter,
      [field]: value,
    });
  }

  function setGraph(
    update: (current: PageJourneyGraph) => PageJourneyGraph,
  ): void {
    if (!readOnly) {
      onGraphChange(normalizeLinearPageJourneyGraph(update(graph)));
    }
  }

  function updateQuestionPrompt(index: number, prompt: string): void {
    if (readOnly) return;

    setGraph((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, prompt } : question,
      ),
    }));
  }

  function setQuestionType(
    questionIndex: number,
    kind: "choice" | "text",
  ): void {
    if (readOnly) return;

    setGraph((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        const currentlyText = isPageJourneyTextQuestion(question);
        if (kind === "text" && !currentlyText) {
          return {
            ...question,
            choices: [
              {
                key: question.choices[0]?.key ?? createNodeKey("text"),
                label: "Written answer",
                displayOrder: 0,
                nextQuestionKey: null,
                outcomeKey: completionOutcome.key,
              },
            ],
          };
        }
        if (kind === "choice" && currentlyText) {
          return {
            ...question,
            choices: [
              {
                key: createNodeKey("choice"),
                label: "Option 1",
                displayOrder: 0,
                nextQuestionKey: null,
                outcomeKey: completionOutcome.key,
              },
              {
                key: createNodeKey("choice"),
                label: "Option 2",
                displayOrder: 1,
                nextQuestionKey: null,
                outcomeKey: completionOutcome.key,
              },
            ],
          };
        }
        return question;
      }),
    }));
  }

  function updateChoice(
    questionIndex: number,
    choiceIndex: number,
    label: string,
  ): void {
    if (readOnly) return;

    setGraph((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          choices: question.choices.map((choice, currentChoiceIndex) =>
            currentChoiceIndex === choiceIndex ? { ...choice, label } : choice,
          ),
        };
      }),
    }));
  }

  function addQuestion(kind: "choice" | "text"): void {
    if (readOnly) return;

    setGraph((current) => {
      if (current.questions.length >= 12) return current;
      const newQuestion =
        kind === "text"
          ? {
              key: createNodeKey("question"),
              prompt: "Write your question here",
              displayOrder: current.questions.length,
              choices: [
                {
                  key: createNodeKey("text"),
                  label: "Written answer",
                  displayOrder: 0,
                  nextQuestionKey: null,
                  outcomeKey: completionOutcome.key,
                },
              ],
            }
          : {
              key: createNodeKey("question"),
              prompt: "Write your question here",
              displayOrder: current.questions.length,
              choices: [0, 1].map((choiceIndex) => ({
                key: createNodeKey("choice"),
                label: `Choice ${choiceIndex + 1}`,
                displayOrder: choiceIndex,
                nextQuestionKey: null,
                outcomeKey: completionOutcome.key,
              })),
            };
      return {
        ...current,
        questions: [...current.questions, newQuestion],
      };
    });
  }

  function removeQuestion(questionIndex: number): void {
    if (readOnly) return;

    setGraph((current) => ({
      ...current,
      questions: visibleQuestions.filter((_, index) => index !== questionIndex),
    }));
  }

  function addChoice(questionIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      const question = current.questions[questionIndex];
      if (!question || question.choices.length >= 4) return current;
      return {
        ...current,
        questions: current.questions.map((item, index) =>
          index === questionIndex
            ? {
                ...item,
                choices: [
                  ...item.choices,
                  {
                    key: createNodeKey("choice"),
                    label: `Choice ${item.choices.length + 1}`,
                    displayOrder: item.choices.length,
                    nextQuestionKey: null,
                    outcomeKey: completionOutcome.key,
                  },
                ],
              }
            : item,
        ),
      };
    });
  }

  function removeChoice(questionIndex: number, choiceIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      const question = current.questions[questionIndex];
      if (!question || question.choices.length <= 2) return current;
      return {
        ...current,
        questions: current.questions.map((item, index) =>
          index === questionIndex
            ? {
                ...item,
                choices: item.choices.filter(
                  (_, currentChoiceIndex) => currentChoiceIndex !== choiceIndex,
                ),
              }
            : item,
        ),
      };
    });
  }

  return (
    <section className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
      <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
        Choose Your Heart
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Write your letter and questions
      </h2>
      <p className="mt-3 text-body leading-relaxed text-ink-muted">
        {readOnly
          ? "This page is published and read only. Unpublish it to make changes."
          : "Write your message for the first section of the letter, then add the questions that pop up after reading."}
      </p>

      {refreshConflict ? (
        <div
          className="mt-5 rounded-medium border border-rose bg-canvas p-4 text-small"
          role="alert"
        >
          <strong>A newer saved version is available.</strong>
          <p className="mt-1 text-ink-muted">
            Reload it to replace your current unsaved changes.
          </p>
          <button
            className="mt-3 min-h-11 rounded-medium border border-border bg-surface px-4 py-2 font-bold text-wine"
            type="button"
            onClick={onReload}
          >
            Reload saved version
          </button>
        </div>
      ) : null}

      <div className="mt-8 space-y-8">
        <fieldset className="space-y-5 rounded-medium border border-border p-5 sm:p-6">
          <legend className="px-2 font-display text-xl font-semibold text-ink">
            1. First section: Letter message
          </legend>
          <p className="text-small text-ink-muted">
            Your recipient reads this letter first, then clicks Continue to
            Questions to open the questions.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label
              className="block text-small font-bold text-ink"
              htmlFor="journey-letter-recipient"
            >
              Recipient name
              <input
                className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                id="journey-letter-recipient"
                placeholder="Someone special"
                value={letter.recipientName}
                readOnly={readOnly}
                aria-readonly={readOnly}
                onChange={(event) =>
                  hasAtMostGraphemes(event.target.value, 120) &&
                  updateLetterField("recipientName", event.target.value)
                }
              />
            </label>

            <label
              className="block text-small font-bold text-ink"
              htmlFor="journey-letter-title"
            >
              Letter heading (optional)
              <input
                className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                id="journey-letter-title"
                placeholder="Choose Your Heart"
                value={letter.title}
                readOnly={readOnly}
                aria-readonly={readOnly}
                onChange={(event) =>
                  hasAtMostGraphemes(event.target.value, 120) &&
                  updateLetterField("title", event.target.value)
                }
              />
            </label>
          </div>

          <label
            className="block text-small font-bold text-ink"
            htmlFor="journey-letter-message"
          >
            Letter message
            <textarea
              className="mt-2 min-h-36 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
              id="journey-letter-message"
              placeholder="Write the message that will be displayed on the letter before the questions pop up..."
              value={letter.mainMessage}
              readOnly={readOnly}
              aria-readonly={readOnly}
              onChange={(event) =>
                hasAtMostGraphemes(event.target.value, 20_000) &&
                updateLetterField("mainMessage", event.target.value)
              }
            />
            <span className="mt-1 block text-right text-small font-normal text-ink-muted">
              {countGraphemes(letter.mainMessage)}/20000
            </span>
          </label>

          <label
            className="block text-small font-bold text-ink"
            htmlFor="journey-letter-creator"
          >
            Sign-off name (optional)
            <input
              className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
              id="journey-letter-creator"
              placeholder="Someone who cares"
              value={letter.creatorName}
              readOnly={readOnly}
              aria-readonly={readOnly}
              onChange={(event) =>
                hasAtMostGraphemes(event.target.value, 120) &&
                updateLetterField("creatorName", event.target.value)
              }
            />
          </label>

          <div className="rounded-medium border border-border bg-canvas p-5">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Letter preview
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
              {letter.title.trim() || "Choose Your Heart"}
            </h3>
            <p className="mt-3 font-display text-lg font-semibold text-ink">
              Dear {letter.recipientName.trim() || "Someone special"},
            </p>
            <p className="mt-2 whitespace-pre-line text-body leading-relaxed text-ink-muted">
              {letter.mainMessage.trim() ||
                "Your message will appear here on the letter before the questions pop up."}
            </p>
            {letter.creatorName.trim() ? (
              <p className="mt-4 font-display text-body font-semibold text-wine">
                With love, {letter.creatorName.trim()}
              </p>
            ) : null}
          </div>
        </fieldset>

        <div className="space-y-6">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              2. Pop-up questions
            </h3>
            <p className="mt-1 text-small text-ink-muted">
              Questions pop up in order after your recipient reads the letter.
              Each question can be multiple choice or a written answer.
            </p>
          </div>

          {visibleQuestions.map((question, questionIndex) => {
            const isText = isPageJourneyTextQuestion(question);
            return (
              <fieldset
                className="space-y-4 rounded-medium border border-border p-5"
                key={question.key}
              >
                <legend className="flex w-full flex-wrap items-center justify-between gap-3 px-2 text-body font-semibold text-ink">
                  <span>Question {questionIndex + 1}</span>
                  <button
                    className="text-small font-bold text-wine underline"
                    type="button"
                    disabled={readOnly}
                    onClick={() => removeQuestion(questionIndex)}
                  >
                    Remove question
                  </button>
                </legend>

                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={`Question ${questionIndex + 1} answer type`}
                >
                  <button
                    className={`min-h-10 rounded-small border px-3 py-1.5 text-small font-bold transition-colors ${
                      !isText
                        ? "border-wine bg-wine text-surface"
                        : "border-border bg-surface text-ink hover:border-wine hover:text-wine"
                    }`}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={!isText}
                    onClick={() => setQuestionType(questionIndex, "choice")}
                  >
                    Multiple choice
                  </button>
                  <button
                    className={`min-h-10 rounded-small border px-3 py-1.5 text-small font-bold transition-colors ${
                      isText
                        ? "border-wine bg-wine text-surface"
                        : "border-border bg-surface text-ink hover:border-wine hover:text-wine"
                    }`}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={isText}
                    onClick={() => setQuestionType(questionIndex, "text")}
                  >
                    Written answer
                  </button>
                </div>

                <label
                  className="block text-small font-bold text-ink"
                  htmlFor={`journey-question-${question.key}`}
                >
                  Prompt
                  <input
                    className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                    id={`journey-question-${question.key}`}
                    value={question.prompt}
                    readOnly={readOnly}
                    aria-readonly={readOnly}
                    onChange={(event) =>
                      hasAtMostGraphemes(event.target.value, 200) &&
                      updateQuestionPrompt(questionIndex, event.target.value)
                    }
                  />
                </label>

                {isText ? (
                  <p className="rounded-medium border border-border bg-surface-muted px-4 py-3 text-small text-ink-muted">
                    Readers will type their own written answer for this
                    question.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {question.choices.map((choice, choiceIndex) => (
                        <div className="space-y-2" key={choice.key}>
                          <label
                            className="block text-small font-bold text-ink"
                            htmlFor={`journey-choice-${choice.key}`}
                          >
                            Choice {choiceIndex + 1}
                            <input
                              className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                              id={`journey-choice-${choice.key}`}
                              value={choice.label}
                              readOnly={readOnly}
                              aria-readonly={readOnly}
                              onChange={(event) =>
                                hasAtMostGraphemes(event.target.value, 80) &&
                                updateChoice(
                                  questionIndex,
                                  choiceIndex,
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          {question.choices.length > 2 ? (
                            <button
                              className="text-small font-bold text-wine underline"
                              type="button"
                              disabled={readOnly}
                              onClick={() =>
                                removeChoice(questionIndex, choiceIndex)
                              }
                            >
                              Remove choice
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <button
                      className="min-h-11 rounded-medium border border-border px-4 py-2 text-small font-bold text-wine disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={readOnly || question.choices.length >= 4}
                      onClick={() => addChoice(questionIndex)}
                    >
                      Add choice
                    </button>
                  </>
                )}
              </fieldset>
            );
          })}

          <div className="flex flex-wrap gap-3">
            <button
              className="min-h-11 rounded-medium border border-border px-4 py-2 text-small font-bold text-wine disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={readOnly || visibleQuestions.length >= 12}
              onClick={() => addQuestion("choice")}
            >
              Add choice question
            </button>
            <button
              className="min-h-11 rounded-medium border border-border px-4 py-2 text-small font-bold text-wine disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={readOnly || visibleQuestions.length >= 12}
              onClick={() => addQuestion("text")}
            >
              Add written question
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface disabled:opacity-60"
          type="button"
          disabled={readOnly || isSaving || refreshConflict}
          onClick={onSave}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        <p
          className="text-small text-ink-muted"
          role={saveError ? "alert" : "status"}
          aria-live="polite"
        >
          {saveError ?? (isDirty ? "Unsaved changes" : statusMessage)}
        </p>
      </div>
      {lifecycleControls}
    </section>
  );
}
