"use client";

import {
  visitorSubmissionRequestSchema,
  type VisitorAnswerInput,
} from "@letterly/contracts/submissions";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import { useMemo, useRef, useState } from "react";
import {
  submitPublicResponse,
  type WebApiError,
} from "../../../lib/api-client";

interface VisitorResponseFormProps {
  slug: string;
  response: EnabledPublicResponseDescription;
}

type AnswerValue = {
  choiceId?: string;
  textAnswer?: string;
};

function reachableQuestionIds(
  response: EnabledPublicResponseDescription,
  answers: Record<string, AnswerValue>,
): Set<string> {
  const questions = new Map(
    response.questions.map((question) => [question.id, question]),
  );
  const reachable = new Set<string>();
  const visited = new Set<string>();

  function visit(questionId: string): void {
    if (visited.has(questionId)) return;
    const question = questions.get(questionId);
    if (!question) return;
    visited.add(questionId);
    reachable.add(questionId);
    const answer = answers[questionId];
    const nextQuestionId =
      question.type === "CHOICE"
        ? question.choices.find((choice) => choice.id === answer?.choiceId)
            ?.nextQuestionId
        : question.nextQuestionId;
    if (nextQuestionId) visit(nextQuestionId);
  }

  response.rootQuestionIds.forEach(visit);
  return reachable;
}

function visibleQuestions(
  response: EnabledPublicResponseDescription,
  answers: Record<string, AnswerValue>,
) {
  const reachable = reachableQuestionIds(response, answers);
  return response.questions.filter((question) => reachable.has(question.id));
}

export function VisitorResponseForm({
  slug,
  response,
}: VisitorResponseFormProps): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [visitorMessage, setVisitorMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "accepted" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const visible = useMemo(
    () => visibleQuestions(response, answers),
    [response, answers],
  );

  function updateAnswer(questionId: string, value: AnswerValue): void {
    idempotencyKeyRef.current = null;
    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      const reachable = reachableQuestionIds(response, next);
      return Object.fromEntries(
        Object.entries(next).filter(([id]) => reachable.has(id)),
      );
    });
    setStatus("idle");
    setErrorMessage(null);
  }

  function buildAnswers(): VisitorAnswerInput[] {
    const reachable = reachableQuestionIds(response, answers);
    return visible
      .filter((question) => reachable.has(question.id))
      .map((question) => {
        const answer = answers[question.id] ?? {};
        return {
          questionId: question.id,
          choiceId:
            question.type === "CHOICE" ? (answer.choiceId ?? null) : null,
          textAnswer:
            question.type === "PLAIN_MESSAGE"
              ? (answer.textAnswer ?? null)
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
      <section
        className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-7 lg:px-8"
        aria-live="polite"
      >
        <div className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Response sent
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Thank you for sharing.
          </h2>
          <p className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted">
            Your private response was delivered to the page creator.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto w-full max-w-5xl px-5 pb-12 sm:px-7 lg:px-8"
      aria-labelledby="response-title"
    >
      <div className="rounded-large border border-border bg-surface p-7 shadow-low sm:p-9">
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
          A private reply
        </p>
        <h2
          id="response-title"
          className="mt-2 font-display text-3xl font-semibold tracking-tight"
        >
          Leave a response
        </h2>
        <p className="mt-3 max-w-2xl text-body leading-relaxed text-ink-muted">
          Your answers go only to the person who shared this letter.
        </p>

        <form
          className="mt-8 space-y-7"
          onSubmit={(event) => void submit(event)}
          noValidate
        >
          {visible.map((question) => (
            <fieldset className="space-y-3" key={question.id}>
              <legend className="text-body font-semibold text-ink">
                {question.prompt}
              </legend>
              {question.type === "CHOICE" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-medium border border-border bg-surface-muted px-4 py-3 text-small text-ink hover:border-wine"
                    >
                      <input
                        className="size-4 accent-wine"
                        type="radio"
                        name={`question-${question.id}`}
                        value={choice.id}
                        checked={answers[question.id]?.choiceId === choice.id}
                        onChange={() =>
                          updateAnswer(question.id, { choiceId: choice.id })
                        }
                      />
                      <span>{choice.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="min-h-28 w-full rounded-medium border border-border bg-surface-muted px-4 py-3 text-body text-ink outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                  value={answers[question.id]?.textAnswer ?? ""}
                  maxLength={response.textAnswerMaxLength}
                  onChange={(event) =>
                    updateAnswer(question.id, {
                      textAnswer: event.target.value,
                    })
                  }
                  aria-label={question.prompt}
                />
              )}
            </fieldset>
          ))}

          {response.visitorMessageEnabled ? (
            <div className="space-y-3">
              <label
                className="text-body font-semibold text-ink"
                htmlFor="visitor-message"
              >
                {response.visitorMessagePrompt}{" "}
                <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <textarea
                id="visitor-message"
                className="min-h-32 w-full rounded-medium border border-border bg-surface-muted px-4 py-3 text-body text-ink outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                value={visitorMessage}
                maxLength={response.visitorMessageMaxLength}
                onChange={(event) => {
                  idempotencyKeyRef.current = null;
                  setVisitorMessage(event.target.value);
                  setStatus("idle");
                  setErrorMessage(null);
                }}
                aria-describedby="visitor-message-note"
              />
              <p
                id="visitor-message-note"
                className="text-small text-ink-muted"
              >
                {response.visitorMessagePrivacyText}. {visitorMessage.length}/
                {response.visitorMessageMaxLength}
              </p>
            </div>
          ) : null}

          {errorMessage ? (
            <p
              className="rounded-medium border border-rose bg-surface-muted px-4 py-3 text-small text-wine"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <button
              className="min-h-11 rounded-medium bg-wine px-5 py-3 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending..." : "Send private response"}
            </button>
            <p className="text-small text-ink-muted" aria-live="polite">
              {status === "error"
                ? "Your answers remain here. You can try again."
                : "You can send one response from this browser."}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
