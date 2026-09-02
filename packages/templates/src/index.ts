import { z } from "zod";
import {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterRenderModelSchema,
  secretLetterEncryptedPasswordSchema,
  secretLetterPrivateSettingsSchema,
  secretLetterSettingsSchema,
  type SecretLetterContent,
  type SecretLetterEditableContent,
  type SecretLetterRenderModel,
  type SecretLetterEncryptedPassword,
  type SecretLetterPrivateSettings,
  type SecretLetterSettings,
} from "./secret-letter.js";
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartSettingsSchema,
  chooseYourHeartTemplate,
} from "./choose-your-heart.js";

export { countGraphemes, hasAtMostGraphemes } from "./graphemes.js";
export {
  pageJourneyChoiceSchema,
  pageJourneyChoiceLabelSchema,
  pageJourneyGraphSchema,
  pageJourneyOutcomeSchema,
  pageJourneyOutcomeMessageSchema,
  pageJourneyOutcomeTitleSchema,
  pageJourneyQuestionSchema,
  pageJourneyQuestionPromptSchema,
  pageJourneySnapshotSchema,
  validatePageJourneyGraph,
} from "./journey.js";

export type {
  PageJourneyChoice,
  PageJourneyGraph,
  PageJourneyOutcome,
  PageJourneyQuestion,
  PageJourneySnapshot,
  PageJourneyValidationIssue,
  PageJourneyValidationResult,
} from "./journey.js";

export {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterSettingsSchema,
  secretLetterRenderModelSchema,
  secretLetterEncryptedPasswordSchema,
  secretLetterPrivateSettingsSchema,
  chooseYourHeartSettingsSchema,
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
};

export type {
  SecretLetterContent,
  SecretLetterEditableContent,
  SecretLetterSettings,
  SecretLetterRenderModel,
  SecretLetterEncryptedPassword,
  SecretLetterPrivateSettings,
};

export const templateCapabilitySchema = z.enum([
  "images",
  "audio",
  "questions",
  "visitorMessage",
  "passwordProtection",
]);

export type TemplateCapability = z.infer<typeof templateCapabilitySchema>;

export const secretLetterTemplate = {
  registryKey: "confession.secret-letter",
  version: 1,
  capabilities: [
    "images",
    "audio",
    "questions",
    "visitorMessage",
    "passwordProtection",
  ] as const,
  defaultContent: {
    recipientName: "",
    mainMessage: "",
    sections: [],
  },
  defaultSettings: {
    theme: "romantic",
    fontStyle: "handwritten",
    autoPlayMusic: false,
    music: null,
  },
  contentSchema: secretLetterContentSchema,
  settingsSchema: secretLetterSettingsSchema,
  publishRequirements: {
    requiredContentFields: ["recipientName", "mainMessage"] as const,
  },
  questionRules: {
    required: false,
  },
  response: {
    visitorMessagePrompt: "Private message",
    visitorMessagePrivacyText: "Only the page creator can read this message",
    visitorMessageMaxLength: 2_000,
    textAnswerMaxLength: 2_000,
  },
  renderer: {
    key: "secret-letter",
  },
} as const;

export const templateRegistry = {
  [secretLetterTemplate.registryKey]: secretLetterTemplate,
  [chooseYourHeartTemplate.registryKey]: chooseYourHeartTemplate,
} as const;
