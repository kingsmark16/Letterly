import { chooseYourHeartDefaultGraph } from "@letterly/templates";
import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
  type ChooseYourHeartQuestion as ChooseYourHeartQuestionData,
} from "../templates/choose-your-heart/first-section";
import { SecretLetterFirstSection } from "../templates/secret-letter";
import secretLetterStyles from "../templates/secret-letter/renderer.module.css";
import styles from "./template-first-section-thumbnail.module.css";

type TemplateFirstSectionThumbnailProps = {
  context?: "catalog" | "page";
  instanceId?: string;
  journeyQuestion?: ChooseYourHeartQuestionData | null;
  letterTitle?: string;
  templateKey: string;
};

const journeyThumbnailQuestion = chooseYourHeartDefaultGraph.questions[0];

export function TemplateFirstSectionThumbnail({
  context = "catalog",
  instanceId,
  journeyQuestion,
  letterTitle,
  templateKey,
}: TemplateFirstSectionThumbnailProps): React.JSX.Element {
  const isJourney = templateKey === "choose-your-heart";
  const resolvedLetterTitle = letterTitle?.trim() || "For you, always";
  const previewId = instanceId?.trim() || `template-${templateKey}`;
  const displayedQuestion =
    journeyQuestion === undefined ? journeyThumbnailQuestion : journeyQuestion;

  return (
    <div
      className={`${styles.artwork} ${
        isJourney ? styles.journeyArtwork : styles.letterArtwork
      } ${context === "page" ? styles.pageArtwork : ""}`}
      data-template-key={templateKey}
      data-template-thumbnail={templateKey}
      aria-hidden="true"
    >
      {isJourney ? (
        <div className={styles.actualTemplateFrame}>
          <main className="min-h-screen bg-canvas px-5 py-10 text-ink sm:px-8 sm:py-16">
            <ChooseYourHeartFirstSection
              answeredLabel="0 answered"
              idPrefix={previewId}
              progress={0}
            >
              {displayedQuestion ? (
                <ChooseYourHeartQuestion
                  question={displayedQuestion}
                  questionNumber={1}
                />
              ) : null}
            </ChooseYourHeartFirstSection>
          </main>
        </div>
      ) : (
        <div className={styles.actualTemplateFrame}>
          <div className={secretLetterStyles.rootFrame}>
            <div className={secretLetterStyles.root} data-preview="true">
              <main className={secretLetterStyles.mainContent}>
                <article className={secretLetterStyles.letterShell}>
                  <SecretLetterFirstSection
                    headingId={`${previewId}-heading`}
                    letterTitle={resolvedLetterTitle}
                    staticWordmark
                    storyId={`${previewId}-story`}
                  />
                </article>
              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
