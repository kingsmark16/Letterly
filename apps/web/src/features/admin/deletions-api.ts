import {
  deletionAcceptRequestSchema,
  deletionChildrenQuerySchema,
  deletionJobDetailSchema,
  deletionJobSummarySchema,
  deletionListQuerySchema,
  deletionListResponseSchema,
  deletionPreviewRequestSchema,
  deletionPreviewSchema,
  deletionRetryRequestSchema,
  type DeletionAcceptRequest,
  type DeletionListQuery,
  type DeletionRetryRequest,
} from "@letterly/contracts/admin-deletions";
import { apiClient, request, type ApiReadOptions } from "@/lib/api/transport";
const headers = { "X-CSRF-Token": "letterly-admin-deletion" };
export function previewPageDeletion(
  pageId: string,
  version: number,
  targetType: "PAGE" | "CREATOR" = "PAGE",
) {
  return request(
    () =>
      apiClient.post(
        `/admin/${targetType === "CREATOR" ? "creators" : "pages"}/${encodeURIComponent(pageId)}/deletion-preview`,
        deletionPreviewRequestSchema.parse({
          expectedModerationVersion: version,
        }),
        { headers },
      ),
    deletionPreviewSchema,
  );
}
export function acceptPageDeletion(
  pageId: string,
  body: DeletionAcceptRequest,
  targetType: "PAGE" | "CREATOR" = "PAGE",
) {
  return request(
    () =>
      apiClient.post(
        `/admin/${targetType === "CREATOR" ? "creators" : "pages"}/${encodeURIComponent(pageId)}/deletions`,
        deletionAcceptRequestSchema.parse(body),
        { headers },
      ),
    deletionJobSummarySchema,
  );
}
export function listDeletionChildren(
  id: string,
  cursor: string | undefined,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.get(`/admin/deletions/${encodeURIComponent(id)}/children`, {
        params: deletionChildrenQuerySchema.parse({ cursor }),
        signal: options.signal,
      }),
    deletionListResponseSchema,
  );
}
export function listDeletions(
  input: Partial<DeletionListQuery>,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.get("/admin/deletions", {
        params: deletionListQuerySchema.parse(input),
        signal: options.signal,
      }),
    deletionListResponseSchema,
  );
}
export function getDeletion(id: string, options: ApiReadOptions = {}) {
  return request(
    () =>
      apiClient.get(`/admin/deletions/${encodeURIComponent(id)}`, {
        signal: options.signal,
      }),
    deletionJobDetailSchema,
  );
}
export function retryDeletion(id: string, input: DeletionRetryRequest) {
  return request(
    () =>
      apiClient.post(
        `/admin/deletions/${encodeURIComponent(id)}/retry`,
        deletionRetryRequestSchema.parse(input),
        { headers },
      ),
    deletionJobSummarySchema,
  );
}
