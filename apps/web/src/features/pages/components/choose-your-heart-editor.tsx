"use client";

import type { PageJourneyOwnerResponse } from "@letterly/contracts/page-journeys";
import { hasAtMostGraphemes } from "@letterly/templates/graphemes";
import type { PageJourneyGraph } from "@letterly/templates/journey";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  getOwnerPageJourney,
  saveOwnerPageJourney,
  type WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { PublishControls } from "./publish-controls";

interface ChooseYourHeartEditorProps {
  page: OwnerPageProjection;
  onDirtyChange?: (dirty: boolean) => void;
}

function copyGraph(response: PageJourneyOwnerResponse): PageJourneyGraph {
  return structuredClone(response.draft);
}

function pathText(error: WebApiError): string | null {
  if (!error.details || !("issues" in error.details)) return null;
  return error.details.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.code}`)
    .join("; ");
}

function createNodeKey(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function choiceDestination(
  choice: PageJourneyGraph["questions"][number]["choices"][number],
): string {
  if (choice.nextQuestionKey) return `question:${choice.nextQuestionKey}`;
  if (choice.outcomeKey) return `outcome:${choice.outcomeKey}`;
  return "";
}

function normalizeDisplayOrders(graph: PageJourneyGraph): PageJourneyGraph {
  return {
    ...graph,
    questions: graph.questions.map((question, questionIndex) => ({
      ...question,
      displayOrder: questionIndex,
      choices: question.choices.map((choice, choiceIndex) => ({
        ...choice,
        displayOrder: choiceIndex,
      })),
    })),
    outcomes: graph.outcomes.map((outcome, outcomeIndex) => ({
      ...outcome,
      displayOrder: outcomeIndex,
    })),
  };
}

export function ChooseYourHeartEditor({
  page,
  onDirtyChange,
}: ChooseYourHeartEditorProps): React.JSX.Element {
  const readOnly = page.status === "PUBLISHED";
  const queryClient = useQueryClient();
  const journeyQuery = useQuery<PageJourneyOwnerResponse, WebApiError>({
    queryKey: ["page-journey", page.id],
    queryFn: () => getOwnerPageJourney(page.id),
  });
  const [graph, setGraph] = useState<PageJourneyGraph | null>(null);
  const [savedGraph, setSavedGraph] = useState<PageJourneyGraph | null>(null);
  const [expectedContentVersion, setExpectedContentVersion] = useState(
    page.contentVersion,
  );
  const [refreshConflict, setRefreshConflict] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading your journey...");
  const lastSyncedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const response = journeyQuery.data;
    if (!response) return;

    const signature = `${response.contentVersion}:${response.draft.revisionNumber}`;
    const dirty =
      graph !== null &&
      savedGraph !== null &&
      JSON.stringify(graph) !== JSON.stringify(savedGraph);

    if (!graph || !savedGraph || lastSyncedSignatureRef.current === null) {
      const nextGraph = copyGraph(response);
      setGraph(nextGraph);
      setSavedGraph(nextGraph);
      setExpectedContentVersion(response.contentVersion);
      lastSyncedSignatureRef.current = signature;
      setRefreshConflict(false);
      setStatusMessage(`Saved as version ${response.contentVersion}.`);
      return;
    }

    if (signature === lastSyncedSignatureRef.current) return;
    if (dirty) {
      setRefreshConflict(true);
      setStatusMessage("A newer saved journey is available.");
      return;
    }

    const nextGraph = copyGraph(response);
    setGraph(nextGraph);
    setSavedGraph(nextGraph);
    setExpectedContentVersion(response.contentVersion);
    lastSyncedSignatureRef.current = signature;
    setRefreshConflict(false);
    setStatusMessage(`Saved as version ${response.contentVersion}.`);
  }, [graph, journeyQuery.data, savedGraph]);

  useEffect(() => {
    onDirtyChange?.(
      !readOnly &&
        graph !== null &&
        savedGraph !== null &&
        JSON.stringify(graph) !== JSON.stringify(savedGraph),
    );
  }, [graph, onDirtyChange, readOnly, savedGraph]);

  const saveMutation = useMutation<
    PageJourneyOwnerResponse,
    WebApiError,
    PageJourneyGraph
  >({
    mutationFn: (nextGraph) => {
      if (readOnly) {
        throw new Error("Unpublish this journey before editing it.");
      }
      return saveOwnerPageJourney(page.id, {
        ...nextGraph,
        expectedContentVersion,
      });
    },
    onSuccess: (response) => {
      const nextGraph = copyGraph(response);
      setGraph(nextGraph);
      setSavedGraph(nextGraph);
      setExpectedContentVersion(response.contentVersion);
      setStatusMessage(`Saved as version ${response.contentVersion}.`);
      void queryClient.invalidateQueries({
        queryKey: pageKeys.detail(page.id),
      });
      void journeyQuery.refetch();
    },
    onError: (error) => {
      setStatusMessage(pathText(error) ?? error.message);
    },
  });

  if (journeyQuery.isPending || !graph) {
    return (
      <section className="rounded-large border border-border bg-surface p-7 shadow-low">
        <p
          className="text-body text-ink-muted"
          role="status"
          aria-live="polite"
        >
          Loading your heart journey...
        </p>
      </section>
    );
  }

  if (journeyQuery.isError) {
    return (
      <section
        className="rounded-large border border-rose bg-surface p-7 shadow-low"
        role="alert"
      >
        <h2 className="font-display text-2xl font-semibold">
          Journey unavailable
        </h2>
        <p className="mt-3 text-body text-ink-muted">
          {journeyQuery.error.message}
        </p>
        <button
          className="mt-5 min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface"
          type="button"
          onClick={() => void journeyQuery.refetch()}
        >
          Try again
        </button>
      </section>
    );
  }

  const isDirty =
    graph !== null &&
    savedGraph !== null &&
    JSON.stringify(graph) !== JSON.stringify(savedGraph);

  function updateQuestion(index: number, prompt: string): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, prompt } : question,
      );
      return { ...current, questions };
    });
  }

  function updateChoice(
    questionIndex: number,
    choiceIndex: number,
    label: string,
  ): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current) return current;
      const questions = current.questions.map((question, index) => {
        if (index !== questionIndex) return question;
        return {
          ...question,
          choices: question.choices.map((choice, index) =>
            index === choiceIndex ? { ...choice, label } : choice,
          ),
        };
      });
      return { ...current, questions };
    });
  }

  function updateOutcome(
    index: number,
    field: "title" | "resultMessage",
    value: string,
  ): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current) return current;
      return {
        ...current,
        outcomes: current.outcomes.map((outcome, outcomeIndex) =>
          outcomeIndex === index ? { ...outcome, [field]: value } : outcome,
        ),
      };
    });
  }

  function updateChoiceDestination(
    questionIndex: number,
    choiceIndex: number,
    destination: string,
  ): void {
    if (readOnly) return;

    const [kind, key] = destination.split(":", 2);
    setGraph((current) => {
      if (!current) return current;
      return {
        ...current,
        questions: current.questions.map((question, currentQuestionIndex) => {
          if (currentQuestionIndex !== questionIndex) return question;
          return {
            ...question,
            choices: question.choices.map((choice, currentChoiceIndex) =>
              currentChoiceIndex === choiceIndex
                ? {
                    ...choice,
                    nextQuestionKey: kind === "question" ? (key ?? null) : null,
                    outcomeKey: kind === "outcome" ? (key ?? null) : null,
                  }
                : choice,
            ),
          };
        }),
      };
    });
  }

  function addQuestion(): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current || current.questions.length >= 12) return current;
      const outcomeKeys = current.outcomes
        .slice(0, 2)
        .map((outcome) => outcome.key);
      return {
        ...current,
        questions: [
          ...current.questions,
          {
            key: createNodeKey("question"),
            prompt: "New question",
            displayOrder: current.questions.length,
            choices: [0, 1].map((choiceIndex) => ({
              key: createNodeKey("choice"),
              label: `Choice ${choiceIndex + 1}`,
              displayOrder: choiceIndex,
              nextQuestionKey: null,
              outcomeKey: outcomeKeys[choiceIndex] ?? null,
            })),
          },
        ],
      };
    });
  }

  function removeQuestion(questionIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current || current.questions.length <= 1) return current;
      const removed = current.questions[questionIndex];
      if (!removed || removed.key === current.rootQuestionKey) return current;
      const replacementOutcomeKey = current.outcomes[0]?.key ?? null;
      return normalizeDisplayOrders({
        ...current,
        rootQuestionKey: current.rootQuestionKey,
        questions: current.questions
          .filter((_, index) => index !== questionIndex)
          .map((question) => ({
            ...question,
            choices: question.choices.map((choice) =>
              choice.nextQuestionKey === removed.key
                ? {
                    ...choice,
                    nextQuestionKey: null,
                    outcomeKey: replacementOutcomeKey,
                  }
                : choice,
            ),
          })),
      });
    });
  }

  function addChoice(questionIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current) return current;
      const question = current.questions[questionIndex];
      if (!question || question.choices.length >= 4) return current;
      return normalizeDisplayOrders({
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
                    outcomeKey: current.outcomes[0]?.key ?? null,
                  },
                ],
              }
            : item,
        ),
      });
    });
  }

  function removeChoice(questionIndex: number, choiceIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      const question = current?.questions[questionIndex];
      if (!current || !question || question.choices.length <= 2) return current;
      return normalizeDisplayOrders({
        ...current,
        questions: current.questions.map((item, index) =>
          index === questionIndex
            ? {
                ...item,
                choices: item.choices.filter(
                  (_, index) => index !== choiceIndex,
                ),
              }
            : item,
        ),
      });
    });
  }

  function addOutcome(): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current || current.outcomes.length >= 12) return current;
      return {
        ...current,
        outcomes: [
          ...current.outcomes,
          {
            key: createNodeKey("outcome"),
            title: "New result",
            resultMessage: "Write what this result means.",
            displayOrder: current.outcomes.length,
          },
        ],
      };
    });
  }

  function removeOutcome(outcomeIndex: number): void {
    if (readOnly) return;

    setGraph((current) => {
      if (!current || current.outcomes.length <= 1) return current;
      const removed = current.outcomes[outcomeIndex];
      const replacementOutcomeKey = current.outcomes.find(
        (_, index) => index !== outcomeIndex,
      )?.key;
      if (!removed || !replacementOutcomeKey) return current;
      return normalizeDisplayOrders({
        ...current,
        outcomes: current.outcomes.filter((_, index) => index !== outcomeIndex),
        questions: current.questions.map((question) => ({
          ...question,
          choices: question.choices.map((choice) =>
            choice.outcomeKey === removed.key
              ? { ...choice, outcomeKey: replacementOutcomeKey }
              : choice,
          ),
        })),
      });
    });
  }

  return (
    <section className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
      <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
        Choose Your Heart
      </p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Shape the journey
      </h2>
      <p className="mt-3 text-body leading-relaxed text-ink-muted">
        {readOnly
          ? "This journey is published and read only. Unpublish it to make changes."
          : "Edit each question, choice, and result. Changes stay private until you save and publish."}
      </p>

      {refreshConflict ? (
        <div
          className="mt-5 rounded-medium border border-rose bg-canvas p-4 text-small"
          role="alert"
        >
          <strong>A newer saved journey is available.</strong>
          <p className="mt-1 text-ink-muted">
            Reload it to replace your current unsaved changes.
          </p>
          <button
            className="mt-3 min-h-11 rounded-medium border border-border bg-surface px-4 py-2 font-bold text-wine"
            type="button"
            onClick={() => {
              const response = journeyQuery.data;
              if (!response) return;
              const nextGraph = copyGraph(response);
              setGraph(nextGraph);
              setSavedGraph(nextGraph);
              setExpectedContentVersion(response.contentVersion);
              lastSyncedSignatureRef.current = `${response.contentVersion}:${response.draft.revisionNumber}`;
              setRefreshConflict(false);
              setStatusMessage(`Saved as version ${response.contentVersion}.`);
            }}
          >
            Reload saved journey
          </button>
        </div>
      ) : null}

      <label
        className="mt-6 block text-small font-bold text-ink"
        htmlFor="journey-root-question"
      >
        Starting question
        <select
          className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
          id="journey-root-question"
          value={graph.rootQuestionKey}
          disabled={readOnly}
          onChange={(event) =>
            setGraph((current) =>
              current
                ? { ...current, rootQuestionKey: event.target.value }
                : current,
            )
          }
        >
          {graph.questions.map((question) => (
            <option key={question.key} value={question.key}>
              {question.prompt || question.key}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-8 space-y-8">
        {graph.questions.map((question, questionIndex) => (
          <fieldset
            className="space-y-4 rounded-medium border border-border p-5"
            key={question.key}
          >
            <legend className="flex w-full items-center justify-between gap-3 px-2 text-body font-semibold text-ink">
              <span>Question {questionIndex + 1}</span>
              {question.key !== graph.rootQuestionKey ? (
                <button
                  className="text-small font-bold text-wine underline"
                  type="button"
                  disabled={readOnly}
                  onClick={() => removeQuestion(questionIndex)}
                >
                  Remove question
                </button>
              ) : null}
            </legend>
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
                  updateQuestion(questionIndex, event.target.value)
                }
              />
            </label>
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
                  <label
                    className="block text-small font-bold text-ink"
                    htmlFor={`journey-destination-${choice.key}`}
                  >
                    Destination
                    <select
                      className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                      id={`journey-destination-${choice.key}`}
                      value={choiceDestination(choice)}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateChoiceDestination(
                          questionIndex,
                          choiceIndex,
                          event.target.value,
                        )
                      }
                    >
                      <option value="">Choose a destination</option>
                      <optgroup label="Questions">
                        {graph.questions
                          .filter(
                            (destination) => destination.key !== question.key,
                          )
                          .map((destination) => (
                            <option
                              key={destination.key}
                              value={`question:${destination.key}`}
                            >
                              Question: {destination.prompt || destination.key}
                            </option>
                          ))}
                      </optgroup>
                      <optgroup label="Results">
                        {graph.outcomes.map((outcome) => (
                          <option
                            key={outcome.key}
                            value={`outcome:${outcome.key}`}
                          >
                            Result: {outcome.title || outcome.key}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                  {question.choices.length > 2 ? (
                    <button
                      className="text-small font-bold text-wine underline"
                      type="button"
                      disabled={readOnly}
                      onClick={() => removeChoice(questionIndex, choiceIndex)}
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
          </fieldset>
        ))}

        <button
          className="min-h-11 rounded-medium border border-border px-4 py-2 text-small font-bold text-wine disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={readOnly || graph.questions.length >= 12}
          onClick={addQuestion}
        >
          Add question
        </button>

        {graph.outcomes.map((outcome, outcomeIndex) => (
          <fieldset
            className="space-y-4 rounded-medium border border-border p-5"
            key={outcome.key}
          >
            <legend className="flex w-full items-center justify-between gap-3 px-2 text-body font-semibold text-ink">
              <span>Result {outcomeIndex + 1}</span>
              {graph.outcomes.length > 1 ? (
                <button
                  className="text-small font-bold text-wine underline"
                  type="button"
                  onClick={() => removeOutcome(outcomeIndex)}
                >
                  Remove result
                </button>
              ) : null}
            </legend>
            <label
              className="block text-small font-bold text-ink"
              htmlFor={`journey-outcome-title-${outcome.key}`}
            >
              Title
              <input
                className="mt-2 min-h-11 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                id={`journey-outcome-title-${outcome.key}`}
                value={outcome.title}
                readOnly={readOnly}
                aria-readonly={readOnly}
                onChange={(event) =>
                  hasAtMostGraphemes(event.target.value, 120) &&
                  updateOutcome(outcomeIndex, "title", event.target.value)
                }
              />
            </label>
            <label
              className="block text-small font-bold text-ink"
              htmlFor={`journey-outcome-message-${outcome.key}`}
            >
              Result message
              <textarea
                className="mt-2 min-h-28 w-full rounded-medium border border-border bg-surface-muted px-3 py-2 text-body outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                id={`journey-outcome-message-${outcome.key}`}
                value={outcome.resultMessage}
                readOnly={readOnly}
                aria-readonly={readOnly}
                onChange={(event) =>
                  hasAtMostGraphemes(event.target.value, 2000) &&
                  updateOutcome(
                    outcomeIndex,
                    "resultMessage",
                    event.target.value,
                  )
                }
              />
            </label>
          </fieldset>
        ))}

        <button
          className="min-h-11 rounded-medium border border-border px-4 py-2 text-small font-bold text-wine disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={readOnly || graph.outcomes.length >= 12}
          onClick={addOutcome}
        >
          Add result
        </button>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface disabled:opacity-60"
          type="button"
          disabled={readOnly || saveMutation.isPending || refreshConflict}
          onClick={() => saveMutation.mutate(graph)}
        >
          {saveMutation.isPending ? "Saving..." : "Save journey"}
        </button>
        <p
          className="text-small text-ink-muted"
          role="status"
          aria-live="polite"
        >
          {isDirty ? "Unsaved changes" : statusMessage}
        </p>
      </div>
      <PublishControls
        page={page}
        isDirty={isDirty}
        isSaving={saveMutation.isPending}
        recipientName=""
        mainMessage=""
        isJourney
        onChanged={(lifecycle) => {
          setExpectedContentVersion(lifecycle.contentVersion);
          void queryClient.invalidateQueries({
            queryKey: pageKeys.detail(page.id),
          });
          void queryClient.invalidateQueries({
            queryKey: ["page-journey", page.id],
          });
        }}
      />
    </section>
  );
}
