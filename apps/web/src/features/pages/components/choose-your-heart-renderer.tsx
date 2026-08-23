"use client";

import {
  pageJourneySubmissionRequestSchema,
  type PageJourneyPublicPageProjection,
} from "@letterly/contracts/page-journeys";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  submitPublicJourneyResponse,
  type WebApiError,
} from "../../../lib/api-client";
import { journeyMetricOutcomeCategory } from "@letterly/contracts/metrics";
import { emitPageJourneyMetric } from "../../../lib/page-journey-metrics";

interface ChooseYourHeartRendererProps {
  page: PageJourneyPublicPageProjection;
  slug: string;
}

type SelectedAnswer = {
  questionKey: string;
  choiceKey: string;
};

export function ChooseYourHeartRenderer({
  page,
  slug,
}: ChooseYourHeartRendererProps): React.JSX.Element {
  const [answers, setAnswers] = useState<SelectedAnswer[]>([]);
  const [visitorMessage, setVisitorMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const journeyStartEmittedRef = useRef(false);
  const completedOutcomeCategoryRef = useRef<string | null>(null);
  const questionByKey = useMemo(
    () => new Map(page.questions.map((question) => [question.key, question])),
    [page.questions],
  );
  const outcomeByKey = useMemo(
    () => new Map(page.outcomes.map((outcome) => [outcome.key, outcome])),
    [page.outcomes],
  );

  const lastAnswer = answers.at(-1);
  const lastQuestion = lastAnswer
    ? questionByKey.get(lastAnswer.questionKey)
    : undefined;
  const lastChoice = lastQuestion?.choices.find(
    (choice) => choice.key === lastAnswer?.choiceKey,
  );
  const outcome = lastChoice?.outcomeKey
    ? outcomeByKey.get(lastChoice.outcomeKey)
    : undefined;
  const currentQuestionKey =
    lastChoice?.nextQuestionKey ?? page.rootQuestionKey;
  const currentQuestion = outcome
    ? undefined
    : questionByKey.get(currentQuestionKey);
  const progress = outcome
    ? 100
    : Math.min(100, Math.round((answers.length / page.maxDepth) * 100));

  useEffect(() => {
    if (journeyStartEmittedRef.current) return;
    journeyStartEmittedRef.current = true;
    emitPageJourneyMetric(slug, {
      event: "journey_start",
      templateKey: page.template.key,
    });
  }, [page.template.key, slug]);

  useEffect(() => {
    if (!outcome) {
      completedOutcomeCategoryRef.current = null;
      return;
    }
    const outcomeCategory = journeyMetricOutcomeCategory(outcome.displayOrder);
    if (completedOutcomeCategoryRef.current === outcomeCategory) return;
    completedOutcomeCategoryRef.current = outcomeCategory;
    emitPageJourneyMetric(slug, {
      event: "journey_completed",
      templateKey: page.template.key,
      outcomeCategory,
    });
  }, [outcome, page.template.key, slug]);

  function choose(choiceKey: string): void {
    if (!currentQuestion) return;
    setAnswers((current) => [
      ...current,
      { questionKey: currentQuestion.key, choiceKey },
    ]);
  }

  function goBack(): void {
    setAnswers((current) => current.slice(0, -1));
  }

  function resetSubmissionState(): void {
    idempotencyKeyRef.current = null;
    setVisitorMessage("");
    setSubmissionStatus("idle");
    setSubmissionError(null);
  }

  async function submitResponse(withMessage: boolean): Promise<void> {
    if (!outcome || !page.response.enabled) return;

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    const parsed = pageJourneySubmissionRequestSchema.safeParse({
      publishedGraphVersion: page.publishedGraphVersion,
      answers,
      outcomeKey: outcome.key,
      visitorMessage:
        withMessage && visitorMessage.trim()
          ? visitorMessage.trim()
          : undefined,
      idempotencyKey,
    });

    if (!parsed.success) {
      setSubmissionStatus("error");
      setSubmissionError("Add a message or continue without one.");
      return;
    }

    idempotencyKeyRef.current ??= idempotencyKey;
    setSubmissionStatus("submitting");
    setSubmissionError(null);

    try {
      await submitPublicJourneyResponse(slug, parsed.data);
      setSubmissionStatus("accepted");
    } catch (caught: unknown) {
      const error = caught as WebApiError;
      setSubmissionStatus("error");
      setSubmissionError(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-8 sm:py-16">
      <section
        className="mx-auto w-full max-w-2xl rounded-large border border-border bg-surface p-7 shadow-low sm:p-10"
        aria-labelledby="journey-title"
      >
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
          A guided heart journey
        </p>
        <h1
          id="journey-title"
          className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl"
        >
          Choose Your Heart
        </h1>
        <div className="mt-8" aria-label={`${progress}% complete`}>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-wine transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-small text-ink-muted" aria-live="polite">
            {outcome ? "Journey complete" : `${answers.length} answered`}
          </p>
        </div>
        <noscript>
          <p className="mt-5 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">
            Enable JavaScript to choose an answer and continue through this
            journey.
          </p>
        </noscript>

        {outcome ? (
          <div className="mt-10" aria-live="polite">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Your result
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {outcome.title}
            </h2>
            <p className="mt-5 text-body-large leading-relaxed text-ink-muted">
              {outcome.resultMessage}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="min-h-11 rounded-medium border border-border px-5 py-3 text-small font-bold text-ink hover:border-wine hover:text-wine"
                type="button"
                onClick={() => {
                  goBack();
                  resetSubmissionState();
                }}
              >
                Back
              </button>
              <button
                className="min-h-11 rounded-medium border border-border px-5 py-3 text-small font-bold text-ink hover:border-wine hover:text-wine"
                type="button"
                onClick={() => {
                  setAnswers([]);
                  resetSubmissionState();
                }}
              >
                Start again
              </button>
            </div>
            {page.response.enabled ? (
              <div
                className="mt-10 border-t border-border pt-8"
                aria-labelledby="journey-response-title"
              >
                {submissionStatus === "accepted" ? (
                  <div aria-live="polite">
                    <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                      Response sent
                    </p>
                    <h3
                      id="journey-response-title"
                      className="mt-2 font-display text-2xl font-semibold"
                    >
                      Thank you for sharing.
                    </h3>
                    <p className="mt-3 text-body leading-relaxed text-ink-muted">
                      Your private response was delivered to the page creator.
                    </p>
                  </div>
                ) : (
                  <form
                    className="space-y-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitResponse(true);
                    }}
                    noValidate
                  >
                    <div className="space-y-2">
                      <h3
                        id="journey-response-title"
                        className="font-display text-2xl font-semibold"
                      >
                        Leave a private response
                      </h3>
                      <p className="text-small leading-relaxed text-ink-muted">
                        Your response goes only to the person who shared this
                        journey.
                      </p>
                    </div>
                    {page.response.visitorMessageEnabled ? (
                      <div className="space-y-2">
                        <label
                          className="text-body font-semibold text-ink"
                          htmlFor="journey-visitor-message"
                        >
                          {page.response.visitorMessagePrompt}{" "}
                          <span className="font-normal text-ink-muted">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          id="journey-visitor-message"
                          className="min-h-32 w-full rounded-medium border border-border bg-surface-muted px-4 py-3 text-body text-ink outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                          value={visitorMessage}
                          maxLength={page.response.visitorMessageMaxLength}
                          onChange={(event) => {
                            idempotencyKeyRef.current = null;
                            setVisitorMessage(event.target.value);
                            setSubmissionStatus("idle");
                            setSubmissionError(null);
                          }}
                          aria-describedby="journey-visitor-message-note"
                        />
                        <p
                          id="journey-visitor-message-note"
                          className="text-small text-ink-muted"
                        >
                          {page.response.visitorMessagePrivacyText}.{" "}
                          {visitorMessage.length}/
                          {page.response.visitorMessageMaxLength}
                        </p>
                      </div>
                    ) : null}
                    {submissionError ? (
                      <p
                        className="rounded-medium border border-rose bg-surface-muted px-4 py-3 text-small text-wine"
                        role="alert"
                      >
                        {submissionError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                      <button
                        className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
                        type="submit"
                        disabled={submissionStatus === "submitting"}
                      >
                        {submissionStatus === "submitting"
                          ? "Sending..."
                          : "Send private response"}
                      </button>
                      <button
                        className="min-h-11 rounded-medium border border-border px-5 py-3 text-small font-bold text-ink hover:border-wine hover:text-wine disabled:cursor-wait disabled:opacity-60"
                        type="button"
                        disabled={submissionStatus === "submitting"}
                        onClick={() => void submitResponse(false)}
                      >
                        Continue without a message
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        ) : currentQuestion ? (
          <div className="mt-10" aria-live="polite">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
              Question {answers.length + 1}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {currentQuestion.prompt}
            </h2>
            <div className="mt-7 grid gap-3">
              {currentQuestion.choices.map((choice) => (
                <button
                  className="min-h-14 rounded-medium border border-border bg-surface-muted px-5 py-4 text-left text-body font-semibold text-ink transition-colors hover:border-wine hover:text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
                  key={choice.key}
                  type="button"
                  onClick={() => choose(choice.key)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            {answers.length > 0 ? (
              <button
                className="mt-6 min-h-11 rounded-medium px-4 py-3 text-small font-bold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
                type="button"
                onClick={goBack}
              >
                Back
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-10 rounded-medium border border-rose bg-surface-muted p-4 text-body text-wine">
            This journey is temporarily unavailable.
          </p>
        )}
      </section>
    </main>
  );
}
