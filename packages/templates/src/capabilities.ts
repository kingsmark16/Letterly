import { z } from "zod";

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
