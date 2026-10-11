import {
  publicPageUnlockRequestSchema,
  publicPageUnlockResponseSchema,
  type PublicPageUnlockResponse,
} from "@letterly/contracts/pages";
import {
  visitorSubmissionRequestSchema,
  visitorSubmissionResponseSchema,
  type VisitorSubmissionRequest,
  type VisitorSubmissionResponse,
} from "@letterly/contracts/submissions";
import {
  pageJourneySubmissionRequestSchema,
  type PageJourneySubmissionRequest,
} from "@letterly/contracts/page-journeys";
import {
  publicReportRequestSchema,
  publicReportResponseSchema,
  type PublicReportRequest,
  type PublicReportResponse,
} from "@letterly/contracts/reports";
import { publicActionClient, request } from "../../../lib/api/transport";

export async function submitPublicReport(
  slug: string,
  input: PublicReportRequest,
): Promise<PublicReportResponse> {
  const payload = publicReportRequestSchema.parse(input);
  return request(
    () =>
      publicActionClient.post(`/p/${encodeURIComponent(slug)}/report`, payload),
    publicReportResponseSchema,
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
