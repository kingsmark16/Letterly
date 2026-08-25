import { z } from "zod";

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMIT_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_SERVER_ERROR",
  "PAGE_NOT_FOUND",
  "INVALID_CURSOR",
  "STALE_VERSION",
  "JOURNEY_VERSION_STALE",
  "TEMPLATE_UNAVAILABLE",
  "TEMPLATE_DEFINITION_UNAVAILABLE",
  "SLUG_ALLOCATION_FAILED",
  "INVALID_SLUG",
  "SLUG_ALREADY_TAKEN",
  "INVALID_STATE",
  "TEMPLATE_REQUIREMENT_FAILED",
  "PAGE_LOCKED",
  "INVALID_PASSWORD",
  "PASSWORD_CONFIGURATION",
  "INVALID_REPORT",
  "CONFIRMATION_REQUIRED",
  "INVALID_IMAGE",
  "IMAGE_LIMIT_REACHED",
  "IMAGE_PROCESSING",
  "IMAGE_PROCESSING_FAILED",
  "IMAGE_NOT_READY",
  "IMAGE_ATTACHED",
  "IMAGE_RETRY_UNAVAILABLE",
  "STORAGE_UNAVAILABLE",
  "INVALID_BRANCH",
  "INVALID_ORDER",
  "UNSUPPORTED_CAPABILITY",
  "QUESTION_KEY_TAKEN",
  "QUESTION_REFERENCED",
  "RESPONSE_IMPACT",
  "COOKIE_REQUIRED",
  "DUPLICATE_SUBMISSION",
  "IDEMPOTENCY_CONFLICT",
  "ACCOUNT_DISABLED",
  "ADMIN_REQUIRED",
  "CSRF_ORIGIN_INVALID",
  "STALE_MODERATION_VERSION",
  "INVALID_CONFIRMATION",
  "RATE_LIMIT_STORE_UNAVAILABLE",
]);

export const validationIssueSchema = z.object({
  path: z.array(z.string()),
  code: z.string().min(1),
});

export const validationErrorDetailsSchema = z.object({
  issues: z.array(validationIssueSchema).min(1),
});

export const staleVersionErrorDetailsSchema = z.object({
  currentContentVersion: z.number().int().nonnegative(),
  currentUpdatedAt: z
    .string()
    .datetime({
      offset: true,
    })
    .optional(),
});

export const responseImpactErrorDetailsSchema = z.object({
  affectedResponseCount: z.number().int().positive(),
  confirmResponseDeletion: z.literal(true),
});

export const rateLimitedErrorDetailsSchema = z.object({
  retryAfterSeconds: z.number().int().positive(),
});

export const apiErrorDetailsSchema = z.union([
  validationErrorDetailsSchema,
  staleVersionErrorDetailsSchema,
  responseImpactErrorDetailsSchema,
  rateLimitedErrorDetailsSchema,
]);

export const apiErrorEnvelopeSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  code: apiErrorCodeSchema,
  message: z.string().min(1),
  requestId: z.string().uuid(),
  details: apiErrorDetailsSchema.optional(),
});

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiErrorDetails = z.infer<typeof apiErrorDetailsSchema>;
export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
