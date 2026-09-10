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
} from "@letterly/templates/secret-letter";
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartSettingsSchema,
  chooseYourHeartTemplate,
} from "@letterly/templates/choose-your-heart";

export {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";
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
} from "@letterly/templates/journey";

export type {
  PageJourneyChoice,
  PageJourneyGraph,
  PageJourneyOutcome,
  PageJourneyQuestion,
  PageJourneySnapshot,
  PageJourneyValidationIssue,
  PageJourneyValidationResult,
} from "@letterly/templates/journey";

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

export const templateAudioCapabilitySchema = z.enum([
  "hidden",
  "optional",
  "required",
]);

export type TemplateAudioCapability = z.infer<
  typeof templateAudioCapabilitySchema
>;

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
  audioCapability: "optional" as TemplateAudioCapability,
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
