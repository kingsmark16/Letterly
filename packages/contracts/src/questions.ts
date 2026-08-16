import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageQuestionTypeSchema = z.enum(["CHOICE", "PLAIN_MESSAGE"]);

const questionKeySchema = z.string().trim().min(1).max(100);
const questionPromptSchema = z.string().trim().min(1).max(2_000);

export const pageChoiceInputSchema = z.object({
  key: questionKeySchema,
  label: z.string().trim().min(1).max(500),
  displayOrder: z.number().int().min(0),
  creatorMessage: z.string().trim().max(2_000).optional(),
  nextQuestionId: uuidSchema.nullable().optional(),
});

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
  });

export const updatePageQuestionRequestSchema = z
  .object({
    type: pageQuestionTypeSchema.optional(),
    prompt: questionPromptSchema.optional(),
    displayOrder: z.number().int().min(0).optional(),
    config: pageQuestionConfigSchema,
    nextQuestionId: uuidSchema.nullable().optional(),
    choices: z.array(pageChoiceInputSchema).min(2).max(10).optional(),
    expectedContentVersion: z.number().int().nonnegative(),
    confirmResponseDeletion: z.boolean().default(false),
  })
  .refine(
    (value) =>
      Object.keys(value).some((key) =>
        [
          "type",
          "prompt",
          "displayOrder",
          "config",
          "nextQuestionId",
          "choices",
        ].includes(key),
      ),
    { message: "At least one question field is required" },
  );

export const questionIdParamsSchema = z.object({
  pageId: uuidSchema,
  questionId: uuidSchema,
});

export const deletePageQuestionRequestSchema = z.object({
  expectedContentVersion: z.number().int().nonnegative(),
  confirmResponseDeletion: z.boolean().default(false),
});

export const pageChoiceSchema = pageChoiceInputSchema.extend({
  id: uuidSchema,
  creatorMessage: z.string().max(2_000).nullable(),
  nextQuestionId: uuidSchema.nullable(),
});

export const pageQuestionSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  key: questionKeySchema,
  type: pageQuestionTypeSchema,
  prompt: questionPromptSchema,
  displayOrder: z.number().int().nonnegative(),
  config: z.record(z.string(), z.unknown()).nullable(),
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
