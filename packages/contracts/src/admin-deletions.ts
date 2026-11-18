import { z } from "zod";
import { adminCreatorIdSchema } from "@letterly/contracts/moderation";
import { pageReportReasonSchema as reportReasonSchema } from "@letterly/contracts/reports";

const timestamp = z.string().datetime({ offset: true });
const count = z.number().int().nonnegative();
export const deletionStateSchema = z.enum([
  "QUEUED",
  "DATABASE_CLEANUP",
  "WAITING_FOR_CHILDREN",
  "MEDIA_CLEANUP",
  "RETRY_WAIT",
  "NEEDS_ATTENTION",
  "COMPLETED",
]);
export const deletionTargetTypeSchema = z.enum(["CREATOR", "PAGE"]);
export const deletionFailureCodeSchema = z.enum([
  "DB_TIMEOUT",
  "CONSTRAINT_CONFLICT",
  "STORAGE_UNAVAILABLE",
  "DELETE_FAILED",
  "CLEANUP_RECEIPT_MISSING",
  "CHILD_JOB_FAILED",
  "PROCESSOR_QUIESCENCE_UNKNOWN",
  "UPLOAD_SETTLEMENT_UNKNOWN",
  "UNKNOWN",
]);
export const deletionJobSummarySchema = z.strictObject({
  id: z.uuid(),
  targetType: deletionTargetTypeSchema,
  targetId: adminCreatorIdSchema,
  parentJobId: z.uuid().nullable(),
  state: deletionStateSchema,
  requestedAt: timestamp,
  completedAt: timestamp.nullable(),
  version: count,
  pagesTotal: count,
  pagesCompleted: count,
  mediaTotal: count,
  mediaCompleted: count,
});
export const deletionJobDetailSchema = deletionJobSummarySchema.extend({
  requestedById: adminCreatorIdSchema.nullable(),
  reasonCode: reportReasonSchema,
  note: z.string().max(500).nullable(),
  startedAt: timestamp.nullable(),
  attempts: count,
  nextRetryAt: timestamp.nullable(),
  lastFailureCode: deletionFailureCodeSchema.nullable(),
  databaseBatchesCompleted: count,
  childrenTotal: count,
  childrenCompleted: count,
  childrenNeedingAttention: count,
});
export const deletionListQuerySchema = z
  .strictObject({
    state: deletionStateSchema.optional(),
    targetType: deletionTargetTypeSchema.optional(),
    targetId: adminCreatorIdSchema.optional(),
    cursor: z.string().min(1).max(2000).optional(),
    size: z.coerce.number().int().min(1).max(100).default(25),
  })
  .superRefine((value, ctx) => {
    if (value.targetId && !value.targetType)
      ctx.addIssue({
        code: "custom",
        path: ["targetType"],
        message: "Target type is required",
      });
  });
export const deletionChildrenQuerySchema = z.strictObject({
  cursor: z.string().min(1).max(2000).optional(),
  size: z.coerce.number().int().min(1).max(100).default(25),
});
export const deletionListResponseSchema = z.strictObject({
  items: z.array(deletionJobSummarySchema).max(100),
  nextCursor: z.string().nullable(),
});
export const deletionJobParamsSchema = z.strictObject({ jobId: z.uuid() });
export const deletionPreviewRequestSchema = z.strictObject({
  expectedModerationVersion: count,
});
export const deletionImpactCountsSchema = z.strictObject({
  pages: count,
  submissions: count,
  images: count,
  audioTracks: count,
  pendingUploads: count,
  reports: count,
  moderationActions: count,
  appeals: count,
});
export const deletionPreviewSchema = z.strictObject({
  targetType: deletionTargetTypeSchema,
  targetId: adminCreatorIdSchema,
  expectedModerationVersion: count,
  counts: deletionImpactCountsSchema,
  confirmationToken: z.string().min(1).max(4000),
  issuedAt: timestamp,
  expiresAt: timestamp,
});
export const deletionAcceptRequestSchema = z.strictObject({
  confirm: z.literal(true),
  expectedModerationVersion: count,
  idempotencyKey: z.string().trim().min(1).max(200),
  reasonCode: reportReasonSchema,
  note: z.string().trim().max(500).optional(),
  typedTargetId: z.string().min(1).max(200),
  confirmationToken: z.string().min(1).max(4000),
});
export const deletionRetryRequestSchema = z.strictObject({
  confirm: z.literal(true),
  expectedJobVersion: count,
  idempotencyKey: z.string().trim().min(1).max(200),
});
export type DeletionJobSummary = z.infer<typeof deletionJobSummarySchema>;
export type DeletionJobDetail = z.infer<typeof deletionJobDetailSchema>;
export type DeletionListQuery = z.infer<typeof deletionListQuerySchema>;
export type DeletionAcceptRequest = z.infer<typeof deletionAcceptRequestSchema>;
export type DeletionPreview = z.infer<typeof deletionPreviewSchema>;
export type DeletionImpactCounts = z.infer<typeof deletionImpactCountsSchema>;
export type DeletionRetryRequest = z.infer<typeof deletionRetryRequestSchema>;
