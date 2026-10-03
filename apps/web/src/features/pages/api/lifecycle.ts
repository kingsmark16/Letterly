import {
  createPageRequestSchema,
  ownerPageProjectionSchema,
  pageIdParamsSchema,
  pageLifecycleResponseSchema,
  publishPageRequestSchema,
  unpublishPageRequestSchema,
  changePublishedSlugRequestSchema,
  pagePasswordRequestSchema,
  pagePasswordResponseSchema,
  savePageRequestSchema,
  type CreatePageRequest,
  type OwnerPageProjection,
  type PageLifecycleResponse,
  type PublishPageRequest,
  type UnpublishPageRequest,
  type ChangePublishedSlugRequest,
  type PagePasswordRequest,
  type PagePasswordResponse,
  type SavePageRequest,
} from "@letterly/contracts/pages";
import { apiClient, request } from "../../../lib/api/transport";
import { toWebApiError } from "../../../lib/api/errors";

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

export async function setPagePassword(
  pageId: string,
  input: PagePasswordRequest,
): Promise<PagePasswordResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = pagePasswordRequestSchema.parse(input);

  return request(
    () => apiClient.patch(`/pages/${params.pageId}/password`, payload),
    pagePasswordResponseSchema,
  );
}
