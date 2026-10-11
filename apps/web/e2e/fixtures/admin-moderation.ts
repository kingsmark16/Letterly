import {
  adminAuditEventSchema,
  adminAuditListResponseSchema,
  adminReportDetailSchema,
  adminReportListResponseSchema,
  adminReportSummarySchema,
} from "@letterly/contracts/moderation";

export const adminReportId = "51000000-0000-4000-8000-000000000001";
export const adminPageId = "52000000-0000-4000-8000-000000000001";

const createdAt = "2026-10-04T10:00:00.000Z";

export const adminReportSummaryFixture = adminReportSummarySchema.parse({
  id: adminReportId,
  pageId: adminPageId,
  creatorId: "creator-fixture",
  reason: "SPAM",
  message: "Synthetic report note for the administrator fixture.",
  status: "OPEN",
  moderationVersion: 1,
  actionCount: 0,
  createdAt,
  updatedAt: createdAt,
});

export const adminReportDetailFixture = adminReportDetailSchema.parse({
  ...adminReportSummaryFixture,
  pageModerationStatus: "ACTIVE",
  pageModerationVersion: 0,
  creatorModerationStatus: "ACTIVE",
  creatorModerationVersion: 0,
  appeal: null,
  actions: [],
});

export const adminReportListFixture = adminReportListResponseSchema.parse({
  items: [adminReportSummaryFixture],
  nextCursor: null,
});

export const adminAuditReportFixture = adminAuditEventSchema.parse({
  id: "53000000-0000-4000-8000-000000000001",
  actorId: "admin-fixture",
  eventType: "REPORT_CREATED",
  targetType: "REPORT",
  targetId: adminReportId,
  requestId: "54000000-0000-4000-8000-000000000001",
  outcome: "SUCCESS",
  metadata: { reason: "SPAM" },
  createdAt,
});

export const adminAuditPageFixture = adminAuditEventSchema.parse({
  id: "53000000-0000-4000-8000-000000000002",
  actorId: "admin-fixture",
  eventType: "PAGE_DISABLED",
  targetType: "PAGE",
  targetId: adminPageId,
  requestId: "54000000-0000-4000-8000-000000000002",
  outcome: "SUCCESS",
  metadata: { moderationStatus: "DISABLED" },
  createdAt,
});

export const adminAuditListFixture = adminAuditListResponseSchema.parse({
  items: [adminAuditReportFixture],
  nextCursor: null,
});

export const adminAuditPageListFixture = adminAuditListResponseSchema.parse({
  items: [adminAuditPageFixture],
  nextCursor: null,
});
