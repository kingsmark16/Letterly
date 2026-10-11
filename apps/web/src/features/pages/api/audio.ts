import {
  pageIdParamsSchema,
  audioIdParamsSchema,
  audioUploadRequestSchema,
  audioUploadResponseSchema,
  audioLinkRequestSchema,
  pageAudioLinkResponseSchema,
  ownerPageAudioSchema,
  type AudioUploadRequest,
  type AudioUploadResponse,
  type PageAudioLink,
  type OwnerPageAudio,
} from "@letterly/contracts/pages";
import {
  apiClient,
  request,
  type ApiReadOptions,
} from "../../../lib/api/transport";
import { toWebApiError } from "../../../lib/api/errors";
import { uploadImageSource } from "./uploads";

export async function prepareAudioUpload(
  pageId: string,
  input: AudioUploadRequest,
): Promise<AudioUploadResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = audioUploadRequestSchema.parse(input);
  return request(
    () => apiClient.post(`/pages/${params.pageId}/audio/uploads`, payload),
    audioUploadResponseSchema,
  );
}

export async function addYouTubeAudioLink(
  pageId: string,
  url: string,
): Promise<PageAudioLink> {
  const params = pageIdParamsSchema.parse({ pageId });
  const payload = audioLinkRequestSchema.parse({ url });
  const response = await request(
    () => apiClient.post(`/pages/${params.pageId}/audio/links`, payload),
    pageAudioLinkResponseSchema,
  );
  return response.audioLink;
}

export async function getOwnerAudioLinkMetadata(
  pageId: string,
  options: ApiReadOptions = {},
): Promise<PageAudioLink> {
  const params = pageIdParamsSchema.parse({ pageId });
  const response = await request(
    () =>
      apiClient.get(`/pages/${params.pageId}/audio/metadata`, {
        signal: options.signal,
      }),
    pageAudioLinkResponseSchema,
  );
  return response.audioLink;
}

export async function uploadAudioSource(input: {
  uploadUrl: string;
  requiredHeaders: AudioUploadResponse["requiredHeaders"];
  file: Blob;
  onProgress?: (percentage: number) => void;
}): Promise<void> {
  return uploadImageSource(input);
}

export async function completeAudioUpload(
  pageId: string,
  audioId: string,
): Promise<OwnerPageAudio> {
  const params = audioIdParamsSchema.parse({ pageId, audioId });
  return request(
    () =>
      apiClient.post(
        `/pages/${params.pageId}/audio/${params.audioId}/complete`,
      ),
    ownerPageAudioSchema,
  );
}

export async function retryAudioUpload(
  pageId: string,
  audioId: string,
  input: AudioUploadRequest,
): Promise<AudioUploadResponse> {
  const params = audioIdParamsSchema.parse({ pageId, audioId });
  const payload = audioUploadRequestSchema.parse(input);

  return request(
    () =>
      apiClient.post(
        `/pages/${params.pageId}/audio/${params.audioId}/retry`,
        payload,
      ),
    audioUploadResponseSchema,
  );
}

export async function removeAudio(pageId: string): Promise<void> {
  const params = pageIdParamsSchema.parse({ pageId });
  try {
    await apiClient.delete(`/pages/${params.pageId}/audio`);
  } catch (error: unknown) {
    throw toWebApiError(error);
  }
}
