"use client";

import { useGSAP } from "@gsap/react";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";
import { DEFAULT_JOURNEY_COMPLETION_OUTCOME } from "@letterly/templates/journey";
import gsap from "gsap";
import { useMemo, useRef, useState } from "react";
import styles from "./choose-your-heart.module.css";
import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
} from "./first-section";
import { StarlightShaderCanvas } from "./starlight-shader-canvas";

gsap.registerPlugin(useGSAP);

function HeartIcon({
  className = "h-3.5 w-3.5",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export type JourneySubmissionStatus =
  "idle" | "submitting" | "accepted" | "error";

export interface JourneySubmissionAnswer {
  questionKey: string;
  choiceKey: string;
  textAnswer?: string;
}

export interface JourneySubmissionInput {
  answers: JourneySubmissionAnswer[];
  outcomeKey: string;
  visitorMessage: string;
  withMessage: boolean;
}

interface ChooseYourHeartRendererProps {
  page: PageJourneyPublicPageProjection;
  contained?: boolean;
  submissionStatus: JourneySubmissionStatus;
  submissionError: string | null;
  onSubmit: (input: JourneySubmissionInput) => void;
  onResetResponse: () => void;
  onOutcomeChanged: (displayOrder: number | null) => void;
}

export function ChooseYourHeartRenderer({
  page,
  contained = false,
  submissionStatus,
  submissionError,
  onSubmit,
  onResetResponse,
  onOutcomeChanged,
}: ChooseYourHeartRendererProps): React.JSX.Element {
  const stageRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<JourneySubmissionAnswer[]>([]);
  const [visitorMessage, setVisitorMessage] = useState("");
  const [currentTextAnswer, setCurrentTextAnswer] = useState("");
  const [currentTextError, setCurrentTextError] = useState<string | null>(null);

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
    ? (outcomeByKey.get(lastChoice.outcomeKey) ??
      DEFAULT_JOURNEY_COMPLETION_OUTCOME)
    : undefined;
  const currentQuestionKey =
    lastChoice?.nextQuestionKey ?? page.rootQuestionKey;
  const currentQuestion = outcome
    ? undefined
    : questionByKey.get(currentQuestionKey);
  const progress = outcome
    ? 100
    : Math.min(100, Math.round((answers.length / page.maxDepth) * 100));

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.fromTo(
          '[data-cyh-reveal="heading"]',
          { opacity: 0, y: 18, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.65,
            clearProps: "transform,opacity",
          },
        )
          .fromTo(
            '[data-cyh-layer="back-paper"]',
            { opacity: 0, y: 20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              clearProps: "opacity",
            },
            "-=0.4",
          )
          .fromTo(
            '[data-cyh-layer="envelope-flap"]',
            { opacity: 0, y: 18 },
            {
              opacity: 0.75,
              y: 0,
              duration: 0.7,
              clearProps: "opacity",
            },
            "-=0.55",
          )
          .fromTo(
            '[data-cyh-card="true"]',
            { opacity: 0, y: 24, scale: 0.98 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              clearProps: "opacity",
            },
            "-=0.55",
          )
          .fromTo(
            '[data-cyh-stamp="true"], [data-cyh-seal="true"]',
            { opacity: 0, scale: 0.6 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.6,
              stagger: 0.1,
              ease: "back.out(1.8)",
              clearProps: "opacity",
            },
            "-=0.4",
          );
      });
    },
    { scope: stageRef },
  );

  const handleSealPulse = contextSafe(() => {
    gsap.fromTo(
      '[data-cyh-seal="true"]',
      { scale: 0.88 },
      { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" },
    );
  });

  function recordAnswer(choiceKey: string, textAnswer?: string): void {
    if (!currentQuestion) return;
    const choice = currentQuestion.choices.find(
      (item) => item.key === choiceKey,
    );
    if (!choice) return;
    onOutcomeChanged(
      outcomeByKey.get(choice.outcomeKey ?? "")?.displayOrder ?? null,
    );
    setCurrentTextAnswer("");
    setCurrentTextError(null);
    const newAnswer: JourneySubmissionAnswer = {
      questionKey: currentQuestion.key,
      choiceKey,
      ...(textAnswer !== undefined ? { textAnswer } : {}),
    };
    const nextAnswers = [...answers, newAnswer];
    setAnswers(nextAnswers);
  }

  function submitTextAnswer(choiceKey: string): void {
    const trimmed = currentTextAnswer.trim();
    if (!trimmed) {
      setCurrentTextError("Please write an answer before continuing.");
      return;
    }
    recordAnswer(choiceKey, trimmed);
  }

  function goBack(): void {
    if (answers.length === 0) return;
    const previous = answers.at(-1);
    setCurrentTextAnswer(previous?.textAnswer ?? "");
    setCurrentTextError(null);
    onOutcomeChanged(null);
    setAnswers((current) => current.slice(0, -1));
  }

  function resetSubmissionState(): void {
    setVisitorMessage("");
    onResetResponse();
    onOutcomeChanged(null);
  }

  function submitResponse(withMessage: boolean): void {
    if (outcome && page.response.enabled) {
      onSubmit({
        answers,
        outcomeKey: outcome.key,
        visitorMessage,
        withMessage,
      });
    }
  }

  const isLastQuestion = Boolean(
    currentQuestion &&
    currentQuestion.choices.every((choice) => Boolean(choice.outcomeKey)),
  );

  return (
    <main
      ref={stageRef}
      data-contained={contained ? "true" : undefined}
      className={`${styles.stage} w-full`}
    >
      <StarlightShaderCanvas contained={contained} />

      <ChooseYourHeartFirstSection
        answeredLabel={
          outcome ? "All questions answered" : `${answers.length} answered`
        }
        images={page.images}
        letter={page.letter}
        onSealPulse={handleSealPulse}
        progress={progress}
        questionCount={page.questions.length}
      >
        {outcome ? (
          <div
            className="mt-4 flex min-h-0 flex-1 flex-col justify-between sm:mt-5"
            aria-live="polite"
            data-cyh-completion="true"
          >
            <div>
              {/* Keepsake Completed Card */}
              <div className={styles.completionSealCard}>
                <span
                  className={`${styles.completionSealIcon} ${styles.kineticSeal}`}
                  aria-hidden="true"
                >
                  <HeartIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h2
                    className={`${styles.fontCormorant} text-xl font-semibold italic tracking-tight text-[#161a30] sm:text-2xl`}
                  >
                    {outcome.title}
                  </h2>
                  <p
                    className={`${styles.fontSerif} mt-1 text-sm leading-relaxed text-[#2c3150] sm:text-base`}
                  >
                    {outcome.resultMessage}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 sm:mt-5">
                <button
                  className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#6c002a] transition-all hover:bg-[#faecef]"
                  type="button"
                  disabled={submissionStatus === "submitting"}
                  onClick={() => {
                    goBack();
                    resetSubmissionState();
                  }}
                >
                  Back
                </button>
                <button
                  className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#6c002a] transition-all hover:bg-[#faecef]"
                  type="button"
                  disabled={submissionStatus === "submitting"}
                  onClick={() => {
                    setAnswers([]);
                    resetSubmissionState();
                  }}
                >
                  Start again
                </button>
              </div>
            </div>

            {page.response.enabled ? (
              <div
                className="mt-4 border-t border-[#303660]/10 pt-3 sm:mt-5 sm:pt-4"
                aria-labelledby="journey-response-title"
              >
                {submissionStatus === "accepted" ? (
                  <div
                    className="rounded-2xl border border-[#e6a8b2] bg-gradient-to-br from-[#fff8f9] to-[#faecef] p-4 text-center sm:p-5"
                    aria-live="polite"
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ba1a1a] via-[#8c1d40] to-[#570020] text-[#ffdadb] shadow-md ring-2 ring-[#8c1d40]/30">
                      <HeartIcon className="h-5 w-5 animate-pulse" />
                    </div>
                    <h3
                      id="journey-response-title"
                      className={`${styles.fontCormorant} mt-2 text-xl font-semibold italic text-[#161a30] sm:text-2xl`}
                    >
                      Thank you for sharing.
                    </h3>
                    <p
                      className={`${styles.fontSerif} mt-1 text-sm text-[#2c3150]/80`}
                    >
                      Your heartfelt answers were delivered privately.
                    </p>
                  </div>
                ) : (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitResponse(true);
                    }}
                    noValidate
                  >
                    <div className="space-y-0.5">
                      <h3
                        id="journey-response-title"
                        className={`${styles.fontCormorant} text-lg font-semibold italic text-[#161a30] sm:text-xl`}
                      >
                        Leave a private response
                      </h3>
                      <p className="text-xs text-[#2c3150]/70">
                        Your response goes only to the person who shared this
                        journey.
                      </p>
                    </div>
                    {page.response.visitorMessageEnabled ? (
                      <div className="space-y-1">
                        <label
                          className="text-xs font-semibold text-[#161a30]"
                          htmlFor="journey-visitor-message"
                        >
                          {page.response.visitorMessagePrompt}{" "}
                          <span className="font-normal text-[#2c3150]/60">
                            (optional)
                          </span>
                        </label>
                        <textarea
                          id="journey-visitor-message"
                          aria-label="Private message"
                          className={`${styles.fontSerif} min-h-20 w-full rounded-xl border border-[#e6a8b2] bg-[#fffbf9] p-3 text-sm text-[#161a30] outline-none focus:border-[#8c1d40] focus:ring-2 focus:ring-[#ffb2bf]`}
                          value={visitorMessage}
                          disabled={submissionStatus === "submitting"}
                          maxLength={page.response.visitorMessageMaxLength}
                          onChange={(event) => {
                            setVisitorMessage(event.target.value);
                            onResetResponse();
                          }}
                          aria-describedby="journey-visitor-message-note"
                        />
                        <p
                          id="journey-visitor-message-note"
                          className="text-[10px] text-[#2c3150]/60"
                        >
                          {page.response.visitorMessagePrivacyText}.{" "}
                          {visitorMessage.length}/
                          {page.response.visitorMessageMaxLength}
                        </p>
                      </div>
                    ) : null}
                    {submissionError ? (
                      <p
                        className="rounded-xl border border-[#ba1a1a]/40 bg-[#fff5f6] p-3 text-xs text-[#ba1a1a]"
                        role="alert"
                      >
                        {submissionError}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`${styles.primaryCta} cursor-pointer`}
                        type="submit"
                        disabled={submissionStatus === "submitting"}
                      >
                        <span>
                          {submissionStatus === "submitting"
                            ? "Sending..."
                            : "Send private response"}
                        </span>
                      </button>
                      <button
                        className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] px-4 py-2 text-xs font-bold text-[#6c002a] hover:bg-[#faecef] disabled:opacity-60"
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
          <ChooseYourHeartQuestion
            key={currentQuestion.key}
            isLastQuestion={isLastQuestion}
            onBack={answers.length > 0 ? goBack : undefined}
            onChoose={(choiceKey) => recordAnswer(choiceKey)}
            onSubmitTextAnswer={submitTextAnswer}
            onTextValueChange={(value) => {
              setCurrentTextAnswer(value);
              if (currentTextError) setCurrentTextError(null);
            }}
            question={currentQuestion}
            questionNumber={answers.length + 1}
            textError={currentTextError}
            textValue={currentTextAnswer}
            totalQuestions={page.questions.length}
          />
        ) : (
          <p
            className={`${styles.fontSans} mt-6 rounded-xl border border-[#ba1a1a]/40 bg-[#fff5f6] p-4 text-sm font-medium text-[#ba1a1a]`}
          >
            These questions are temporarily unavailable.
          </p>
        )}
      </ChooseYourHeartFirstSection>
    </main>
  );
}
