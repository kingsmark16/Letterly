import { z } from "zod";

export const templateCapabilitySchema = z.enum([
  "images",
  "audio",
  "questions",
  "visitorMessage",
]);

export type TemplateCapability = z.infer<typeof templateCapabilitySchema>;

const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum([
    "message",
    "image",
    "question",
    "visitorMessage",
    "postscript",
  ]),
  order: z.number().int().min(0),
});

export const secretLetterContentSchema = z.object({
  recipientName: z.string().max(120),
  mainMessage: z.string().max(20_000),
  sections: z.array(sectionSchema).max(100),
});

const musicSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("upload"),
    mediaAssetId: z.string().uuid(),
  }),
  z.object({
    source: z.literal("youtube"),
    youtubeVideoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  }),
]);

export const secretLetterSettingsSchema = z.object({
  theme: z.string().min(1).max(64),
  fontStyle: z.string().min(1).max(64),
  autoPlayMusic: z.boolean(),
  music: musicSchema.nullable(),
});

export type SecretLetterContent = z.infer<typeof secretLetterContentSchema>;

export type SecretLetterSettings = z.infer<typeof secretLetterSettingsSchema>;

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
