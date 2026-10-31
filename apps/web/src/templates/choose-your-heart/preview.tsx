"use client";

import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
} from "./first-section";

const mockLetter = {
  title: "Choose Your Heart",
  recipientName: "Genevieve",
  mainMessage:
    "Every ordinary day turns subtly magical the instant you come to mind. I caught myself smiling in the middle of a noisy café this morning simply because someone laughed in a cadence that echoed yours.\n\nThank you for being my anchor in quiet moments and my wildest partner in every adventure. Whatever tomorrow asks of us, knowing your hand is in mine makes every uncertainty feel like poetry.",
  creatorName: "Julian",
};

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
    <div className="relative h-full w-full overflow-hidden">
      <ChooseYourHeartFirstSection
        answeredLabel="0 answered"
        idPrefix="template-preview-journey"
        letter={mockLetter}
        progress={0}
        questionCount={1}
      >
        <ChooseYourHeartQuestion
          question={mockJourneyQuestion}
          questionNumber={1}
          totalQuestions={1}
        />
      </ChooseYourHeartFirstSection>
    </div>
  );
}
