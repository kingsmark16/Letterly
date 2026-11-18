import {
  deletionJobDetailSchema,
  deletionJobSummarySchema,
  deletionPreviewSchema,
} from "@letterly/contracts/admin-deletions";
import { operationsPage } from "./admin-operations";
export const deletionJob = deletionJobDetailSchema.parse({
  id: "58000000-0000-4000-8000-000000000001",
  targetType: "PAGE",
  targetId: operationsPage.id,
  parentJobId: null,
  state: "QUEUED",
  requestedAt: "2026-11-18T00:00:00.000Z",
  completedAt: null,
  version: 0,
  pagesTotal: 1,
  pagesCompleted: 0,
  mediaTotal: 2,
  mediaCompleted: 0,
  requestedById: "admin-fixture",
  reasonCode: "SPAM",
  note: null,
  startedAt: null,
  attempts: 0,
  nextRetryAt: null,
  lastFailureCode: null,
  databaseBatchesCompleted: 0,
  childrenTotal: 0,
  childrenCompleted: 0,
  childrenNeedingAttention: 0,
});
export const deletionSummary = deletionJobSummarySchema
  .strip()
  .parse(deletionJob);
export const deletionPreview = deletionPreviewSchema.parse({
  targetType: "PAGE",
  targetId: operationsPage.id,
  expectedModerationVersion: 0,
  counts: {
    pages: 1,
    submissions: 4,
    images: 1,
    audioTracks: 1,
    pendingUploads: 0,
    reports: 3,
    moderationActions: 2,
    appeals: 1,
  },
  confirmationToken: "fixture-deletion-confirmation-token",
  issuedAt: "2026-11-18T00:00:00.000Z",
  expiresAt: "2026-11-18T00:05:00.000Z",
});
