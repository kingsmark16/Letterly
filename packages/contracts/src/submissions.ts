import { z } from "zod";
import { pageJourneySubmissionRequestSchema } from "@letterly/contracts/page-journeys";
import { pageJourneySnapshotSchema } from "@letterly/templates/journey";

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });

export const visitorAnswerInputSchema = z
  .object({
    questionId: uuidSchema,
    choiceId: uuidSchema.nullable().optional(),
    textAnswer: z.string().trim().min(1).max(2_000).nullable().optional(),
  })
  .superRefine((answer, context) => {
    const hasChoice = answer.choiceId !== undefined && answer.choiceId !== null;
    const hasText =
      answer.textAnswer !== undefined && answer.textAnswer !== null;

    if (hasChoice === hasText) {
      context.addIssue({
        code: "custom",
        message: "Provide exactly one choice or text answer",
      });
    }
  });

export const visitorSubmissionRequestSchema = z.object({
  answers: z.array(visitorAnswerInputSchema).max(100),
  visitorMessage: z.string().trim().min(1).max(2_000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200),
});

/** The shared public endpoint accepts the original response shape and journey responses. */
export const publicSubmissionRequestSchema = z.union([
  visitorSubmissionRequestSchema,
  pageJourneySubmissionRequestSchema,
]);

export const submissionIdParamsSchema = z.object({
  pageId: uuidSchema,
  submissionId: uuidSchema,
});

export const listSubmissionsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  size: z.coerce.number().int().min(1).max(50).default(20),
  filter: z.enum(["all", "unread"]).default("all"),
});

export const ownerSubmissionSummarySchema = z.object({
  id: uuidSchema,
  readState: z.enum(["UNREAD", "READ"]),
  submittedAt: timestampSchema,
  answerCount: z.number().int().nonnegative(),
  hasVisitorMessage: z.boolean(),
});

export const ownerSubmissionAnswerSchema = z.object({
  questionId: uuidSchema,
  promptSnapshot: z.string().min(1),
  choiceLabelSnapshot: z.string().nullable(),
  textAnswer: z.string().nullable(),
});

export const ownerVisitorMessageSchema = z.object({
  promptSnapshot: z.string().min(1),
  message: z.string().min(1).max(2_000),
});

export const ownerSubmissionDetailSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  readState: z.enum(["UNREAD", "READ"]),
  submittedAt: timestampSchema,
  answers: z.array(ownerSubmissionAnswerSchema),
  visitorMessage: ownerVisitorMessageSchema.nullable(),
  journeySnapshot: pageJourneySnapshotSchema.nullable().optional(),
});

export const ownerSubmissionListResponseSchema = z.object({
  items: z.array(ownerSubmissionSummarySchema),
  unreadCount: z.number().int().nonnegative().default(0),
  nextCursor: z.string().nullable(),
});

export const submissionReadResponseSchema = z.object({
  submissionId: uuidSchema,
  readState: z.literal("READ"),
});

export const submissionDeleteResponseSchema = z.object({
  deleted: z.literal(true),
});

export const deleteSubmissionRequestSchema = z.object({
  confirm: z.boolean().default(false),
});

export const visitorSubmissionResponseSchema = z.object({
  accepted: z.literal(true),
});

export type VisitorAnswerInput = z.infer<typeof visitorAnswerInputSchema>;

export type VisitorSubmissionRequest = z.infer<
  typeof visitorSubmissionRequestSchema
>;

export type PublicSubmissionRequest = z.infer<
  typeof publicSubmissionRequestSchema
>;

export type SubmissionIdParams = z.infer<typeof submissionIdParamsSchema>;

export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;

export type OwnerSubmissionSummary = z.infer<
  typeof ownerSubmissionSummarySchema
>;

export type OwnerSubmissionDetail = z.infer<typeof ownerSubmissionDetailSchema>;

export type OwnerSubmissionListResponse = z.infer<
  typeof ownerSubmissionListResponseSchema
>;

export type SubmissionReadResponse = z.infer<
  typeof submissionReadResponseSchema
>;

export type SubmissionDeleteResponse = z.infer<
  typeof submissionDeleteResponseSchema
>;

export type DeleteSubmissionRequest = z.infer<
  typeof deleteSubmissionRequestSchema
>;

export type VisitorSubmissionResponse = z.infer<
  typeof visitorSubmissionResponseSchema
>;
