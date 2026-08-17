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

export const secretLetterRenderModelSchema = z.object({
  recipientName: z.string().trim().min(1),
  mainMessage: z.string().trim().min(1),
  sections: z.array(z.never()),
  images: z
    .array(
      z.object({
        imageId: z.string().uuid(),
        mediaUrl: z.string().startsWith("/"),
        caption: z.string().max(500).nullable(),
      }),
    )
    .max(10)
    .default([]),
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
  responsesEnabled: z.boolean().default(false),
});

export const secretLetterEncryptedPasswordSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  authTag: z.string().min(1),
  keyVersion: z.string().min(1),
  passwordVersion: z.string().min(1),
});

export const secretLetterPrivateSettingsSchema =
  secretLetterSettingsSchema.extend({
    passwordProtection: secretLetterEncryptedPasswordSchema
      .nullable()
      .default(null),
  });

export type SecretLetterEditableContent = z.infer<
  typeof secretLetterEditableContentSchema
>;

export type SecretLetterContent = z.infer<typeof secretLetterContentSchema>;

export type SecretLetterRenderModel = z.infer<
  typeof secretLetterRenderModelSchema
>;

export type SecretLetterSettings = Omit<
  z.infer<typeof secretLetterSettingsSchema>,
  "responsesEnabled"
> & {
  responsesEnabled?: boolean;
};

export type SecretLetterEncryptedPassword = z.infer<
  typeof secretLetterEncryptedPasswordSchema
>;

export type SecretLetterPrivateSettings = z.infer<
  typeof secretLetterPrivateSettingsSchema
>;
