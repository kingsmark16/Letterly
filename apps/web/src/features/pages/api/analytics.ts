import { pageIdParamsSchema } from "@letterly/contracts/pages";
import { apiClient, request } from "../../../lib/api/transport";
import {
  pageAnalyticsSchema,
  type PageAnalytics,
  type PageAnalyticsPeriod,
} from "@letterly/contracts/analytics";

export async function getPageAnalytics(
  pageId: string,
  days: PageAnalyticsPeriod,
): Promise<PageAnalytics> {
  const params = pageIdParamsSchema.parse({ pageId });
  return request(
    () =>
      apiClient.get(`/pages/${params.pageId}/analytics`, { params: { days } }),
    pageAnalyticsSchema,
  );
}
