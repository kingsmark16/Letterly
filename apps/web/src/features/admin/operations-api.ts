import {
  adminCreatorListQuerySchema,
  adminCreatorSearchSchema,
  adminCreatorListResponseSchema,
  adminPageListQuerySchema,
  adminPageSearchSchema,
  adminPageListResponseSchema,
  adminPageRecordSchema,
  adminAppealListQuerySchema,
  adminAppealListResponseSchema,
  adminAppealDetailSchema,
  type AdminCreatorListQuery,
  type AdminCreatorSearch,
  type AdminPageListQuery,
  type AdminPageSearch,
  type AdminAppealListQuery,
} from "@letterly/contracts/admin-operations";
import { apiClient, request, type ApiReadOptions } from "@/lib/api/transport";
const csrf = { "X-CSRF-Token": "letterly-admin-search" };
export function listAdminCreators(
  input: Partial<AdminCreatorListQuery>,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.get("/admin/creators", {
        params: adminCreatorListQuerySchema.parse(input),
        signal: options.signal,
      }),
    adminCreatorListResponseSchema,
  );
}
export function searchAdminCreators(
  input: AdminCreatorSearch,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.post(
        "/admin/creators/search",
        adminCreatorSearchSchema.parse(input),
        { headers: csrf, signal: options.signal },
      ),
    adminCreatorListResponseSchema,
  );
}
export function listAdminPages(
  input: Partial<AdminPageListQuery>,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.get("/admin/pages", {
        params: adminPageListQuerySchema.parse(input),
        signal: options.signal,
      }),
    adminPageListResponseSchema,
  );
}
export function searchAdminPages(
  input: AdminPageSearch,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.post(
        "/admin/pages/search",
        adminPageSearchSchema.parse(input),
        { headers: csrf, signal: options.signal },
      ),
    adminPageListResponseSchema,
  );
}
export function getAdminPage(id: string, options: ApiReadOptions = {}) {
  return request(
    () =>
      apiClient.get(`/admin/pages/${encodeURIComponent(id)}`, {
        signal: options.signal,
      }),
    adminPageRecordSchema,
  );
}
export function listAdminAppeals(
  input: Partial<AdminAppealListQuery>,
  options: ApiReadOptions = {},
) {
  return request(
    () =>
      apiClient.get("/admin/appeals", {
        params: adminAppealListQuerySchema.parse(input),
        signal: options.signal,
      }),
    adminAppealListResponseSchema,
  );
}
export function getAdminAppeal(id: string, options: ApiReadOptions = {}) {
  return request(
    () =>
      apiClient.get(`/admin/appeals/${encodeURIComponent(id)}`, {
        signal: options.signal,
      }),
    adminAppealDetailSchema,
  );
}
