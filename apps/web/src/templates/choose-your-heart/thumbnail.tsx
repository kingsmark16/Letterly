import { chooseYourHeartDefaultGraph } from "@letterly/templates/choose-your-heart";
import styles from "./choose-your-heart.module.css";
import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
  type ChooseYourHeartQuestion as Question,
} from "./first-section";
import { StarlightShaderCanvas } from "./starlight-shader-canvas";

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
    <main
      className={`${styles.stage} h-full w-full overflow-hidden px-2 py-2 sm:px-4 sm:py-4`}
    >
      <StarlightShaderCanvas contained />
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
