import type { ReactNode } from "react";

export type ChooseYourHeartQuestion = {
  choices: ReadonlyArray<{
    key: string;
    label: string;
  }>;
  prompt: string;
};

type ChooseYourHeartFirstSectionProps = {
  answeredLabel: string;
  children: ReactNode;
  idPrefix?: string;
  progress: number;
};

type ChooseYourHeartQuestionProps = {
  onBack?: () => void;
  onChoose?: (choiceKey: string) => void;
  question: ChooseYourHeartQuestion;
  questionNumber: number;
};

export function ChooseYourHeartFirstSection({
  answeredLabel,
  children,
  idPrefix = "journey",
  progress,
}: ChooseYourHeartFirstSectionProps): React.JSX.Element {
  const titleId = `${idPrefix}-title`;

  return (
    <section
      className="mx-auto w-full max-w-2xl rounded-large border border-border bg-surface p-7 shadow-low sm:p-10"
      aria-labelledby={titleId}
    >
      <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
        A guided heart journey
      </p>
      <h1
        id={titleId}
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
          {answeredLabel}
        </p>
      </div>
      <noscript>
        <p className="mt-5 rounded-medium border border-border bg-surface-muted p-4 text-small text-ink-muted">
          Enable JavaScript to choose an answer and continue through this
          journey.
        </p>
      </noscript>

      {children}
    </section>
  );
}

export function ChooseYourHeartQuestion({
  onBack,
  onChoose,
  question,
  questionNumber,
}: ChooseYourHeartQuestionProps): React.JSX.Element {
  return (
    <div className="mt-10" aria-live={onChoose ? "polite" : undefined}>
      <p className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
        Question {questionNumber}
      </p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {question.prompt}
      </h2>
      <div className="mt-7 grid gap-3">
        {question.choices.map((choice) =>
          onChoose ? (
            <button
              className="min-h-14 rounded-medium border border-border bg-surface-muted px-5 py-4 text-left text-body font-semibold text-ink transition-colors hover:border-wine hover:text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
              key={choice.key}
              type="button"
              onClick={() => onChoose(choice.key)}
            >
              {choice.label}
            </button>
          ) : (
            <span
              className="min-h-14 rounded-medium border border-border bg-surface-muted px-5 py-4 text-left text-body font-semibold text-ink"
              key={choice.key}
              aria-hidden="true"
            >
              {choice.label}
            </span>
          ),
        )}
      </div>
      {onBack ? (
        <button
          className="mt-6 min-h-11 rounded-medium px-4 py-3 text-small font-bold text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      ) : null}
    </div>
  );
}
