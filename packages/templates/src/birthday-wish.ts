import type {
  TemplateAudioCapability,
  TemplateCapability,
} from "@letterly/templates/capabilities";
import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from "@letterly/templates/secret-letter";

export const birthdayWishContentSchema = secretLetterContentSchema;
export const birthdayWishSettingsSchema = secretLetterSettingsSchema;

export const birthdayWishTemplate = {
  registryKey: "birthday.birthday-wish",
  version: 1,
  capabilities: [
    "images",
    "audio",
    "passwordProtection",
  ] as readonly TemplateCapability[],
  audioCapability: "optional" as TemplateAudioCapability,
  defaultContent: {
    recipientName: "",
    mainMessage: "",
    sections: [],
  },
  defaultSettings: {
    theme: "velvet-berry",
    fontStyle: "editorial",
    autoPlayMusic: false,
    music: null,
  },
  contentSchema: birthdayWishContentSchema,
  settingsSchema: birthdayWishSettingsSchema,
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
    key: "birthday-wish",
  },
} as const;
