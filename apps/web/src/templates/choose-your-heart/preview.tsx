import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
} from "./first-section";

const mockJourneyQuestion = {
  prompt: "Which little moment with us makes you smile every time?",
  choices: [
    { key: "late-walks", label: "Our late walks home" },
    { key: "first-trip", label: "Our first weekend away" },
    { key: "kitchen-dance", label: "Dancing in the kitchen" },
  ],
};

export function ChooseYourHeartPreview(): React.JSX.Element {
  return (
    <ChooseYourHeartFirstSection
      answeredLabel="0 answered"
      idPrefix="template-preview-journey"
      progress={0}
    >
      <ChooseYourHeartQuestion
        question={mockJourneyQuestion}
        questionNumber={1}
      />
    </ChooseYourHeartFirstSection>
  );
}
