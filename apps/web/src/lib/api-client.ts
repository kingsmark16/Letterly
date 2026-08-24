import {
  createPageRequestSchema,
  pageListResponseSchema,
  listPagesQuerySchema,
  ownerPageProjectionSchema,
  pageIdParamsSchema,
  pageLifecycleResponseSchema,
  publishPageRequestSchema,
  unpublishPageRequestSchema,
  changePublishedSlugRequestSchema,
  imageOperationResponseSchema,
  imageIdParamsSchema,
  imageUploadRequestSchema,
  imageUploadResponseSchema,
  ownerPageImagesResponseSchema,
  publicPageUnlockRequestSchema,
  publicPageUnlockResponseSchema,
  savePageRequestSchema,
  type CreatePageRequest,
  type PageListResponse,
  type ListPagesQuery,
  type OwnerPageProjection,
  type PageLifecycleResponse,
  type PublishPageRequest,
  type UnpublishPageRequest,
  type ChangePublishedSlugRequest,
  type ImageOperationResponse,
  type ImageUploadRequest,
  type ImageUploadResponse,
  type OwnerPageImage,
  type PublicPageUnlockResponse,
  type SavePageRequest,
} from "@letterly/contracts/pages";
import {
  deleteSubmissionRequestSchema,
  listSubmissionsQuerySchema,
  ownerSubmissionDetailSchema,
  ownerSubmissionListResponseSchema,
  submissionDeleteResponseSchema,
  submissionIdParamsSchema,
  submissionReadResponseSchema,
  visitorSubmissionRequestSchema,
  visitorSubmissionResponseSchema,
  type DeleteSubmissionRequest,
  type ListSubmissionsQuery,
  type OwnerSubmissionDetail,
  type OwnerSubmissionListResponse,
  type VisitorSubmissionRequest,
  type VisitorSubmissionResponse,
} from "@letterly/contracts/submissions";
import {
  createPageQuestionRequestSchema,
  deletePageQuestionRequestSchema,
  pageQuestionDeleteResponseSchema,
  pageQuestionListResponseSchema,
  pageQuestionMutationResponseSchema,
  questionIdParamsSchema,
  updatePageQuestionRequestSchema,
  type CreatePageQuestionRequest,
  type DeletePageQuestionRequest,
  type PageQuestion,
  type UpdatePageQuestionRequest,
} from "@letterly/contracts/questions";
import {
  pageJourneyOwnerResponseSchema,
  pageJourneySubmissionRequestSchema,
  pageJourneySaveRequestSchema,
  type PageJourneyOwnerResponse,
  type PageJourneySubmissionRequest,
  type PageJourneySaveRequest,
} from "@letterly/contracts/page-journeys";
import {
  publicReportRequestSchema,
  publicReportResponseSchema,
  type PublicReportRequest,
  type PublicReportResponse,
} from "@letterly/contracts/reports";
import {
  adminAuditListResponseSchema,
  adminModerationActionResponseSchema,
  adminReportDetailSchema,
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
  type AdminModerationActionResponse,
  type AdminReportActionRequest,
  type AdminReportDetail,
  type AdminReportListQuery,
  type AdminReportListResponse,
} from "@letterly/contracts/moderation";
import {
  apiErrorEnvelopeSchema,
  type ApiErrorDetails,
} from "@letterly/contracts/errors";
import axios from "axios";

export type WebErrorCode = "OFFLINE" | "TIMEOUT" | "MALFORMED_RESPONSE";

export class WebApiError extends Error {
  readonly statusCode?: number;
  readonly code: WebErrorCode | string;
  readonly requestId?: string;
  readonly details?: ApiErrorDetails;

  constructor(input: {
    code: WebErrorCode | string;
    message: string;
    statusCode?: number;
    requestId?: string;
    details?: ApiErrorDetails;
  }) {
    super(input.message);
    this.name = "WebApiError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

export async function submitPublicReport(
  slug: string,
  input: PublicReportRequest,
): Promise<PublicReportResponse> {
  const payload = publicReportRequestSchema.parse(input);
  return request(
    () =>
      publicActionClient.post(
        `/p/${encodeURIComponent(slug)}/report`,
        payload,
      ),
    publicReportResponseSchema,
  );
}

export async function listAdminReports(
  input: Partial<AdminReportListQuery> = {},
): Promise<AdminReportListResponse> {
  const params = adminReportListQuerySchema.parse(input);
  return request(
    () => apiClient.get("/admin/reports", { params }),
    adminReportListResponseSchema,
  );
}

export async function getAdminReport(reportId: string): Promise<AdminReportDetail> {
  return request(
    () => apiClient.get(`/admin/reports/${encodeURIComponent(reportId)}`),
    adminReportDetailSchema,
  );
}

export async function mutateAdminReport(
  reportId: string,
  operation: "review" | "dismiss" | "reopen",
  input: AdminReportActionRequest,
): Promise<AdminModerationActionResponse> {
  return request(
    () =>
      apiClient.post(
        `/admin/reports/${encodeURIComponent(reportId)}/${operation}`,
        input,
        { headers: { "X-CSRF-Token": "letterly-admin-action" } },
      ),
    adminModerationActionResponseSchema,
  );
}

export async function listAdminAuditEvents(
  input: Partial<AdminAuditListQuery> = {},
): Promise<AdminAuditListResponse> {
  return request(
    () => apiClient.get("/admin/audit-events", { params: input }),
    adminAuditListResponseSchema,
  );
}

const apiClient = axios.create({
  baseURL: "/api/v1",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

const publicActionClient = axios.create({
  baseURL: "/",
  timeout: 15_000,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function toWebApiError(error: unknown): WebApiError {
  if (!axios.isAxiosError(error)) {
    if (error instanceof WebApiError) {
      return error;
    }

    return new WebApiError({
      code: "MALFORMED_RESPONSE",
      message: "We received an unexpected response. Please try again.",
    });
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return new WebApiError({
        code: "TIMEOUT",
        message: "The request took too long. Please try again.",
      });
    }

    return new WebApiError({
      code: "OFFLINE",
      message: "You appear to be offline. Reconnect and try again.",
    });
  }

  const parsed = apiErrorEnvelopeSchema.safeParse(error.response.data);

  if (parsed.success) {
    return new WebApiError(parsed.data);
  }

  return new WebApiError({
    code: "MALFORMED_RESPONSE",
    message: "The server returned an invalid response. Please try again.",
    statusCode: error.response.status,
  });
}

async function request<T>(
  callback: () => Promise<{ data: unknown }>,
  schema: { parse(value: unknown): T },
): Promise<T> {
  try {
    const response = await callback();
    return schema.parse(response.data);
  } catch (error: unknown) {
    if (error instanceof WebApiError) {
      throw error;
    }

    throw toWebApiError(error);
  }
}

export async function createPage(
  input: CreatePageRequest,
): Promise<OwnerPageProjection> {
  const payload = createPageRequestSchema.parse(input);

  return request(
    () => apiClient.post("/pages", payload),
    ownerPageProjectionSchema,
  );
}

export async function getOwnerPage(
  pageId: string,
): Promise<OwnerPageProjection> {
  const params = pageIdParamsSchema.parse({ pageId });

  return request(
    () => apiClient.get(`/pages/${params.pageId}`),
    ownerPageProjectionSchema,
  );
}

export async function listPages(
  input: Partial<Pick<ListPagesQuery, "status" | "cursor" | "size">> = {},
): Promise<PageListResponse> {
  const params = listPagesQuerySchema.parse(input);

  return request(
    () => apiClient.get("/pages", { params }),
    pageListResponseSchema,
  );
}

export const listDrafts = listPages;

export async function savePage(
  pageId: string,
  input: SavePageRequest,
): Promise<OwnerPageProjection> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = savePageRequestSchema.parse(input);

  return request(
    () => apiClient.patch(`/pages/${params.pageId}`, payload),
    ownerPageProjectionSchema,
  );
}

export async function getOwnerPageJourney(
  pageId: string,
): Promise<PageJourneyOwnerResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  return request(
    () => apiClient.get(`/pages/${params.pageId}/choose-your-heart`),
    pageJourneyOwnerResponseSchema,
  );
}

export async function saveOwnerPageJourney(
  pageId: string,
  input: PageJourneySaveRequest,
): Promise<PageJourneyOwnerResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = pageJourneySaveRequestSchema.parse(input);
  return request(
    () => apiClient.put(`/pages/${params.pageId}/choose-your-heart`, payload),
    pageJourneyOwnerResponseSchema,
  );
}

export async function listPageQuestions(
  pageId: string,
): Promise<PageQuestion[]> {
  const params = pageIdParamsSchema.shape.pageId.parse(pageId);
  return request(
    () => apiClient.get(`/pages/${params}/questions`),
    pageQuestionListResponseSchema,
  );
}

export async function createPageQuestion(
  pageId: string,
  input: CreatePageQuestionRequest,
): Promise<{ question: PageQuestion; contentVersion: number }> {
  const params = pageIdParamsSchema.shape.pageId.parse(pageId);
  const payload = createPageQuestionRequestSchema.parse(input);
  return request(
    () => apiClient.post(`/pages/${params}/questions`, payload),
    pageQuestionMutationResponseSchema,
  );
}

export async function updatePageQuestion(
  pageId: string,
  questionId: string,
  input: UpdatePageQuestionRequest,
): Promise<{ question: PageQuestion; contentVersion: number }> {
  const params = questionIdParamsSchema.parse({ pageId, questionId });
  const payload = updatePageQuestionRequestSchema.parse(input);
  return request(
    () =>
      apiClient.patch(
        `/pages/${params.pageId}/questions/${params.questionId}`,
        payload,
      ),
    pageQuestionMutationResponseSchema,
  );
}

export async function deletePageQuestion(
  pageId: string,
  questionId: string,
  input: DeletePageQuestionRequest,
): Promise<{ deleted: true; contentVersion: number }> {
  const params = questionIdParamsSchema.parse({ pageId, questionId });
  const payload = deletePageQuestionRequestSchema.parse(input);
  return request(
    () =>
      apiClient.delete(
        `/pages/${params.pageId}/questions/${params.questionId}`,
        { data: payload },
      ),
    pageQuestionDeleteResponseSchema,
  );
}

export async function listOwnerImages(
  pageId: string,
): Promise<OwnerPageImage[]> {
  const params = pageIdParamsSchema.parse({ pageId });

  return request(
    () => apiClient.get(`/pages/${params.pageId}/images`),
    ownerPageImagesResponseSchema,
  );
}

export async function prepareImageUpload(
  pageId: string,
  input: ImageUploadRequest,
): Promise<ImageUploadResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = imageUploadRequestSchema.parse(input);

  return request(
    () => apiClient.post(`/pages/${params.pageId}/images/uploads`, payload),
    imageUploadResponseSchema,
  );
}

export async function uploadImageSource(input: {
  uploadUrl: string;
  requiredHeaders: ImageUploadResponse["requiredHeaders"];
  file: Blob;
}): Promise<void> {
  try {
    await axios.put(input.uploadUrl, input.file, {
      timeout: 180_000,
      headers: {
        "Content-Type": input.requiredHeaders.contentType,
        "x-amz-checksum-sha256": input.requiredHeaders.sha256,
      },
    });
  } catch (error: unknown) {
    throw toWebApiError(error);
  }
}

export async function completeImageUpload(
  pageId: string,
  imageId: string,
): Promise<ImageOperationResponse> {
  const params = imageIdParamsSchema.parse({ pageId, imageId });

  return request(
    () =>
      apiClient.post(
        `/pages/${params.pageId}/images/${params.imageId}/complete`,
      ),
    imageOperationResponseSchema,
  );
}

export async function retryImageUpload(
  pageId: string,
  imageId: string,
): Promise<ImageUploadResponse> {
  const params = imageIdParamsSchema.parse({ pageId, imageId });

  return request(
    () =>
      apiClient.post(`/pages/${params.pageId}/images/${params.imageId}/retry`),
    imageUploadResponseSchema,
  );
}

export async function removeImageUpload(
  pageId: string,
  imageId: string,
): Promise<void> {
  const params = imageIdParamsSchema.parse({ pageId, imageId });

  try {
    await apiClient.delete(`/pages/${params.pageId}/images/${params.imageId}`);
  } catch (error: unknown) {
    throw toWebApiError(error);
  }
}

export async function sha256Base64(value: Blob): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await value.arrayBuffer(),
  );
  const bytes = new Uint8Array(digest);
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}

export async function deletePage(pageId: string): Promise<void> {
  const params = pageIdParamsSchema.parse({ pageId });

  try {
    await apiClient.delete(`/pages/${params.pageId}`);
  } catch (error: unknown) {
    throw toWebApiError(error);
  }
}

export async function publishPage(
  pageId: string,
  input: PublishPageRequest,
): Promise<PageLifecycleResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = publishPageRequestSchema.parse(input);

  return request(
    () => apiClient.post(`/pages/${params.pageId}/publish`, payload),
    pageLifecycleResponseSchema,
  );
}

export async function unpublishPage(
  pageId: string,
  input: UnpublishPageRequest,
): Promise<PageLifecycleResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = unpublishPageRequestSchema.parse(input);

  return request(
    () => apiClient.post(`/pages/${params.pageId}/unpublish`, payload),
    pageLifecycleResponseSchema,
  );
}

export async function changePublishedSlug(
  pageId: string,
  input: ChangePublishedSlugRequest,
): Promise<PageLifecycleResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = changePublishedSlugRequestSchema.parse(input);

  return request(
    () => apiClient.patch(`/pages/${params.pageId}/slug`, payload),
    pageLifecycleResponseSchema,
  );
}

export async function unlockPublicPage(
  slug: string,
  password: string,
): Promise<PublicPageUnlockResponse> {
  const payload = publicPageUnlockRequestSchema.parse({ password });

  return request(
    () =>
      publicActionClient.post(`/p/${encodeURIComponent(slug)}/unlock`, payload),
    publicPageUnlockResponseSchema,
  );
}

export async function submitPublicResponse(
  slug: string,
  input: VisitorSubmissionRequest,
): Promise<VisitorSubmissionResponse> {
  const payload = visitorSubmissionRequestSchema.parse(input);

  return request(
    () =>
      publicActionClient.post(
        `/p/${encodeURIComponent(slug)}/responses`,
        payload,
      ),
    visitorSubmissionResponseSchema,
  );
}

export async function submitPublicJourneyResponse(
  slug: string,
  input: PageJourneySubmissionRequest,
): Promise<VisitorSubmissionResponse> {
  const payload = pageJourneySubmissionRequestSchema.parse(input);
  const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();
  const requestPayload = { ...payload, idempotencyKey };

  return request(
    () =>
      publicActionClient.post(
        `/p/${encodeURIComponent(slug)}/responses`,
        requestPayload,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    visitorSubmissionResponseSchema,
  );
}

export async function listSubmissions(
  pageId: string,
  input: Partial<ListSubmissionsQuery> = {},
): Promise<OwnerSubmissionListResponse> {
  const params = submissionIdParamsSchema.shape.pageId.parse(pageId);
  const query = listSubmissionsQuerySchema.parse(input);

  return request(
    () => apiClient.get(`/pages/${params}/submissions`, { params: query }),
    ownerSubmissionListResponseSchema,
  );
}

export async function getSubmission(
  pageId: string,
  submissionId: string,
): Promise<OwnerSubmissionDetail> {
  const params = submissionIdParamsSchema.parse({ pageId, submissionId });

  return request(
    () =>
      apiClient.get(
        `/pages/${params.pageId}/submissions/${params.submissionId}`,
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
