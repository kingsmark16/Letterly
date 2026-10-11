import {
  adminAppealResponseSchema,
  adminAuditListQuerySchema,
  adminAuditListResponseSchema,
  adminPageModerationResponseSchema,
  adminModerationActionResponseSchema,
  adminReportDetailSchema,
  adminReportListQuerySchema,
  adminReportListResponseSchema,
  adminUserModerationResponseSchema,
  type AdminAuditListQuery,
  type AdminAuditListResponse,
  type AdminAppealCreateRequest,
  type AdminAppealDecisionRequest,
  type AdminAppealResponse,
  type AdminPageDisableRequest,
  type AdminPageModerationResponse,
  type AdminPageRestoreRequest,
  type AdminModerationActionResponse,
  type AdminReportActionRequest,
  type AdminReportDetail,
  type AdminReportListQuery,
  type AdminReportListResponse,
  type AdminUserDisableRequest,
  type AdminUserModerationResponse,
  type AdminUserRestoreRequest,
} from "@letterly/contracts/moderation";
import {
  apiClient,
  request,
  type ApiReadOptions,
} from "../../lib/api/transport";

export async function listAdminReports(
  input: Partial<AdminReportListQuery> = {},
  options: ApiReadOptions = {},
): Promise<AdminReportListResponse> {
  const params = adminReportListQuerySchema.parse(input);
  return request(
    () => apiClient.get("/admin/reports", { params, signal: options.signal }),
    adminReportListResponseSchema,
  );
}

export async function getAdminReport(
  reportId: string,
  options: ApiReadOptions = {},
): Promise<AdminReportDetail> {
  return request(
    () =>
      apiClient.get(`/admin/reports/${encodeURIComponent(reportId)}`, {
        signal: options.signal,
      }),
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

function adminMutationConfig(): { headers: { "X-CSRF-Token": string } } {
  return { headers: { "X-CSRF-Token": "letterly-admin-action" } };
}

export async function mutateAdminPage(
  pageId: string,
  operation: "disable" | "restore",
  input: AdminPageDisableRequest | AdminPageRestoreRequest,
): Promise<AdminPageModerationResponse> {
  return request(
    () =>
      apiClient.post(
        `/admin/pages/${encodeURIComponent(pageId)}/${operation}`,
        input,
        adminMutationConfig(),
      ),
    adminPageModerationResponseSchema,
  );
}

export async function mutateAdminUser(
  userId: string,
  operation: "disable" | "restore",
  input: AdminUserDisableRequest | AdminUserRestoreRequest,
): Promise<AdminUserModerationResponse> {
  return request(
    () =>
      apiClient.post(
        `/admin/users/${encodeURIComponent(userId)}/${operation}`,
        input,
        adminMutationConfig(),
      ),
    adminUserModerationResponseSchema,
  );
}

export async function createAdminAppeal(
  input: AdminAppealCreateRequest,
): Promise<AdminAppealResponse> {
  return request(
    () => apiClient.post("/admin/appeals", input, adminMutationConfig()),
    adminAppealResponseSchema,
  );
}

export async function mutateAdminAppeal(
  appealId: string,
  operation: "accept" | "reject",
  input: AdminAppealDecisionRequest,
): Promise<AdminAppealResponse> {
  return request(
    () =>
      apiClient.post(
        `/admin/appeals/${encodeURIComponent(appealId)}/${operation}`,
        input,
        adminMutationConfig(),
      ),
    adminAppealResponseSchema,
  );
}

export async function listAdminAuditEvents(
  input: Partial<AdminAuditListQuery> = {},
  options: ApiReadOptions = {},
): Promise<AdminAuditListResponse> {
  const params = adminAuditListQuerySchema.parse(input);
  return request(
    () =>
      apiClient.get("/admin/audit-events", { params, signal: options.signal }),
    adminAuditListResponseSchema,
  );
}
