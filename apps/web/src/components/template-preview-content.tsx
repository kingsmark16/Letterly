import type { SecretLetterRenderModel } from "@letterly/templates";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import Link from "next/link";
import coffeeMornings from "../templates/secret-letter/assets/coffee-mornings.jpg";
import handwrittenLetter from "../templates/secret-letter/assets/handwritten-letter.jpg";
import holdingHands from "../templates/secret-letter/assets/holding-hands.jpg";
import { VisitorResponseForm } from "../features/pages/components/visitor-response-form";
import { CreateDraftButton } from "../features/catalog/components/create-draft-button";
import {
  ChooseYourHeartFirstSection,
  ChooseYourHeartQuestion,
} from "../templates/choose-your-heart/first-section";
import { SecretLetterRenderer } from "../templates/secret-letter";
import { getTemplateVersionIdFromStartPath } from "../lib/return-path";
import styles from "./template-preview-dialog.module.css";

export type TemplatePreviewContentProps = {
  capabilities: string[];
  startHref: string;
  templateKey: string;
  templateVersionId?: string;
  templateName?: string;
};

const mockLetter: SecretLetterRenderModel = {
  title: "A few things I never want to forget",
  recipientName: "Maria",
  mainMessage:
    "I keep thinking about the small moments that have become my favorite parts of life with you: the rainy walk home when we missed the bus, our Sunday coffee that turns into a three-hour conversation, and the way you always remember to ask how the hard parts went.\n\nYou make room for all of me. You listen when I need to talk, make me laugh when I take myself too seriously, and somehow turn a quiet evening at home into the best part of my week. I hope I give that same kind of comfort back to you.\n\nWhen I look through these little memories, I don't just see where we were. I see how lucky I am to keep finding my way beside you. Thank you for making ordinary days feel like somewhere I want to stay.\n\nWhatever the next chapter brings, I hope you always know that you have someone in your corner. I love building a life with you, one ordinary day at a time.",
  creatorName: "Alex",
  sections: [],
  images: [
    {
      imageId: "00000000-0000-4000-8000-000000000001",
      mediaUrl: holdingHands.src,
      caption: "A long walk with nowhere else to be",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000002",
      mediaUrl: coffeeMornings.src,
      caption: "Slow mornings, two cups, and no rush",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000003",
      mediaUrl: handwrittenLetter.src,
      caption: "The note you left for me on our first trip",
    },
  ],
};

const mockResponse: EnabledPublicResponseDescription = {
  enabled: true,
  requiredAnswers: false,
  visitorMessageEnabled: true,
  visitorMessagePrompt: "Leave Alex a private note",
  visitorMessagePrivacyText: "Only Alex can read your response.",
  visitorMessageMaxLength: 500,
  textAnswerMaxLength: 500,
  questions: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      type: "CHOICE",
      prompt: "Which little moment with us makes you smile every time?",
      displayOrder: 0,
      choices: [
        {
          id: "20000000-0000-4000-8000-000000000001",
          label: "Our late walks home",
          displayOrder: 0,
        },
        {
          id: "20000000-0000-4000-8000-000000000002",
          label: "Our first weekend away",
          displayOrder: 1,
        },
        {
          id: "20000000-0000-4000-8000-000000000003",
          label: "Dancing in the kitchen",
          displayOrder: 2,
        },
      ],
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      type: "PLAIN_MESSAGE",
      prompt: "What is one small thing you want us to make time for next?",
      displayOrder: 1,
      choices: [],
    },
  ],
};

const mockJourneyQuestion = {
  prompt: "Which little moment with us makes you smile every time?",
  choices: [
    { key: "late-walks", label: "Our late walks home" },
    { key: "first-trip", label: "Our first weekend away" },
    { key: "kitchen-dance", label: "Dancing in the kitchen" },
  ],
};

const capabilityLabels: Record<string, string> = {
  images: "Memory images",
  audio: "Optional music",
  questions: "Interactive questions",
  visitorMessage: "Private replies",
  passwordProtection: "Password protection",
};

export function TemplatePreviewContent({
  capabilities,
  startHref,
  templateKey,
  templateVersionId,
  templateName,
}: TemplatePreviewContentProps): React.JSX.Element {
  const activeTemplateVersionId =
    templateVersionId ?? getTemplateVersionIdFromStartPath(startHref);

  return (
    <div className={styles.previewLayout}>
      <div className={styles.previewStage}>
        <div
          className={styles.letterPreviewScroll}
          role="region"
          aria-label={`${templateKey === "secret-letter" ? "Secret Letter" : "Template"} sample preview`}
          tabIndex={0}
        >
          {templateKey === "secret-letter" ? (
            <SecretLetterRenderer preview autoOpen model={mockLetter}>
              <VisitorResponseForm
                preview
                slug="template-preview"
                response={mockResponse}
              />
            </SecretLetterRenderer>
          ) : templateKey === "choose-your-heart" ? (
            <main className={styles.journeyPreview}>
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
            </main>
          ) : (
            <div className={styles.previewPaper}>
              <p className={styles.previewKicker}>A page made for feeling</p>
              <p className={styles.previewRecipient}>For someone special</p>
              <span className={styles.previewSeal}>L</span>
              <p className={styles.previewPrompt}>Open when you are ready</p>
            </div>
          )}
        </div>
      </div>

      <div className={styles.dialogContent}>
        <div className={styles.capabilitySection}>
          <p className={styles.capabilityHeading}>What this design supports</p>
          <ul className={styles.capabilityList}>
            {capabilities.map((capability) => (
              <li key={capability}>
                {capabilityLabels[capability] ?? capability}
              </li>
            ))}
          </ul>
        </div>

        {activeTemplateVersionId ? (
          <CreateDraftButton
            className={styles.useLink}
            label="Use this template"
            templateVersionId={activeTemplateVersionId}
            templateName={templateName}
          />
        ) : (
          <Link className={styles.useLink} href="/templates">
            Browse templates
          </Link>
        )}
      </div>
    </div>
  );
}
