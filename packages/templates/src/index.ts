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

export { countGraphemes, hasAtMostGraphemes } from "./graphemes.js";

export {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterSettingsSchema,
  secretLetterRenderModelSchema,
  secretLetterEncryptedPasswordSchema,
  secretLetterPrivateSettingsSchema,
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
]);

export type TemplateCapability = z.infer<typeof templateCapabilitySchema>;

export const secretLetterTemplate = {
  registryKey: "confession.secret-letter",
  version: 1,
  capabilities: ["images", "audio", "questions", "visitorMessage"] as const,
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
    responsesEnabled: false,
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
} as const;
