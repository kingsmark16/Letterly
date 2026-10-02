import { chooseYourHeartDefaultGraph } from "@letterly/templates/choose-your-heart";
import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
  type ChooseYourHeartQuestion as Question,
} from "./first-section";
export function ChooseYourHeartThumbnail({
  id,
  journeyQuestion,
}: {
  id: string;
  journeyQuestion?: Question | null;
}): React.JSX.Element {
  const question =
    journeyQuestion === undefined
      ? chooseYourHeartDefaultGraph.questions[0]
      : journeyQuestion;
  return (
    <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-8 sm:py-16">
      <ChooseYourHeartFirstSection
        answeredLabel="0 answered"
        idPrefix={id}
        progress={0}
      >
        {question ? (
          <ChooseYourHeartQuestion question={question} questionNumber={1} />
        ) : null}
      </ChooseYourHeartFirstSection>
    </main>
  );
}
