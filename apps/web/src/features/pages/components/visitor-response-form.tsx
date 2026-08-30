"use client";

import {
  visitorSubmissionRequestSchema,
  type VisitorAnswerInput,
} from "@letterly/contracts/submissions";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  submitPublicResponse,
  type WebApiError,
} from "../../../lib/api-client";
import styles from "./visitor-response-form.module.css";

interface VisitorResponseFormProps {
  slug: string;
  response: EnabledPublicResponseDescription;
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
}: VisitorResponseFormProps): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [activeStep, setActiveStep] = useState<ActiveStep>(() =>
    firstStep(response),
  );
  const [history, setHistory] = useState<ActiveStep[]>([]);
  const [visitorMessage, setVisitorMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const questionPromptRef = useRef<HTMLLegendElement>(null);
  const finalHeadingRef = useRef<HTMLHeadingElement>(null);
  const questions = useMemo(() => orderedQuestions(response), [response]);
  const activeQuestion = useMemo(
    () => questions.find((question) => question.id === activeStep.questionId) ?? null,
    [activeStep.questionId, questions],
  );

  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (activeQuestion) {
        questionPromptRef.current?.focus();
      } else {
        finalHeadingRef.current?.focus();
      }
    });
  }, [activeQuestion, activeStep.finished]);

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
    idempotencyKeyRef.current = null;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setStatus("idle");
    setErrorMessage(null);
  }

  function answerChoice(question: PublicQuestion, choiceId: string): void {
    const answer = { choiceId };
    updateAnswer(question.id, answer);
    moveForward(nextStep(response, activeStep));
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
    const parsed = visitorSubmissionRequestSchema.safeParse({
      answers: buildAnswers(),
      visitorMessage: visitorMessage.trim() || undefined,
      idempotencyKey: idempotencyKeyRef.current ?? crypto.randomUUID(),
    });

    if (!parsed.success) {
      setStatus("error");
      setErrorMessage(
        "Answer a question or add a private message before sending.",
      );
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
      className={styles.section}
      aria-labelledby="response-title"
      aria-label="Private response"
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
          <div className={styles.questionStage} aria-live="polite">
            {activeQuestion ? (
              <fieldset className={styles.questionCard} key={activeQuestion.id}>
                <legend
                  ref={questionPromptRef}
                  className={styles.questionPrompt}
                  tabIndex={-1}
                >
                  {activeQuestion.prompt}
                </legend>

                {history.length > 0 ? (
                  <button
                    className={styles.backButton}
                    type="button"
                    onClick={moveBack}
                  >
                    Back
                  </button>
                ) : null}

                {activeQuestion.type === "CHOICE" ? (
                  <div className={styles.choiceGrid}>
                    {activeQuestion.choices.map((choice) => (
                      <label key={choice.id} className={styles.choice}>
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
                        <span>{choice.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className={styles.textAnswer}>
                    <textarea
                      value={answers[activeQuestion.id]?.textAnswer ?? ""}
                      maxLength={response.textAnswerMaxLength}
                      placeholder="Write your answer here..."
                      onChange={(event) =>
                        updateAnswer(activeQuestion.id, {
                          textAnswer: event.target.value,
                        })
                      }
                      aria-label={activeQuestion.prompt}
                    />
                    <button
                      className={styles.continueButton}
                      type="button"
                      disabled={!answers[activeQuestion.id]?.textAnswer?.trim()}
                      onClick={() => continueTextQuestion(activeQuestion)}
                    >
                      Continue
                    </button>
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

                {response.visitorMessageEnabled ? (
                  <div className={styles.messageField}>
                    <label htmlFor="visitor-message">
                      {response.visitorMessagePrompt} <span>(optional)</span>
                    </label>
                    <textarea
                      id="visitor-message"
                      value={visitorMessage}
                      maxLength={response.visitorMessageMaxLength}
                      placeholder="Write your reply here..."
                      onChange={(event) => {
                        idempotencyKeyRef.current = null;
                        setVisitorMessage(event.target.value);
                        setStatus("idle");
                        setErrorMessage(null);
                      }}
                      aria-describedby="visitor-message-note"
                    />
                    <p id="visitor-message-note">
                      {response.visitorMessagePrivacyText}.{" "}
                      {visitorMessage.length}/{response.visitorMessageMaxLength}
                    </p>
                  </div>
                ) : null}

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
                  className={styles.sendButton}
                  type="submit"
                  aria-label="Send private response"
                  disabled={status === "submitting"}
                >
                  <span aria-hidden="true">♡</span>
                  <span>
                    {status === "submitting" ? "Sending..." : "Send Love"}
                  </span>
                </button>
              </div>
            )}
          </div>

          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
