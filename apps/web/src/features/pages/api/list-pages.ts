import {
  listPagesQuerySchema,
  pageListResponseSchema,
  type ListPagesQuery,
  type PageListResponse,
} from "@letterly/contracts/pages";
import { apiClient, request } from "../../../lib/api/transport";

export async function listPages(
  input: Partial<Pick<ListPagesQuery, "status" | "cursor" | "size">> = {},
  options: { signal?: AbortSignal } = {},
): Promise<PageListResponse> {
  const params = listPagesQuerySchema.parse(input);

  return request(
    () => apiClient.get("/pages", { params, signal: options.signal }),
    pageListResponseSchema,
  );
}
