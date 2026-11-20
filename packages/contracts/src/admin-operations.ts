import { z } from "zod";
import { publicSlugSchema, pageStatusSchema } from "@letterly/contracts/pages";
import { templateCatalogLookupQuerySchema } from "@letterly/contracts/catalog";
import {
  adminCreatorDetailSchema,
  adminCreatorEmailSearchSchema,
  adminCreatorIdSchema,
  appealStatusSchema,
  moderationStatusSchema,
  moderationTargetTypeSchema,
} from "@letterly/contracts/moderation";

const timestamp = z.string().datetime({ offset: true });
const cursor = z.string().min(1).optional();
const size = z.coerce.number().int().min(1).max(100).default(25);
const bodySize = z.number().int().min(1).max(100).default(25);
const filterTimestamp = timestamp.transform((value) =>
  new Date(value).toISOString(),
);
const dates = {
  createdFrom: filterTimestamp.optional(),
  createdTo: filterTimestamp.optional(),
};
function validDates(
  value: { createdFrom?: string; createdTo?: string },
  ctx: z.RefinementCtx,
) {
  if (!value.createdFrom || !value.createdTo) return;
  const interval = Date.parse(value.createdTo) - Date.parse(value.createdFrom);
  if (interval <= 0 || interval > 366 * 86_400_000)
    ctx.addIssue({
      code: "custom",
      path: ["createdTo"],
      message: "Invalid date interval",
    });
}
const creatorFilters = z.strictObject({
  moderationStatus: moderationStatusSchema.optional(),
  ...dates,
  cursor,
  size,
});
export const adminCreatorListQuerySchema =
  creatorFilters.superRefine(validDates);
export const adminCreatorSearchSchema = z
  .discriminatedUnion("field", [
    creatorFilters.extend({
      field: z.literal("id"),
      value: adminCreatorIdSchema,
      size: bodySize,
    }),
    creatorFilters.extend({
      field: z.literal("name"),
      value: z.string().trim().min(2).max(100),
      size: bodySize,
    }),
    creatorFilters.extend({
      field: z.literal("email"),
      value: adminCreatorEmailSearchSchema,
      size: bodySize,
    }),
  ])
  .superRefine(validDates);
export const adminCreatorSummarySchema = adminCreatorDetailSchema.omit({
  disabledReason: true,
});
export const adminCreatorListResponseSchema = z.strictObject({
  items: z.array(adminCreatorSummarySchema).max(100),
  nextCursor: z.string().nullable(),
});
const pageFilters = z.strictObject({
  creatorId: adminCreatorIdSchema.optional(),
  status: pageStatusSchema.optional(),
  moderationStatus: moderationStatusSchema.optional(),
  templateKey: templateCatalogLookupQuerySchema.shape.templateKey.optional(),
  ...dates,
  cursor,
  size,
});
export const adminPageListQuerySchema = pageFilters.superRefine(validDates);
export const adminPageSearchSchema = z
  .discriminatedUnion("field", [
    pageFilters.extend({
      field: z.literal("id"),
      value: z.uuid(),
      size: bodySize,
    }),
    pageFilters.extend({
      field: z.literal("slug"),
      value: publicSlugSchema,
      size: bodySize,
    }),
  ])
  .superRefine(validDates);
export const adminPageParamsSchema = z.strictObject({ pageId: z.uuid() });
export const adminPageRecordSchema = z.strictObject({
  id: z.uuid(),
  creatorId: adminCreatorIdSchema,
  slug: publicSlugSchema,
  templateKey: z.string().min(1),
  templateVersion: z.number().int().positive(),
  status: pageStatusSchema,
  moderationStatus: moderationStatusSchema,
  moderationVersion: z.number().int().nonnegative(),
  createdAt: timestamp,
  updatedAt: timestamp,
  publishedAt: timestamp.nullable(),
  disabledAt: timestamp.nullable(),
  deletionRequestedAt: timestamp.nullable(),
  deletionJobId: z.uuid().nullable(),
  reportCount: z.number().int().nonnegative(),
});
export const adminPageListResponseSchema = z.strictObject({
  items: z.array(adminPageRecordSchema).max(100),
  nextCursor: z.string().nullable(),
});
export const adminAppealListQuerySchema = z
  .strictObject({
    status: appealStatusSchema.optional(),
    targetType: moderationTargetTypeSchema.optional(),
    targetId: adminCreatorIdSchema.optional(),
    cursor,
    size,
  })
  .superRefine((value, ctx) => {
    if (value.targetId && !value.targetType)
      ctx.addIssue({
        code: "custom",
        path: ["targetType"],
        message: "Target type is required",
      });
  });
export const adminAppealParamsSchema = z.strictObject({ appealId: z.uuid() });
export const adminAppealInboxItemSchema = z.strictObject({
  id: z.uuid(),
  status: appealStatusSchema,
  moderationVersion: z.number().int().nonnegative(),
  originalActionId: z.uuid(),
  targetType: moderationTargetTypeSchema.nullable(),
  targetId: adminCreatorIdSchema.nullable(),
  reasonCode: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
  createdAt: timestamp,
  resolvedAt: timestamp.nullable(),
});
export const adminAppealDetailSchema = adminAppealInboxItemSchema.extend({
  externalReference: z.string().max(120),
  updatedAt: timestamp,
  resolvedById: adminCreatorIdSchema.nullable(),
  resolutionReasonCode: z.string().max(64).nullable(),
  resolutionNote: z.string().max(500).nullable(),
});
export const adminAppealListResponseSchema = z.strictObject({
  items: z.array(adminAppealInboxItemSchema).max(100),
  nextCursor: z.string().nullable(),
});
export type AdminCreatorListQuery = z.infer<typeof adminCreatorListQuerySchema>;
export type AdminCreatorSearch = z.infer<typeof adminCreatorSearchSchema>;
export type AdminCreatorSummary = z.infer<typeof adminCreatorSummarySchema>;
export type AdminCreatorListResponse = z.infer<
  typeof adminCreatorListResponseSchema
>;
export type AdminPageListQuery = z.infer<typeof adminPageListQuerySchema>;
export type AdminPageSearch = z.infer<typeof adminPageSearchSchema>;
export type AdminPageRecord = z.infer<typeof adminPageRecordSchema>;
export type AdminPageListResponse = z.infer<typeof adminPageListResponseSchema>;
export type AdminAppealListQuery = z.infer<typeof adminAppealListQuerySchema>;
export type AdminAppealInboxItem = z.infer<typeof adminAppealInboxItemSchema>;
export type AdminAppealDetail = z.infer<typeof adminAppealDetailSchema>;
export type AdminAppealListResponse = z.infer<
  typeof adminAppealListResponseSchema
>;
