import {
  secretLetterContentSchema,
  secretLetterEditableContentSchema,
  secretLetterSettingsSchema,
} from "@letterly/templates/secret-letter";
import {
  apiErrorCodeSchema,
  apiErrorEnvelopeSchema,
} from "@letterly/contracts/errors";
import { z } from "zod";

const uuidSchema = z.string().uuid();

const timestampSchema = z.string().datetime({
  offset: true,
});

const rawSlugSchema = z.string().trim().min(1).max(48);

export const publicSlugSchema = z
  .string()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const reservedPublicSlugValues = [
  "api",
  "auth",
  "create",
  "dashboard",
  "p",
  "sign-in",
  "_next",
  "favicon.ico",
] as const;

export function normalizePublicSlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isReservedPublicSlug(value: string): boolean {
  return (reservedPublicSlugValues as readonly string[]).includes(value);
}

export const pageStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
]);

export const listPagesStatusSchema = z.union([
  pageStatusSchema,
  z.literal("ALL"),
]);

export const createPageRequestSchema = z.object({
  templateVersionId: uuidSchema,
  recipientName:
    secretLetterEditableContentSchema.shape.recipientName.optional(),
  mainMessage: secretLetterEditableContentSchema.shape.mainMessage.optional(),
});

export const savePageRequestSchema = z.object({
  recipientName: secretLetterEditableContentSchema.shape.recipientName,
  mainMessage: secretLetterEditableContentSchema.shape.mainMessage,
  responsesEnabled: z.boolean().optional(),
  expectedContentVersion: z.number().int().nonnegative(),
  images: z
    .array(
      z.object({
        imageId: uuidSchema,
        sortOrder: z.number().int().min(0).max(9),
        caption: z.string().trim().max(500).optional(),
      }),
    )
    .max(10)
    .optional(),
});

export const pageIdParamsSchema = z.object({
  pageId: uuidSchema,
});

export const imageIdParamsSchema = pageIdParamsSchema.extend({
  imageId: uuidSchema,
});

export const pageImageStateSchema = z.enum([
  "UPLOADING",
  "VERIFYING",
  "SANITIZING",
  "READY",
  "FAILED",
  "EXPIRED",
]);

export const ownerPageImageSchema = z.object({
  imageId: uuidSchema,
  state: pageImageStateSchema,
  attached: z.boolean(),
  sortOrder: z.number().int().min(0).max(9).nullable(),
  mediaUrl: z.string().startsWith("/").nullable(),
  caption: z.string().max(500).nullable(),
  failureCode: z.string().min(1).nullable(),
  expiresAt: timestampSchema.nullable(),
});

export const ownerPageImagesResponseSchema = z.array(ownerPageImageSchema);

export const publicPageImageSchema = z.object({
  imageId: uuidSchema,
  mediaUrl: z.string().startsWith("/"),
  caption: z.string().max(500).nullable(),
});

export const imageUploadRequestSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  byteSize: z.number().int().min(1).max(10_485_760),
  sha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  replaceImageId: uuidSchema.optional(),
});

export const imageUploadResponseSchema = z.object({
  imageId: uuidSchema,
  uploadUrl: z.string().url(),
  requiredHeaders: z.object({
    contentType: z.string().min(1),
    sha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/),
  }),
  uploadExpiresAt: timestampSchema,
  state: pageImageStateSchema,
});

export const imageOperationResponseSchema = z.object({
  imageId: uuidSchema,
  state: pageImageStateSchema,
  outputByteSize: z.number().int().positive().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  mediaUrl: z.string().startsWith("/").nullable(),
  failureCode: z.string().min(1).nullable(),
});

export const listPagesQuerySchema = z.object({
  status: listPagesStatusSchema.optional(),
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).default(20),
});

export const publishPageRequestSchema = z.object({
  customSlug: rawSlugSchema.nullable().optional(),
  confirmReady: z.boolean().default(false),
});

export const unpublishPageRequestSchema = z.object({
  confirm: z.boolean().default(false),
});

export const pagePasswordRequestSchema = z.object({
  password: z.string().min(1).max(256).nullable(),
});

export const pagePasswordResponseSchema = z.object({
  passwordProtected: z.boolean(),
});

export const publicPageUnlockRequestSchema = z.object({
  password: z.string().min(1).max(256),
});

export const publicPageUnlockResponseSchema = z.object({
  unlocked: z.literal(true),
});

export const changePublishedSlugRequestSchema = z.object({
  customSlug: rawSlugSchema,
});

export const publicPageSlugParamsSchema = z.object({
  slug: z.string().min(1).max(200),
});

export const templateSummarySchema = z.object({
  id: uuidSchema,
  key: z.string().min(1),
  name: z.string().min(1),
  templateVersionId: uuidSchema,
  version: z.number().int().positive(),
  registryKey: z.string().min(1),
});

export const ownerPageProjectionSchema = z.object({
  id: uuidSchema,
  slug: z.string().min(1),
  canonicalUrl: z.string().url().nullable(),
  recipientLabel: z.string().min(1),
  status: pageStatusSchema,
  contentVersion: z.number().int().nonnegative(),
  content: secretLetterContentSchema,
  settings: secretLetterSettingsSchema,
  template: templateSummarySchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  images: z.array(ownerPageImageSchema).max(11).default([]),
});

export const pageSummarySchema = z.object({
  id: uuidSchema,
  recipientLabel: z.string().min(1),
  status: pageStatusSchema,
  contentVersion: z.number().int().nonnegative(),
  template: templateSummarySchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const pageListResponseSchema = z.object({
  items: z.array(pageSummarySchema),
  nextCursor: z.string().nullable(),
});

// Kept as aliases for consumers that have not yet migrated from the original
// draft only owner list names.
export const draftSummarySchema = pageSummarySchema;
export const draftListResponseSchema = pageListResponseSchema;

export const pageLifecycleResponseSchema = z.object({
  pageId: uuidSchema,
  status: pageStatusSchema,
  slug: z.string().min(1),
  publicUrl: z.string().url(),
  publishedAt: timestampSchema.nullable(),
  unpublishedAt: timestampSchema.nullable(),
  contentVersion: z.number().int().nonnegative(),
  updatedAt: timestampSchema,
});

export const publicSecretLetterProjectionSchema = z.object({
  displaySlug: z.string().min(1),
  canonicalUrl: z.string().url(),
  template: z.object({
    key: z.literal("secret-letter"),
    version: z.number().int().positive(),
  }),
  recipientName: z.string().trim().min(1),
  mainMessage: z.string().trim().min(1),
  sections: z.array(z.never()),
  images: z.array(publicPageImageSchema).max(10).default([]),
  response: z
    .discriminatedUnion("enabled", [
      z.object({
        enabled: z.literal(false),
      }),
      z.object({
        enabled: z.literal(true),
        requiredAnswers: z.boolean(),
        visitorMessageEnabled: z.boolean(),
        visitorMessagePrompt: z.string().min(1).max(2000),
        visitorMessagePrivacyText: z.string().min(1).max(2000),
        visitorMessageMaxLength: z.number().int().positive().max(2000),
        textAnswerMaxLength: z.number().int().positive().max(2000),
        rootQuestionIds: z.array(uuidSchema),
        questions: z.array(
          z.object({
            id: uuidSchema,
            type: z.enum(["CHOICE", "PLAIN_MESSAGE"]),
            prompt: z.string().trim().min(1).max(2000),
            displayOrder: z.number().int().nonnegative(),
            endsJourney: z.boolean(),
            nextQuestionId: uuidSchema.nullable(),
            choices: z.array(
              z.object({
                id: uuidSchema,
                label: z.string().trim().min(1).max(500),
                displayOrder: z.number().int().nonnegative(),
                endsJourney: z.boolean(),
                nextQuestionId: uuidSchema.nullable(),
              }),
            ),
          }),
        ),
      }),
    ])
    .optional()
    .default({ enabled: false }),
});

export const publicSecretLetterLockedProjectionSchema = z.object({
  state: z.literal("LOCKED"),
  displaySlug: z.string().min(1),
  canonicalUrl: z.string().url(),
  template: z.object({
    key: z.string().min(1),
    version: z.number().int().positive(),
  }),
});

export const publicSecretLetterResponseSchema = z.union([
  publicSecretLetterProjectionSchema,
  publicSecretLetterLockedProjectionSchema,
]);

export type PublicResponseDescription = NonNullable<
  z.infer<typeof publicSecretLetterProjectionSchema>["response"]
>;

export type EnabledPublicResponseDescription = Extract<
  PublicResponseDescription,
  { enabled: true }
>;

export const pageErrorCodeSchema = apiErrorCodeSchema;

export const pageErrorEnvelopeSchema = apiErrorEnvelopeSchema;

export type CreatePageRequest = z.infer<typeof createPageRequestSchema>;

export type SavePageRequest = z.infer<typeof savePageRequestSchema>;

export type ImageUploadRequest = z.infer<typeof imageUploadRequestSchema>;

export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>;

export type ImageOperationResponse = z.infer<
  typeof imageOperationResponseSchema
>;

export type OwnerPageImage = z.infer<typeof ownerPageImageSchema>;

export type PublicPageImage = z.infer<typeof publicPageImageSchema>;

export type PageIdParams = z.infer<typeof pageIdParamsSchema>;

export type ImageIdParams = z.infer<typeof imageIdParamsSchema>;

export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>;

export type ListPagesStatus = z.infer<typeof listPagesStatusSchema>;

export type PageSummary = z.infer<typeof pageSummarySchema>;

export type PageListResponse = z.infer<typeof pageListResponseSchema>;

export type TemplateSummary = z.infer<typeof templateSummarySchema>;

export type OwnerPageProjection = z.infer<typeof ownerPageProjectionSchema>;

export type DraftSummary = z.infer<typeof draftSummarySchema>;

export type DraftListResponse = z.infer<typeof draftListResponseSchema>;

export type PublishPageRequest = z.infer<typeof publishPageRequestSchema>;

export type UnpublishPageRequest = z.infer<typeof unpublishPageRequestSchema>;

export type PagePasswordRequest = z.infer<typeof pagePasswordRequestSchema>;

export type PagePasswordResponse = z.infer<typeof pagePasswordResponseSchema>;

export type PublicPageUnlockRequest = z.infer<
  typeof publicPageUnlockRequestSchema
>;

export type PublicPageUnlockResponse = z.infer<
  typeof publicPageUnlockResponseSchema
>;

export type ChangePublishedSlugRequest = z.infer<
  typeof changePublishedSlugRequestSchema
>;

export type PageLifecycleResponse = z.infer<typeof pageLifecycleResponseSchema>;

export type PublicSecretLetterProjection =
  | (Omit<z.infer<typeof publicSecretLetterProjectionSchema>, "response"> & {
      response?: z.infer<typeof publicSecretLetterProjectionSchema>["response"];
    })
  | z.infer<typeof publicSecretLetterLockedProjectionSchema>;

export type PageErrorEnvelope = z.infer<typeof pageErrorEnvelopeSchema>;
