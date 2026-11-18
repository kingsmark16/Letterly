import {
  deletionAcceptRequestSchema,
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
export function previewPageDeletion(pageId: string, version: number) {
  return request(
    () =>
      apiClient.post(
        `/admin/pages/${encodeURIComponent(pageId)}/deletion-preview`,
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
) {
  return request(
    () =>
      apiClient.post(
        `/admin/pages/${encodeURIComponent(pageId)}/deletions`,
        deletionAcceptRequestSchema.parse(body),
        { headers },
      ),
    deletionJobSummarySchema,
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
