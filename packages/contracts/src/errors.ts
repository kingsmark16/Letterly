import { z } from 'zod';

export const apiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMIT_UNAVAILABLE',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
  'PAGE_NOT_FOUND',
  'INVALID_CURSOR',
  'STALE_VERSION',
  'TEMPLATE_UNAVAILABLE',
  'TEMPLATE_DEFINITION_UNAVAILABLE',
  'SLUG_ALLOCATION_FAILED',
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
  currentUpdatedAt: z.string().datetime({
    offset: true,
  }),
});

export const rateLimitedErrorDetailsSchema = z.object({
  retryAfterSeconds: z.number().int().positive(),
});

export const apiErrorDetailsSchema = z.union([
  validationErrorDetailsSchema,
  staleVersionErrorDetailsSchema,
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
