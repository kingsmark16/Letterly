"use client";

import { useState } from "react";
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
  const [selectedChoiceKey, setSelectedChoiceKey] = useState<string | null>(
    null,
  );
  const selectedChoice = mockJourneyQuestion.choices.find(
    (choice) => choice.key === selectedChoiceKey,
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ChooseYourHeartFirstSection
        answeredLabel={selectedChoice ? "Answer saved" : "Choose one answer"}
        idPrefix="template-preview-journey"
        letter={mockLetter}
        progress={selectedChoice ? 100 : 0}
        questionCount={1}
      >
        <div className="relative">
          <ChooseYourHeartQuestion
            onChoose={setSelectedChoiceKey}
            question={mockJourneyQuestion}
            questionNumber={1}
            selectedChoiceKey={selectedChoiceKey ?? undefined}
            totalQuestions={1}
          />
          {selectedChoice ? (
            <p
              className="mt-2 text-center text-[10px] font-semibold tracking-wide text-[#6c002a]"
              role="status"
              aria-live="polite"
            >
              “{selectedChoice.label}” is the kind of detail this journey
              remembers.
            </p>
          ) : null}
        </div>
      </ChooseYourHeartFirstSection>
    </div>
  );
}
