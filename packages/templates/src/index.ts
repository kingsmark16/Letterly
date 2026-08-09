import { z } from "zod";
import {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterSettingsSchema,
  type SecretLetterContent,
  type SecretLetterEditableContent,
  type SecretLetterSettings,
} from "./secret-letter.js";

export { countGraphemes, hasAtMostGraphemes } from "./graphemes.js";

export {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterSettingsSchema,
};

export type {
  SecretLetterContent,
  SecretLetterEditableContent,
  SecretLetterSettings,
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
  },
  contentSchema: secretLetterContentSchema,
  settingsSchema: secretLetterSettingsSchema,
  publishRequirements: {
    requiredContentFields: ["recipientName", "mainMessage"] as const,
  },
  renderer: {
    key: "secret-letter",
  },
} as const;

export const templateRegistry = {
  [secretLetterTemplate.registryKey]: secretLetterTemplate,
} as const;
