import {
  pageIdParamsSchema,
  imageOperationResponseSchema,
  imageIdParamsSchema,
  imageUploadRequestSchema,
  imageUploadResponseSchema,
  ownerPageImagesResponseSchema,
  type ImageOperationResponse,
  type ImageUploadRequest,
  type ImageUploadResponse,
  type OwnerPageImage,
} from "@letterly/contracts/pages";
import { apiClient, request } from "../../../lib/api/transport";
import { toWebApiError } from "../../../lib/api/errors";

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
