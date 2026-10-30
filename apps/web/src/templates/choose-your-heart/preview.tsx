"use client";

import { useState } from "react";
import type { PageJourneyPublicPageProjection } from "@letterly/contracts/page-journeys";
import {
  ChooseYourHeartRenderer,
  type JourneySubmissionStatus,
} from "./renderer";

const mockLetter = {
  title: "A Love Letter",
  recipientName: "Genevieve",
  mainMessage:
    "Every ordinary day turns subtly magical the instant you come to mind. I caught myself smiling in the middle of a noisy café this morning simply because someone laughed in a cadence that echoed yours.\n\nThank you for being my anchor in quiet moments and my wildest partner in every adventure. Whatever tomorrow asks of us, knowing your hand is in mine makes every uncertainty feel like poetry.",
  creatorName: "Julian",
};

const mockPreviewPage: PageJourneyPublicPageProjection = {
  displaySlug: "preview",
  canonicalUrl: "https://letterly.app/templates/choose-your-heart",
  template: {
    key: "choose-your-heart",
    version: 1,
  },
  letter: mockLetter,
  publishedGraphVersion: 1,
  rootQuestionKey: "moments",
  maxDepth: 3,
  questions: [
    {
      key: "moments",
      prompt: "Which little moment with us makes you smile every time?",
      displayOrder: 0,
      choices: [
        {
          key: "late-walks",
          label: "Our late walks home",
          displayOrder: 0,
          nextQuestionKey: null,
          outcomeKey: "warmth",
        },
        {
          key: "first-trip",
          label: "Our first weekend away",
          displayOrder: 1,
          nextQuestionKey: null,
          outcomeKey: "adventure",
        },
        {
          key: "kitchen-dance",
          label: "Dancing in the kitchen",
          displayOrder: 2,
          nextQuestionKey: null,
          outcomeKey: "peace",
        },
      ],
    },
  ],
  outcomes: [
    {
      key: "warmth",
      title: "A heart full of warmth",
      resultMessage: "You hold close the quiet moments that made us smile.",
      displayOrder: 0,
    },
    {
      key: "adventure",
      title: "A spirit of discovery",
      resultMessage: "You treasure every new place we stepped into together.",
      displayOrder: 1,
    },
    {
      key: "peace",
      title: "A gentle rhythm",
      resultMessage: "You find magic in everyday songs and laughter.",
      displayOrder: 2,
    },
  ],
  images: [],
  response: {
    enabled: true,
    requiredAnswers: false,
    visitorMessageEnabled: true,
    visitorMessagePrompt: "Leave Julian a private note",
    visitorMessagePrivacyText: "Only Julian can read your response.",
    visitorMessageMaxLength: 500,
    textAnswerMaxLength: 500,
  },
};

export function ChooseYourHeartPreview(): React.JSX.Element {
  const [submissionStatus, setSubmissionStatus] =
    useState<JourneySubmissionStatus>("idle");

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ChooseYourHeartRenderer
        contained
        page={mockPreviewPage}
        submissionStatus={submissionStatus}
        submissionError={null}
        onSubmit={() => setSubmissionStatus("accepted")}
        onResetResponse={() => setSubmissionStatus("idle")}
        onOutcomeChanged={() => {}}
      />
    </div>
  );
}
