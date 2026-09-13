"use client";

import { useGSAP } from "@gsap/react";
import {
  visitorSubmissionRequestSchema,
  type VisitorAnswerInput,
} from "@letterly/contracts/submissions";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import { gsap } from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  submitPublicResponse,
  type WebApiError,
} from "../../../lib/api-client";
import styles from "./visitor-response-form.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP);

interface VisitorResponseFormProps {
  slug: string;
  response: EnabledPublicResponseDescription;
  preview?: boolean;
}

type AnswerValue = {
  choiceId?: string;
  textAnswer?: string;
};

type ActiveStep = {
  questionId: string | null;
  questionIndex: number;
  finished: boolean;
};

type PublicQuestion = EnabledPublicResponseDescription["questions"][number];

function orderedQuestions(
  response: EnabledPublicResponseDescription,
): PublicQuestion[] {
  return [...response.questions].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
}

function firstStep(response: EnabledPublicResponseDescription): ActiveStep {
  const questions = orderedQuestions(response);
  const firstQuestionId = questions[0]?.id;
  return {
    questionId: firstQuestionId ?? null,
    questionIndex: firstQuestionId ? 0 : questions.length,
    finished: firstQuestionId === undefined,
  };
}

function nextStep(
  response: EnabledPublicResponseDescription,
  current: ActiveStep,
): ActiveStep {
  const questions = orderedQuestions(response);
  const nextIndex = current.questionIndex + 1;
  const nextQuestion = questions[nextIndex];
  if (nextQuestion) {
    return {
      questionId: nextQuestion.id,
      questionIndex: nextIndex,
      finished: false,
    };
  }

  return {
    questionId: null,
    questionIndex: questions.length,
    finished: true,
  };
}

export function VisitorResponseForm({
  slug,
  response,
  preview = false,
}: VisitorResponseFormProps): React.JSX.Element {
  const responseRootRef = useRef<HTMLElement>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [activeStep, setActiveStep] = useState<ActiveStep>(() =>
    firstStep(response),
  );
  const [history, setHistory] = useState<ActiveStep[]>([]);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const previousStepRef = useRef<ActiveStep | null>(null);
  const questionPromptRef = useRef<HTMLLegendElement>(null);
  const finalHeadingRef = useRef<HTMLHeadingElement>(null);
  const questions = useMemo(() => orderedQuestions(response), [response]);
  const activeQuestion = useMemo(
    () =>
      questions.find((question) => question.id === activeStep.questionId) ??
      null,
    [activeStep.questionId, questions],
  );
  const hasAnswer = Object.values(answers).some(
    (answer) => Boolean(answer.choiceId) || Boolean(answer.textAnswer?.trim()),
  );
  const canSend = hasAnswer;
  const activeAnswer = activeQuestion ? answers[activeQuestion.id] : undefined;
  const activeTextAnswer = activeAnswer?.textAnswer ?? "";
  const completedQuestionCount = Math.min(
    activeStep.finished ? questions.length : activeStep.questionIndex,
    questions.length,
  );

  useGSAP(
    () => {
      if (!activeQuestion && !activeStep.finished) return;
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const stage = responseRootRef.current?.querySelector<HTMLElement>(
          `.${styles.questionStage}`,
        );
        if (!stage) return;

        const progress = responseRootRef.current?.querySelector<HTMLElement>(
          `.${styles.progressHeader}`,
        );
        const progressDots = progress
          ? Array.from(
              progress.querySelectorAll<HTMLElement>(`.${styles.progressDot}`),
            )
          : [];

        const content = stage.querySelector<HTMLElement>(
          `.${styles.questionCard}, .${styles.finalStep}`,
        );
        if (!content) return;

        const action = content.querySelector<HTMLElement>(
          `.${styles.continueButton}, .${styles.sendButton}`,
        );
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
        });

        if (progress) {
          timeline.fromTo(
            progress,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.28 },
          );
        }

        if (progressDots.length > 0) {
          timeline.fromTo(
            progressDots,
            { autoAlpha: 0, scale: 0.7 },
            {
              autoAlpha: 1,
              scale: 1,
              duration: 0.2,
              stagger: 0.04,
            },
            "<0.06",
          );
        }

        timeline.fromTo(
          content,
          { autoAlpha: 0, y: 20, scale: 0.985 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.42 },
        );

        if (action) {
          timeline.fromTo(
            action,
            { autoAlpha: 0, y: 10, scale: 0.96 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.3 },
            "<0.08",
          );
        }

      });

      return () => media.revert();
    },
    {
      scope: responseRootRef,
      dependencies: [activeQuestion?.id, activeStep.finished],
      revertOnUpdate: true,
    },
  );

  useEffect(() => {
    const previousStep = previousStepRef.current;
    const stepChanged =
      previousStep !== null &&
      (previousStep.questionId !== activeStep.questionId ||
        previousStep.finished !== activeStep.finished);

    previousStepRef.current = activeStep;

    if (!stepChanged) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (activeQuestion) {
        questionPromptRef.current?.focus({ preventScroll: true });
      } else {
        finalHeadingRef.current?.focus({ preventScroll: true });
      }
    });
  }, [activeQuestion, activeStep]);

  function moveForward(nextStepValue: ActiveStep): void {
    setHistory((current) => [...current, activeStep]);
    setActiveStep(nextStepValue);
  }

  function moveBack(): void {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory(history.slice(0, -1));
    setActiveStep(previous);
    setStatus("idle");
    setErrorMessage(null);
  }
  function updateAnswer(questionId: string, value: AnswerValue): void {
    const previous = answers[questionId];
    const changed =
      previous?.choiceId !== value.choiceId ||
      previous?.textAnswer !== value.textAnswer;
    if (changed) {
      idempotencyKeyRef.current = null;
      setHistory((historyEntries) =>
        historyEntries.filter(
          (entry) => entry.questionIndex < activeStep.questionIndex,
        ),
      );
      setStatus("idle");
      setErrorMessage(null);
    }
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function answerChoice(question: PublicQuestion, choiceId: string): void {
    updateAnswer(question.id, { choiceId });
  }

  function continueChoiceQuestion(question: PublicQuestion): void {
    if (!answers[question.id]?.choiceId) {
      setStatus("error");
      setErrorMessage("Choose an answer before continuing.");
      return;
    }
    moveForward(nextStep(response, activeStep));
    setErrorMessage(null);
  }

  function continueTextQuestion(question: PublicQuestion): void {
    const textAnswer = answers[question.id]?.textAnswer?.trim();
    if (!textAnswer) {
      setStatus("error");
      setErrorMessage("Write an answer before continuing.");
      return;
    }
    moveForward(nextStep(response, activeStep));
    setErrorMessage(null);
  }

  function skipQuestion(question: PublicQuestion): void {
    idempotencyKeyRef.current = null;
    setAnswers((current) => {
      const next = { ...current };
      delete next[question.id];
      return next;
    });
    moveForward(nextStep(response, activeStep));
    setStatus("idle");
    setErrorMessage(null);
  }

  function buildAnswers(): VisitorAnswerInput[] {
    return questions
      .map((question) => {
        const answer = answers[question.id] ?? {};
        return {
          questionId: question.id,
          choiceId:
            question.type === "CHOICE" ? (answer.choiceId ?? null) : null,
          textAnswer:
            question.type === "PLAIN_MESSAGE"
              ? (answer.textAnswer?.trim() ?? null)
              : null,
        };
      })
      .filter(
        (answer) => answer.choiceId !== null || answer.textAnswer !== null,
      );
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (preview) return;

    const parsed = visitorSubmissionRequestSchema.safeParse({
      answers: buildAnswers(),
      idempotencyKey: idempotencyKeyRef.current ?? crypto.randomUUID(),
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage("Answer at least one question before sending.");
      return;
    }

    idempotencyKeyRef.current ??= parsed.data.idempotencyKey;
    setStatus("submitting");
    setErrorMessage(null);

    try {
      await submitPublicResponse(slug, parsed.data);
      setStatus("accepted");
    } catch (caught: unknown) {
      const error = caught as WebApiError;
      setStatus("error");
      setErrorMessage(error.message);
    }
  }

  if (status === "accepted") {
    return (
      <section className={styles.section} aria-live="polite">
        <div className={`${styles.panel} ${styles.acceptedPanel}`}>
          <span className={styles.acceptedHeart} aria-hidden="true">
            ♥
          </span>
          <p className={styles.eyebrow}>Response sent</p>
          <h2 className={styles.heading}>Thank you for sharing.</h2>
          <p className={styles.description}>
            Your private response was delivered to the page creator.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={responseRootRef}
      className={styles.section}
      aria-labelledby="response-title"
      aria-label={preview ? "Private response preview" : "Private response"}
    >
      <div className={styles.panel}>
        <div className={styles.shimmer} aria-hidden="true" />
        <h2 id="response-title" className={styles.visuallyHidden}>
          Leave a response
        </h2>

        <form
          className={styles.form}
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          {questions.length > 0 ? (
            <div className={styles.progressHeader} data-question-progress>
              <div
                className={styles.progressDots}
                role="progressbar"
                aria-label="Response progress"
                aria-valuemin={0}
                aria-valuemax={questions.length}
                aria-valuenow={completedQuestionCount}
                aria-valuetext={
                  activeStep.finished
                    ? "All questions complete"
                    : `Question ${activeStep.questionIndex + 1} of ${questions.length}`
                }
              >
                {questions.map((question, index) => (
                  <span
                    key={question.id}
                    className={`${styles.progressDot} ${
                      index < completedQuestionCount
                        ? styles.progressDotComplete
                        : ""
                    } ${
                      index === activeStep.questionIndex && !activeStep.finished
                        ? styles.progressDotActive
                        : ""
                    }`}
                    data-progress-dot
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.questionStage} aria-live="polite">
            {activeQuestion ? (
              <fieldset
                className={styles.questionCard}
                key={activeQuestion.id}
                data-question-card
                aria-describedby={errorMessage ? "response-error" : undefined}
              >
                <legend
                  ref={questionPromptRef}
                  className={styles.questionPrompt}
                  tabIndex={-1}
                >
                  {activeQuestion.prompt}
                </legend>

                {activeQuestion.type === "CHOICE" ? (
                  <>
                    <div className={styles.choiceGrid}>
                      {activeQuestion.choices.map((choice) => (
                        <label
                          key={choice.id}
                          className={styles.choice}
                          data-choice-card
                        >
                          <input
                            type="radio"
                            name={`question-${activeQuestion.id}`}
                            value={choice.id}
                            checked={
                              answers[activeQuestion.id]?.choiceId === choice.id
                            }
                            onChange={() =>
                              answerChoice(activeQuestion, choice.id)
                            }
                          />
                          <span
                            className={styles.choiceMarker}
                            aria-hidden="true"
                          >
                            <span
                              className={styles.choiceHeart}
                            >
                              &#9825;
                            </span>
                          </span>
                          <span className={styles.choiceText}>
                            {choice.label}
                          </span>
                          <span
                            className={styles.choiceCheck}
                            aria-hidden="true"
                          >
                            &#10003;
                          </span>
                        </label>
                      ))}
                    </div>
                    <div className={styles.questionActions}>
                      {history.length > 0 ? (
                        <button
                          className={styles.backButton}
                          type="button"
                          onClick={moveBack}
                        >
                          Back
                        </button>
                      ) : null}
                      <button
                        className={styles.continueButton}
                        type="button"
                        disabled={!answers[activeQuestion.id]?.choiceId}
                        onClick={() => continueChoiceQuestion(activeQuestion)}
                        aria-label="Continue to the next question"
                      >
                        Continue <span aria-hidden="true">&rarr;</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={styles.textAnswer}>
                    <textarea
                      id={`answer-${activeQuestion.id}`}
                      value={activeTextAnswer}
                      maxLength={response.textAnswerMaxLength}
                      placeholder="Write your answer here..."
                      aria-label="Your answer"
                      aria-describedby={`answer-${activeQuestion.id}-meta${
                        errorMessage ? " response-error" : ""
                      }`}
                      aria-invalid={
                        status === "error" && !activeTextAnswer.trim()
                          ? true
                          : undefined
                      }
                      onChange={(event) =>
                        updateAnswer(activeQuestion.id, {
                          textAnswer: event.target.value,
                        })
                      }
                    />
                    <div
                      className={styles.textAnswerMeta}
                      id={`answer-${activeQuestion.id}-meta`}
                    >
                      <span>
                        {activeTextAnswer.length} /{" "}
                        {response.textAnswerMaxLength}
                      </span>
                    </div>
                    <div className={styles.questionActions}>
                      {history.length > 0 ? (
                        <button
                          className={styles.backButton}
                          type="button"
                          onClick={moveBack}
                        >
                          Back
                        </button>
                      ) : null}
                      <button
                        className={styles.continueButton}
                        type="button"
                        disabled={
                          !answers[activeQuestion.id]?.textAnswer?.trim()
                        }
                        onClick={() => continueTextQuestion(activeQuestion)}
                        aria-label="Continue to the next question"
                      >
                        Continue <span aria-hidden="true">&rarr;</span>
                      </button>
                    </div>
                  </div>
                )}

                {!response.requiredAnswers ? (
                  <button
                    className={styles.skipButton}
                    type="button"
                    onClick={() => skipQuestion(activeQuestion)}
                  >
                    Skip this question
                  </button>
                ) : null}
              </fieldset>
            ) : (
              <div className={styles.finalStep} key="final-response-step">
                <span className={styles.finalHeart} aria-hidden="true">
                  ♥
                </span>
                <p className={styles.eyebrow}>
                  {activeStep.finished
                    ? "Journey complete"
                    : "Private response"}
                </p>
                <h3 ref={finalHeadingRef} tabIndex={-1}>
                  {activeStep.finished
                    ? "You reached the end."
                    : "A Message for Me?"}
                </h3>
                <p>
                  {activeStep.finished
                    ? "Thank you for taking a moment to share what is in your heart."
                    : "I&apos;d love to hear what&apos;s in your heart..."}
                </p>

                {history.length > 0 ? (
                  <button
                    className={styles.backButton}
                    type="button"
                    onClick={moveBack}
                  >
                    Back
                  </button>
                ) : null}

                {!canSend ? (
                  <p className={styles.sendHint}>
                    Answer at least one question before sending.
                  </p>
                ) : null}

                <button
                  className={styles.sendButton}
                  type="submit"
                  aria-label="Send my response"
                  disabled={status === "submitting" || !canSend}
                >
                  <span aria-hidden="true">♡</span>
                  <span>
                    {status === "submitting"
                      ? "Sending my response..."
                      : "Send my response"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {errorMessage ? (
            <p className={styles.error} id="response-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
