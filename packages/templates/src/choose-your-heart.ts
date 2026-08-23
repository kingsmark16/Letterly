import { z } from "zod";
import {
  pageJourneyGraphSchema,
  type PageJourneyGraph,
} from "./journey.js";

export const chooseYourHeartDefaultGraph: PageJourneyGraph =
  pageJourneyGraphSchema.parse({
    schemaVersion: 1,
    rootQuestionKey: "root",
    questions: [
      {
        key: "root",
        prompt: "What do you remember?",
        displayOrder: 0,
        choices: [
          {
            key: "happy",
            label: "The happy moments",
            displayOrder: 0,
            nextQuestionKey: null,
            outcomeKey: "happy-result",
          },
          {
            key: "quiet",
            label: "The quiet moments",
            displayOrder: 1,
            nextQuestionKey: null,
            outcomeKey: "quiet-result",
          },
        ],
      },
    ],
    outcomes: [
      {
        key: "happy-result",
        title: "A heart full of warmth",
        resultMessage: "You hold close the moments that made you smile.",
        displayOrder: 0,
      },
      {
        key: "quiet-result",
        title: "A heart at peace",
        resultMessage: "You remember the gentle moments that needed no words.",
        displayOrder: 1,
      },
    ],
  });

export const chooseYourHeartTemplate = {
  registryKey: "confession.choose-your-heart",
  version: 1,
  capabilities: ["questions", "visitorMessage"] as const,
  defaultContent: {},
  defaultSettings: {
    responsesEnabled: false,
  },
  contentSchema: z.object({}),
  settingsSchema: z.object({
    responsesEnabled: z.boolean().default(false),
  }),
  publishRequirements: {
    requiredContentFields: [] as const,
  },
  questionRules: {
    required: true,
  },
  response: {
    visitorMessagePrompt: "Private message",
    visitorMessagePrivacyText: "Only the page creator can read this message",
    visitorMessageMaxLength: 2_000,
    textAnswerMaxLength: 2_000,
  },
  journey: {
    defaultGraph: chooseYourHeartDefaultGraph,
  },
  renderer: {
    key: "choose-your-heart",
  },
} as const;
