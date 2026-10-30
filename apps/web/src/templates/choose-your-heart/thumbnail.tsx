import { chooseYourHeartDefaultGraph } from "@letterly/templates/choose-your-heart";

export type ChooseYourHeartQuestion = {
  choices: ReadonlyArray<{
    key: string;
    label: string;
  }>;
  prompt: string;
};

export function ChooseYourHeartThumbnail({
  id,
  journeyQuestion,
}: {
  id: string;
  journeyQuestion?: ChooseYourHeartQuestion | null;
}): React.JSX.Element {
  const question =
    journeyQuestion === undefined
      ? chooseYourHeartDefaultGraph.questions[0]
      : journeyQuestion;
  const titleId = `${id}-title`;

  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-8 sm:py-16">
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
        <div className="mt-8" aria-label="0% complete">
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-wine"
              style={{ width: "0%" }}
            />
          </div>
          <p className="mt-2 text-small text-ink-muted">0 answered</p>
        </div>
        {question ? (
          <div className="mt-10">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
              Question 1
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {question.prompt}
            </h2>
            <div className="mt-7 grid gap-3">
              {question.choices.map((choice) => (
                <span
                  className="min-h-14 rounded-medium border border-border bg-surface-muted px-5 py-4 text-left text-body font-semibold text-ink"
                  key={choice.key}
                  aria-hidden="true"
                >
                  {choice.label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
