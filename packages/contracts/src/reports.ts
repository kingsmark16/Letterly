import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageReportReasonSchema = z.enum([
  "INAPPROPRIATE_CONTENT",
  "HARASSMENT",
  "SPAM",
  "PERSONAL_INFORMATION",
  "OTHER",
]);

export const publicReportRequestSchema = z.object({
  reason: pageReportReasonSchema,
  message: z.string().trim().min(1).max(1_000).optional(),
});

export const publicReportResponseSchema = z.object({
  accepted: z.literal(true),
  reportId: uuidSchema,
});

export type PublicReportRequest = z.infer<typeof publicReportRequestSchema>;
export type PublicReportResponse = z.infer<typeof publicReportResponseSchema>;
