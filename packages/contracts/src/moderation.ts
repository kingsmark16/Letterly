import { z } from "zod";

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });

export const userRoleSchema = z.enum(["CREATOR", "ADMIN"]);
export const moderationStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export const moderationTargetTypeSchema = z.enum([
  "PAGE",
  "USER",
  "REPORT",
  "APPEAL",
]);
export const moderationActionTypeSchema = z.enum([
  "REPORT_REVIEW",
  "REPORT_DISMISS",
  "REPORT_REOPEN",
  "PAGE_DISABLE",
  "PAGE_RESTORE",
  "USER_DISABLE",
  "USER_RESTORE",
  "APPEAL_CREATE",
  "APPEAL_ACCEPT",
  "APPEAL_REJECT",
]);
export const appealStatusSchema = z.enum([
  "REQUESTED",
  "ACCEPTED",
  "REJECTED",
]);

const boundedNoteSchema = z.string().trim().max(500).optional();
const idempotencyKeySchema = z.string().trim().min(1).max(200);

export const adminModerationMutationSchema = z.object({
  confirm: z.literal(true),
  expectedModerationVersion: z.number().int().nonnegative(),
  note: boundedNoteSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const adminReportListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]).optional(),
  reason: z
    .enum([
      "INAPPROPRIATE_CONTENT",
      "HARASSMENT",
      "SPAM",
      "PERSONAL_INFORMATION",
      "OTHER",
    ])
    .optional(),
  pageId: uuidSchema.optional(),
  userId: z.string().trim().min(1).max(200).optional(),
});

export const adminAuditListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).default(20),
  targetType: z
    .enum(["PAGE", "USER", "REPORT", "APPEAL", "SYSTEM"])
    .optional(),
  targetId: z.string().trim().min(1).max(200).optional(),
  actorId: z.string().trim().min(1).max(200).optional(),
  eventType: z
    .enum([
      "AUTH_SIGN_IN_SUCCEEDED",
      "AUTH_SIGN_IN_DENIED",
      "ADMIN_BOOTSTRAPPED",
      "REPORT_CREATED",
      "REPORT_REVIEWED",
      "REPORT_DISMISSED",
      "REPORT_REOPENED",
      "PAGE_DISABLED",
      "PAGE_RESTORED",
      "USER_DISABLED",
      "USER_RESTORED",
      "APPEAL_CREATED",
      "APPEAL_ACCEPTED",
      "APPEAL_REJECTED",
      "RETENTION_SUCCEEDED",
      "RETENTION_FAILED",
    ])
    .optional(),
});

export const adminPageDisableRequestSchema = adminModerationMutationSchema.extend({
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
});

export const adminPageRestoreRequestSchema = adminModerationMutationSchema;

export const adminUserDisableRequestSchema = adminModerationMutationSchema.extend({
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
});

export const adminUserRestoreRequestSchema = adminModerationMutationSchema;

export const adminReportActionRequestSchema = adminModerationMutationSchema.extend({
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
});

export const adminTargetIdParamsSchema = z.object({
  targetId: uuidSchema,
});

export const adminModerationActionResponseSchema = z.object({
  actionId: uuidSchema,
  targetType: moderationTargetTypeSchema,
  targetId: z.string().min(1),
  moderationVersion: z.number().int().nonnegative(),
  replayed: z.boolean(),
});

export const adminAppealCreateRequestSchema = z.object({
  targetActionId: uuidSchema,
  externalReference: z.string().trim().min(1).max(120),
  reasonCode: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
  idempotencyKey: idempotencyKeySchema,
});

export const adminAppealDecisionRequestSchema = adminModerationMutationSchema;

export const adminPageModerationResponseSchema = z.object({
  actionId: uuidSchema,
  targetType: z.literal("PAGE"),
  targetId: uuidSchema,
  moderationStatus: moderationStatusSchema,
  moderationVersion: z.number().int().nonnegative(),
  replayed: z.boolean(),
});

export const adminUserModerationResponseSchema = z.object({
  actionId: uuidSchema,
  targetType: z.literal("USER"),
  targetId: z.string().min(1),
  moderationStatus: moderationStatusSchema,
  moderationVersion: z.number().int().nonnegative(),
  revokedSessionCount: z.number().int().nonnegative(),
  replayed: z.boolean(),
});

export const adminAppealResponseSchema = z.object({
  appealId: uuidSchema,
  targetType: z.literal("APPEAL"),
  targetId: uuidSchema,
  status: appealStatusSchema,
  moderationVersion: z.number().int().nonnegative(),
  actionId: uuidSchema,
  replayed: z.boolean(),
});

export const moderationActionSchema = z.object({
  id: uuidSchema,
  targetType: moderationTargetTypeSchema,
  targetId: z.string().min(1),
  actionType: moderationActionTypeSchema,
  reasonCode: z.string().min(1).max(64),
  note: z.string().max(500).nullable(),
  previousState: z.string().min(1).max(64),
  resultingState: z.string().min(1).max(64),
  actorId: z.string().nullable(),
  requestId: uuidSchema,
  createdAt: timestampSchema,
});

export const adminReportSummarySchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  creatorId: z.string().min(1),
  reason: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
  message: z.string().max(1_000).nullable(),
  status: z.enum(["OPEN", "REVIEWED", "DISMISSED"]),
  moderationVersion: z.number().int().nonnegative(),
  actionCount: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const adminReportListResponseSchema = z.object({
  items: z.array(adminReportSummarySchema).max(50),
  nextCursor: z.string().nullable(),
});

export const adminAppealSummarySchema = z.object({
  id: uuidSchema,
  originalActionId: uuidSchema,
  status: appealStatusSchema,
  externalReference: z.string().max(120),
  reasonCode: z.enum([
    "INAPPROPRIATE_CONTENT",
    "HARASSMENT",
    "SPAM",
    "PERSONAL_INFORMATION",
    "OTHER",
  ]),
  moderationVersion: z.number().int().nonnegative(),
  requestedAt: timestampSchema,
  resolvedAt: timestampSchema.nullable(),
});

export const adminReportDetailSchema = adminReportSummarySchema.extend({
  pageModerationStatus: moderationStatusSchema,
  creatorModerationStatus: moderationStatusSchema,
  appeal: adminAppealSummarySchema.nullable(),
  actions: z.array(moderationActionSchema),
});

export const adminAuditEventSchema = z.object({
  id: uuidSchema,
  actorId: z.string().nullable(),
  eventType: z.string().min(1),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  requestId: uuidSchema.nullable(),
  outcome: z.enum(["SUCCESS", "DENIED", "CONFLICT", "FAILURE"]),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: timestampSchema,
});

export const adminAuditListResponseSchema = z.object({
  items: z.array(adminAuditEventSchema).max(50),
  nextCursor: z.string().nullable(),
});

export type AdminModerationMutation = z.infer<
  typeof adminModerationMutationSchema
>;
export type AdminReportListQuery = z.infer<typeof adminReportListQuerySchema>;
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;
export type AdminReportSummary = z.infer<typeof adminReportSummarySchema>;
export type AdminReportListResponse = z.infer<
  typeof adminReportListResponseSchema
>;
export type AdminReportDetail = z.infer<typeof adminReportDetailSchema>;
export type ModerationAction = z.infer<typeof moderationActionSchema>;
export type AdminAuditEvent = z.infer<typeof adminAuditEventSchema>;
export type AdminAuditListResponse = z.infer<
  typeof adminAuditListResponseSchema
>;
export type AdminReportActionRequest = z.infer<
  typeof adminReportActionRequestSchema
>;
export type AdminModerationActionResponse = z.infer<
  typeof adminModerationActionResponseSchema
>;
export type AdminPageDisableRequest = z.infer<
  typeof adminPageDisableRequestSchema
>;
export type AdminPageRestoreRequest = z.infer<
  typeof adminPageRestoreRequestSchema
>;
export type AdminUserDisableRequest = z.infer<
  typeof adminUserDisableRequestSchema
>;
export type AdminUserRestoreRequest = z.infer<
  typeof adminUserRestoreRequestSchema
>;
export type AdminAppealCreateRequest = z.infer<
  typeof adminAppealCreateRequestSchema
>;
export type AdminAppealDecisionRequest = z.infer<
  typeof adminAppealDecisionRequestSchema
>;
export type AdminPageModerationResponse = z.infer<
  typeof adminPageModerationResponseSchema
>;
export type AdminUserModerationResponse = z.infer<
  typeof adminUserModerationResponseSchema
>;
export type AdminAppealResponse = z.infer<typeof adminAppealResponseSchema>;
