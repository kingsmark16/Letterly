import { pageIdParamsSchema } from "@letterly/contracts/pages";
import {
  pageJourneyOwnerResponseSchema,
  pageJourneySaveRequestSchema,
  type PageJourneyOwnerResponse,
  type PageJourneySaveRequest,
} from "@letterly/contracts/page-journeys";
import {
  apiClient,
  request,
  type ApiReadOptions,
} from "../../../lib/api/transport";

export async function getOwnerPageJourney(
  pageId: string,
  options: ApiReadOptions = {},
): Promise<PageJourneyOwnerResponse> {
  const params = pageIdParamsSchema.parse({ pageId });
  return request(
    () =>
      apiClient.get(`/pages/${params.pageId}/choose-your-heart`, {
        signal: options.signal,
      }),
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
