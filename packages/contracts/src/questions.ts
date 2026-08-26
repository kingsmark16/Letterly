import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageQuestionTypeSchema = z.enum(["CHOICE", "PLAIN_MESSAGE"]);

const questionKeySchema = z.string().trim().min(1).max(100);
const questionPromptSchema = z.string().trim().min(1).max(2_000);

const pageChoiceInputSchemaShape = {
  key: questionKeySchema,
  label: z.string().trim().min(1).max(500),
  displayOrder: z.number().int().min(0),
  creatorMessage: z.string().trim().max(2_000).optional(),
  /** @deprecated Accepted for old clients and ignored by the API. */
  endsJourney: z.boolean().optional(),
  /** @deprecated Accepted for old clients and ignored by the API. */
  nextQuestionId: uuidSchema.nullable().optional(),
};

export const pageChoiceInputSchema = z.object(pageChoiceInputSchemaShape);

const pageQuestionConfigSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional();

function validateQuestionShape(
  value: { type?: "CHOICE" | "PLAIN_MESSAGE"; choices?: unknown[] },
  context: z.RefinementCtx,
): void {
  if (value.type === "CHOICE" && !value.choices) {
    context.addIssue({
      code: "custom",
      path: ["choices"],
      message: "Choice questions require between 2 and 10 choices",
    });
  }

  if (value.type === "PLAIN_MESSAGE" && value.choices) {
    context.addIssue({
      code: "custom",
      path: ["choices"],
      message: "Plain message questions cannot have choices",
    });
  }
}

export const createPageQuestionRequestSchema = z
  .object({
    key: questionKeySchema.optional(),
    type: pageQuestionTypeSchema,
    prompt: questionPromptSchema,
    config: pageQuestionConfigSchema,
    /** @deprecated Accepted for old clients and ignored by the API. */
    displayOrder: z.number().int().min(0).optional(),
    /** @deprecated Accepted for old clients and ignored by the API. */
    endsJourney: z.boolean().optional(),
    /** @deprecated Accepted for old clients and ignored by the API. */
    nextQuestionId: uuidSchema.nullable().optional(),
    choices: z.array(pageChoiceInputSchema).min(2).max(10).optional(),
  })
  .superRefine(validateQuestionShape);

export const updatePageQuestionRequestSchema = z
  .object({
    type: pageQuestionTypeSchema.optional(),
    prompt: questionPromptSchema.optional(),
    config: pageQuestionConfigSchema,
    choices: z.array(pageChoiceInputSchema).min(2).max(10).optional(),
    expectedContentVersion: z.number().int().nonnegative(),
    confirmResponseDeletion: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (!Object.keys(value).some((key) => ["type", "prompt", "config", "choices"].includes(key))) {
      context.addIssue({
        code: "custom",
        message: "At least one question field is required",
      });
    }
    validateQuestionShape(value, context);
  });

export const questionIdParamsSchema = z.object({
  pageId: uuidSchema,
  questionId: uuidSchema,
});

export const deletePageQuestionRequestSchema = z.object({
  expectedContentVersion: z.number().int().nonnegative(),
  confirmResponseDeletion: z.boolean().default(false),
});

export const reorderPageQuestionsRequestSchema = z.object({
  questionIds: z.array(uuidSchema).min(1).max(100),
  expectedContentVersion: z.number().int().nonnegative(),
});

export const pageChoiceSchema = z.object({
  id: uuidSchema,
  key: questionKeySchema,
  label: z.string().trim().min(1).max(500),
  displayOrder: z.number().int().min(0),
  creatorMessage: z.string().max(2_000).nullable(),
  /** @deprecated Legacy graph fields accepted by old fixtures and ignored. */
  endsJourney: z.boolean().optional(),
  /** @deprecated Legacy graph fields accepted by old fixtures and ignored. */
  nextQuestionId: uuidSchema.nullable().optional(),
});

export const pageQuestionSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  key: questionKeySchema,
  type: pageQuestionTypeSchema,
  prompt: questionPromptSchema,
  displayOrder: z.number().int().nonnegative(),
  config: z.record(z.string(), z.unknown()).nullable(),
  /** @deprecated Legacy graph fields accepted by old fixtures and ignored. */
  endsJourney: z.boolean().optional(),
  /** @deprecated Legacy graph fields accepted by old fixtures and ignored. */
  nextQuestionId: uuidSchema.nullable().optional(),
  choices: z.array(pageChoiceSchema),
});

export const pageQuestionMutationResponseSchema = z.object({
  question: pageQuestionSchema,
  contentVersion: z.number().int().nonnegative(),
});

export const pageQuestionListResponseSchema = z.array(pageQuestionSchema);

export const pageQuestionDeleteResponseSchema = z.object({
  deleted: z.literal(true),
  contentVersion: z.number().int().nonnegative(),
});

export const pageQuestionReorderResponseSchema = z.object({
  questionIds: z.array(uuidSchema),
  contentVersion: z.number().int().nonnegative(),
});

export type CreatePageQuestionRequest = z.infer<
  typeof createPageQuestionRequestSchema
>;

export type UpdatePageQuestionRequest = z.infer<
  typeof updatePageQuestionRequestSchema
>;

export type QuestionIdParams = z.infer<typeof questionIdParamsSchema>;

export type DeletePageQuestionRequest = z.infer<
  typeof deletePageQuestionRequestSchema
>;

export type ReorderPageQuestionsRequest = z.infer<
  typeof reorderPageQuestionsRequestSchema
>;

export type PageQuestion = z.infer<typeof pageQuestionSchema>;

export type PageQuestionMutationResponse = z.infer<
  typeof pageQuestionMutationResponseSchema
>;

export type PageQuestionListResponse = z.infer<
  typeof pageQuestionListResponseSchema
>;

export type PageQuestionDeleteResponse = z.infer<
  typeof pageQuestionDeleteResponseSchema
>;

export type PageQuestionReorderResponse = z.infer<
  typeof pageQuestionReorderResponseSchema
>;
