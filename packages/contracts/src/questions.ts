import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageQuestionTypeSchema = z.enum(["CHOICE", "PLAIN_MESSAGE"]);

const questionKeySchema = z.string().trim().min(1).max(100);
const questionPromptSchema = z.string().trim().min(1).max(2_000);

const pageChoiceFields = {
  key: questionKeySchema,
  label: z.string().trim().min(1).max(500),
  displayOrder: z.number().int().min(0),
  creatorMessage: z.string().trim().max(2_000).optional(),
  endsJourney: z.boolean().optional(),
  nextQuestionId: uuidSchema.nullable().optional(),
};

function validateChoiceDestination(
  value: { endsJourney?: boolean; nextQuestionId?: string | null },
  context: z.RefinementCtx,
): void {
  if (value.endsJourney && value.nextQuestionId) {
    context.addIssue({
      code: "custom",
      path: ["nextQuestionId"],
      message: "A finished answer cannot also target a question",
    });
  }
}

export const pageChoiceInputSchema = z
  .object(pageChoiceFields)
  .superRefine(validateChoiceDestination);

const pageQuestionConfigSchema = z
  .record(z.string(), z.unknown())
  .nullable()
  .optional();

export const createPageQuestionRequestSchema = z
  .object({
    key: questionKeySchema,
    type: pageQuestionTypeSchema,
    prompt: questionPromptSchema,
    displayOrder: z.number().int().min(0),
    config: pageQuestionConfigSchema,
    endsJourney: z.boolean().optional(),
    nextQuestionId: uuidSchema.nullable().optional(),
    choices: z.array(pageChoiceInputSchema).min(2).max(10).optional(),
  })
  .superRefine((value, context) => {
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

    if (value.type === "CHOICE" && value.nextQuestionId) {
      context.addIssue({
        code: "custom",
        path: ["nextQuestionId"],
        message: "Choice questions branch through their choices",
      });
    }

    if (value.type === "CHOICE" && value.endsJourney) {
      context.addIssue({
        code: "custom",
        path: ["endsJourney"],
        message: "Choice questions finish through an answer",
      });
    }

    if (
      value.type === "PLAIN_MESSAGE" &&
      value.endsJourney &&
      value.nextQuestionId
    ) {
      context.addIssue({
        code: "custom",
        path: ["nextQuestionId"],
        message: "A finished question cannot also target another question",
      });
    }
  });

export const updatePageQuestionRequestSchema = z
  .object({
    type: pageQuestionTypeSchema.optional(),
    prompt: questionPromptSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
    config: pageQuestionConfigSchema,
    endsJourney: z.boolean().optional(),
    nextQuestionId: uuidSchema.nullable().optional(),
    choices: z.array(pageChoiceInputSchema).min(2).max(10).optional(),
    expectedContentVersion: z.number().int().nonnegative(),
    confirmResponseDeletion: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (
      !Object.keys(value).some((key) =>
        [
          "type",
          "prompt",
          "displayOrder",
          "config",
          "endsJourney",
          "nextQuestionId",
          "choices",
        ].includes(key),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "At least one question field is required",
      });
    }

    if (value.endsJourney && value.nextQuestionId) {
      context.addIssue({
        code: "custom",
        path: ["nextQuestionId"],
        message: "A finished question cannot also target another question",
      });
    }
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
  questionIds: z.array(uuidSchema).max(100),
  expectedContentVersion: z.number().int().nonnegative(),
});

export const pageQuestionReorderResponseSchema = z.object({
  contentVersion: z.number().int().nonnegative(),
});

export const pageChoiceSchema = z
  .object({
    ...pageChoiceFields,
    id: uuidSchema,
    creatorMessage: z.string().max(2_000).nullable(),
    endsJourney: z.boolean(),
    nextQuestionId: uuidSchema.nullable(),
  })
  .superRefine(validateChoiceDestination);

export const pageQuestionSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  key: questionKeySchema,
  type: pageQuestionTypeSchema,
  prompt: questionPromptSchema,
  displayOrder: z.number().int().nonnegative(),
  config: z.record(z.string(), z.unknown()).nullable(),
  endsJourney: z.boolean(),
  nextQuestionId: uuidSchema.nullable(),
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
