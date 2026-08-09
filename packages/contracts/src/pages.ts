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

export const pageStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
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
  expectedContentVersion: z.number().int().nonnegative(),
});

export const pageIdParamsSchema = z.object({
  pageId: uuidSchema,
});

export const listPagesQuerySchema = z.object({
  status: z.literal("DRAFT").default("DRAFT"),
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).default(20),
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
  recipientLabel: z.string().min(1),
  status: pageStatusSchema,
  contentVersion: z.number().int().nonnegative(),
  content: secretLetterContentSchema,
  settings: secretLetterSettingsSchema,
  template: templateSummarySchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const draftSummarySchema = z.object({
  id: uuidSchema,
  recipientLabel: z.string().min(1),
  status: z.literal("DRAFT"),
  contentVersion: z.number().int().nonnegative(),
  template: templateSummarySchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const draftListResponseSchema = z.object({
  items: z.array(draftSummarySchema),
  nextCursor: z.string().nullable(),
});

export const pageErrorCodeSchema = apiErrorCodeSchema;

export const pageErrorEnvelopeSchema = apiErrorEnvelopeSchema;

export type CreatePageRequest = z.infer<typeof createPageRequestSchema>;

export type SavePageRequest = z.infer<typeof savePageRequestSchema>;

export type PageIdParams = z.infer<typeof pageIdParamsSchema>;

export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>;

export type TemplateSummary = z.infer<typeof templateSummarySchema>;

export type OwnerPageProjection = z.infer<typeof ownerPageProjectionSchema>;

export type DraftSummary = z.infer<typeof draftSummarySchema>;

export type DraftListResponse = z.infer<typeof draftListResponseSchema>;

export type PageErrorEnvelope = z.infer<typeof pageErrorEnvelopeSchema>;
