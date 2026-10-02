"use client";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import { SecretLetterPreview } from "../../../templates/secret-letter/preview";
import { VisitorResponseForm } from "../../pages/public/visitor-response-form";

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

export function SecretLetterCatalogPreview(): React.JSX.Element {
  return (
    <SecretLetterPreview>
      <VisitorResponseForm
        preview
        slug="template-preview"
        response={mockResponse}
      />
    </SecretLetterPreview>
  );
}
