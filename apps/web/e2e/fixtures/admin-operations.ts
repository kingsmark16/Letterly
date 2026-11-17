import {
  adminCreatorListResponseSchema,
  adminPageRecordSchema,
  adminAppealDetailSchema,
  adminAppealInboxItemSchema,
} from "@letterly/contracts/admin-operations";
import { adminPageId } from "./admin-moderation";
export const operationsCreator = {
  id: "creator-fixture",
  name: "Example creator",
  email: "creator@example.test",
  role: "CREATOR" as const,
  moderationStatus: "ACTIVE" as const,
  moderationVersion: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-17T00:00:00.000Z",
  disabledAt: null,
  pageCount: 1,
  deletionRequestedAt: null,
  deletionJobId: null,
};
export const operationsCreators = adminCreatorListResponseSchema.parse({
  items: [operationsCreator],
  nextCursor: null,
});
export const operationsPage = adminPageRecordSchema.parse({
  id: adminPageId,
  creatorId: operationsCreator.id,
  slug: "operations-page",
  templateKey: "secret-letter",
  templateVersion: 1,
  status: "DRAFT",
  moderationStatus: "ACTIVE",
  moderationVersion: 0,
  createdAt: operationsCreator.createdAt,
  updatedAt: operationsCreator.updatedAt,
  publishedAt: null,
  disabledAt: null,
  deletionRequestedAt: null,
  deletionJobId: null,
  reportCount: 1,
});
export const operationsAppeal = adminAppealDetailSchema.parse({
  id: "56000000-0000-4000-8000-000000000001",
  originalActionId: "57000000-0000-4000-8000-000000000001",
  targetType: "PAGE",
  targetId: operationsPage.id,
  status: "REQUESTED",
  moderationVersion: 0,
  reasonCode: "SPAM",
  createdAt: operationsCreator.createdAt,
  resolvedAt: null,
  externalReference: "SUPPORT-42",
  updatedAt: operationsCreator.updatedAt,
  resolvedById: null,
  resolutionReasonCode: null,
  resolutionNote: null,
});
export const operationsAppealSummary = adminAppealInboxItemSchema.parse(
  Object.fromEntries(
    Object.entries(operationsAppeal).filter(
      ([key]) =>
        ![
          "externalReference",
          "updatedAt",
          "resolvedById",
          "resolutionReasonCode",
          "resolutionNote",
        ].includes(key),
    ),
  ),
);
