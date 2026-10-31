"use client";

import { useGSAP } from "@gsap/react";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";
import { DEFAULT_JOURNEY_COMPLETION_OUTCOME } from "@letterly/templates/journey";
import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
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

function CloseIcon({
  className = "h-3.5 w-3.5",
}: {
  className?: string;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
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
  onOutcomeChanged,
}: ChooseYourHeartRendererProps): React.JSX.Element {
  const stageRef = useRef<HTMLElement>(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [answers, setAnswers] = useState<JourneySubmissionAnswer[]>([]);
  const [currentTextAnswer, setCurrentTextAnswer] = useState("");
  const [currentTextError, setCurrentTextError] = useState<string | null>(null);

  const visibleQuestions = page.questions;
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
  const totalQuestionCount = Math.max(page.questions.length, 1);
  const progress = outcome
    ? 100
    : Math.min(100, Math.round((answers.length / totalQuestionCount) * 100));

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
            "-=0.5",
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
            "-=0.5",
          )
          .fromTo(
            '[data-cyh-salutation="true"]',
            { opacity: 0, x: -12 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              clearProps: "transform,opacity",
            },
            "-=0.45",
          )
          .fromTo(
            '[data-cyh-paragraph="true"]',
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              stagger: 0.12,
              clearProps: "transform,opacity",
            },
            "-=0.35",
          )
          .fromTo(
            '[data-cyh-signoff="true"]',
            { opacity: 0, y: 12 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              clearProps: "transform,opacity",
            },
            "-=0.3",
          )
          .fromTo(
            '[data-cyh-reveal="cta"]',
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.55,
              clearProps: "transform,opacity",
            },
            "-=0.3",
          );
      });
    },
    { scope: stageRef },
  );

  useEffect(() => {
    if (!questionsOpen) return;
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && submissionStatus !== "submitting") {
        setQuestionsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [questionsOpen, submissionStatus]);

  useGSAP(
    () => {
      if (!questionsOpen) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          '[data-cyh-modal-stage="true"]',
          { opacity: 0, y: 30, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: "back.out(1.25)",
            clearProps: "transform,opacity",
          },
        );
      });
    },
    { dependencies: [questionsOpen], scope: stageRef },
  );

  useGSAP(
    () => {
      if (!questionsOpen) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          '[data-cyh-question-card="true"], [data-cyh-completion="true"]',
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
        gsap.fromTo(
          '[data-cyh-choice="true"]',
          { opacity: 0, y: 12, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.32,
            stagger: 0.05,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
      });
    },
    {
      dependencies: [questionsOpen, currentQuestion?.key, Boolean(outcome)],
      scope: stageRef,
    },
  );

  const handleSealPulse = contextSafe((): void => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const burstHearts = stageRef.current?.querySelectorAll(
      "[data-cyh-burst-heart]",
    );
    if (!burstHearts || burstHearts.length === 0) return;

    burstHearts.forEach((el, index) => {
      const angle = (index / burstHearts.length) * Math.PI * 2 - Math.PI / 2;
      const distance = 28 + (index % 2) * 14;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance - 8;

      gsap.fromTo(
        el,
        { opacity: 1, x: 0, y: 0, scale: 0.4, rotation: 0 },
        {
          opacity: 0,
          x: targetX,
          y: targetY,
          scale: 1.3,
          rotation: index % 2 === 0 ? 24 : -24,
          duration: 0.85,
          ease: "power2.out",
          overwrite: true,
        },
      );
    });
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

    const targetOutcomeKey =
      choice.outcomeKey ||
      (!choice.nextQuestionKey || !questionByKey.has(choice.nextQuestionKey)
        ? DEFAULT_JOURNEY_COMPLETION_OUTCOME.key
        : undefined);

    if (targetOutcomeKey && page.response.enabled) {
      const resolvedOutcome =
        outcomeByKey.get(targetOutcomeKey) ??
        DEFAULT_JOURNEY_COMPLETION_OUTCOME;
      onSubmit({
        answers: nextAnswers,
        outcomeKey: resolvedOutcome.key,
        visitorMessage: "",
        withMessage: false,
      });
    }
  }

  function submitTextAnswer(choiceKey: string): void {
    const trimmed = currentTextAnswer.trim();
    if (!trimmed) {
      setCurrentTextError("Please write an answer before continuing.");
      return;
    }
    recordAnswer(choiceKey, trimmed);
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
        onContinueToQuestions={
          visibleQuestions.length > 0 ? () => setQuestionsOpen(true) : undefined
        }
        onSealPulse={handleSealPulse}
        progress={progress}
        questionCount={visibleQuestions.length}
      />

      {questionsOpen && visibleQuestions.length > 0 ? (
        <div
          className={`${
            contained ? "absolute" : "fixed"
          } inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain p-2.5 sm:p-4 md:p-6 ${styles.modalBackdrop}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="journey-popup-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setQuestionsOpen(false);
            }
          }}
        >
          {/* Sculptural Collage Questions Container */}
          <div
            className="relative my-auto flex w-full max-w-[560px] flex-col justify-center py-2 sm:py-4"
            data-cyh-modal-stage="true"
          >
            {/* Background Slate Folder Underlay behind Questions Modal */}
            <div
              className={`${styles.kineticBackPaper} pointer-events-none absolute inset-x-3 -top-2 -bottom-3 hidden rounded-[2.2rem] border border-[#ffb2bf]/30 bg-gradient-to-br from-[#2a0e1e]/90 via-[#3b122b]/85 to-[#1a0815]/95 shadow-[0_25px_60px_-10px_rgba(10,2,8,0.85)] sm:block`}
              aria-hidden="true"
            />
            {/* Warm Parchment Underlay behind Questions Modal */}
            <div
              className={`${styles.kineticEnvelopeFlap} pointer-events-none absolute inset-x-1.5 top-1.5 -bottom-1.5 hidden rounded-[2.2rem] border border-[#e8dfcf] bg-gradient-to-br from-[#f8f4ee] via-[#efe8dd] to-[#e4dcd0] opacity-80 shadow-xl sm:block`}
              aria-hidden="true"
            />

            <div
              className={`${styles.modalCard} relative z-10 flex max-h-[min(90dvh,640px)] min-h-0 w-full flex-col justify-start overflow-y-auto p-4 sm:p-6 lg:p-7 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
              data-cyh-modal-card="true"
            >
              {/* Tactile parchment overlay */}
              <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] bg-gradient-to-tr from-[#ebdccb]/15 via-transparent to-[#dce2ff]/15 sm:rounded-[2.2rem]" />

              <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between">
                {/* Modern Editorial Header */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#303660]/10 pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f2d0d7] bg-gradient-to-r from-white via-[#fff5f6] to-[#faecef] px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#6c002a] shadow-sm">
                      <HeartIcon className="h-2.5 w-2.5 text-[#ba1a1a]" />
                      <span id="journey-popup-title">Questions</span>
                    </span>
                    <span
                      className={`${styles.fontSans} rounded-full border border-[#ffccd5] bg-[#fff0f3] px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-[#8c1d40]`}
                    >
                      {outcome
                        ? "Done"
                        : `${String(answers.length + 1).padStart(2, "0")} / ${String(visibleQuestions.length).padStart(2, "0")}`}
                    </span>
                  </div>

                  <button
                    className="group inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#e6a8b2] bg-[#fff8f9] text-[#6c002a] shadow-sm transition-all duration-300 hover:scale-110 hover:border-[#8c1d40] hover:bg-[#faecef] hover:text-[#ba1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb2bf]"
                    type="button"
                    aria-label="Return to letter"
                    title="Return to letter"
                    disabled={submissionStatus === "submitting"}
                    onClick={() => setQuestionsOpen(false)}
                  >
                    <CloseIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" />
                  </button>
                </div>

                {/* Glowing Liquid Segmented Progress Track */}
                <div
                  className="mt-3 shrink-0"
                  aria-label={`${progress}% complete`}
                >
                  <div className="flex items-center gap-1.5">
                    {visibleQuestions.map((q, idx) => {
                      const isCompleted =
                        idx < answers.length || Boolean(outcome);
                      const isCurrent = idx === answers.length && !outcome;
                      return (
                        <div
                          key={q.key}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                            isCompleted
                              ? "bg-gradient-to-r from-[#ba1a1a] via-[#8c1d40] to-[#e63946] shadow-[0_0_8px_rgba(186,26,26,0.5)]"
                              : isCurrent
                                ? "bg-gradient-to-r from-[#ffb2bf] to-[#e6a8b2] animate-pulse"
                                : "bg-[#faecef]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

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
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`${styles.fontCormorant} text-xl font-semibold italic tracking-tight text-[#161a30] sm:text-2xl`}
                          >
                            {outcome.title}
                          </h3>
                          <p
                            className={`${styles.fontSerif} mt-1.5 text-sm leading-relaxed text-[#2c3150] sm:text-base`}
                          >
                            {outcome.resultMessage}
                          </p>
                        </div>
                      </div>

                      {submissionError ? (
                        <p
                          className="mt-3 rounded-xl border border-[#ba1a1a]/40 bg-[#fff5f6] p-3 text-xs text-[#ba1a1a]"
                          role="alert"
                        >
                          {submissionError}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex justify-center sm:mt-6">
                      <button
                        className={`${styles.primaryCta} cursor-pointer`}
                        type="button"
                        onClick={() => setQuestionsOpen(false)}
                      >
                        <span>Return to letter</span>
                      </button>
                    </div>
                  </div>
                ) : currentQuestion ? (
                  <ChooseYourHeartQuestion
                    key={currentQuestion.key}
                    isLastQuestion={isLastQuestion}
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
                    totalQuestions={visibleQuestions.length}
                  />
                ) : (
                  <p
                    className={`${styles.fontSans} mt-6 rounded-xl border border-[#ba1a1a]/40 bg-[#fff5f6] p-4 text-sm font-medium text-[#ba1a1a]`}
                  >
                    These questions are temporarily unavailable.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <noscript>
        {currentQuestion ? (
          <div className="relative z-20 mx-auto mt-6 max-w-xl rounded-2xl border border-[#ffb2bf]/50 bg-[#fff8f9] p-4 text-[#6c002a]">
            <p className="mb-3 text-sm font-semibold">
              Enable JavaScript to choose an answer and continue through this
              journey.
            </p>
            <ChooseYourHeartQuestion
              onChoose={() => {}}
              question={currentQuestion}
              questionNumber={1}
              totalQuestions={visibleQuestions.length}
            />
          </div>
        ) : null}
      </noscript>
    </main>
  );
}
