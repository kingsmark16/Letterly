import { hasAtMostGraphemes } from "@letterly/templates/graphemes";
import { z } from "zod";

export {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";

const recipientNameSchema = z
  .string()
  .refine((value) => hasAtMostGraphemes(value, 120), {
    error: "recipientName must contain at most 120 graphemes",
  });

const mainMessageSchema = z
  .string()
  .refine((value) => hasAtMostGraphemes(value, 20_000), {
    error: "mainMessage must contain at most 20,000 graphemes",
  });

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

export const secretLetterEditableContentSchema = z.object({
  recipientName: recipientNameSchema,
  mainMessage: mainMessageSchema,
});

export const secretLetterContentSchema =
  secretLetterEditableContentSchema.extend({
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

export type SecretLetterEditableContent = z.infer<
  typeof secretLetterEditableContentSchema
>;

export type SecretLetterContent = z.infer<typeof secretLetterContentSchema>;

export type SecretLetterSettings = z.infer<typeof secretLetterSettingsSchema>;
