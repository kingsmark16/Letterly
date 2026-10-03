import {
  deleteSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  ownerSubmissionDetailSchema,
  ownerSubmissionListResponseSchema,
  submissionDeleteResponseSchema,
  submissionIdParamsSchema,
  submissionReadResponseSchema,
  type DeleteSubmissionRequest,
  type ListSubmissionsQuery,
  type OwnerSubmissionDetail,
  type OwnerSubmissionListResponse,
} from "@letterly/contracts/submissions";
import {
  apiClient,
  request,
  type ApiReadOptions,
} from "../../../lib/api/transport";

export async function listSubmissions(
  pageId: string,
  input: Partial<ListSubmissionsQuery> = {},
  options: ApiReadOptions = {},
): Promise<OwnerSubmissionListResponse> {
  const params = submissionIdParamsSchema.shape.pageId.parse(pageId);
  const query = listSubmissionsQuerySchema.parse(input);

  return request(
    () =>
      apiClient.get(`/pages/${params}/submissions`, {
        params: query,
        signal: options.signal,
      }),
    ownerSubmissionListResponseSchema,
  );
}

export async function getSubmission(
  pageId: string,
  submissionId: string,
  options: ApiReadOptions = {},
): Promise<OwnerSubmissionDetail> {
  const params = submissionIdParamsSchema.parse({ pageId, submissionId });

  return request(
    () =>
      apiClient.get(
        `/pages/${params.pageId}/submissions/${params.submissionId}`,
        { signal: options.signal },
      ),
    ownerSubmissionDetailSchema,
  );
}

export async function markSubmissionRead(
  pageId: string,
  submissionId: string,
): Promise<{ submissionId: string; readState: "READ" }> {
  const params = submissionIdParamsSchema.parse({ pageId, submissionId });

  return request(
    () =>
      apiClient.post(
        `/pages/${params.pageId}/submissions/${params.submissionId}/read`,
      ),
    submissionReadResponseSchema,
  );
}

export async function deleteSubmission(
  pageId: string,
  submissionId: string,
  input: DeleteSubmissionRequest = { confirm: false },
): Promise<{ deleted: true }> {
  const params = submissionIdParamsSchema.parse({ pageId, submissionId });
  const payload = deleteSubmissionRequestSchema.parse(input);

  return request(
    () =>
      apiClient.delete(
        `/pages/${params.pageId}/submissions/${params.submissionId}`,
        { data: payload },
      ),
    submissionDeleteResponseSchema,
  );
}
