import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageQuestionTypeSchema = z.enum(["CHOICE", "PLAIN_MESSAGE"]);

export const MAX_PAGE_QUESTIONS = 100;

const questionPromptSchema = z.string().trim().min(1).max(2_000);

const choiceLabelSchema = z.string().trim().min(1).max(500);
const creatorMessageSchema = z.string().trim().max(2_000).nullable().optional();

const createChoiceInputSchema = z.object({
  label: choiceLabelSchema,
  creatorMessage: creatorMessageSchema,
});

const updateChoiceInputSchema = createChoiceInputSchema.extend({
  id: uuidSchema.optional(),
});

/**
 * Canonical choice input used by new callers. Legacy keys, order, and branch
 * fields are intentionally unknown and therefore stripped by Zod at the
 * transport boundary during the compatibility window.
 */
export const pageChoiceInputSchema = updateChoiceInputSchema;

function validateChoiceLabels(
  choices: Array<{ label: string }>,
  context: z.RefinementCtx,
): void {
  const labels = new Set<string>();
  for (const [index, choice] of choices.entries()) {
    const normalized = choice.label.trim().toLocaleLowerCase();
    if (labels.has(normalized)) {
      context.addIssue({
        code: "custom",
        path: ["choices", index, "label"],
        message: "Choice labels must be unique",
      });
    }
    labels.add(normalized);
  }
}

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
    type: pageQuestionTypeSchema,
    prompt: questionPromptSchema,
    expectedContentVersion: z.number().int().nonnegative(),
    choices: z.array(createChoiceInputSchema).min(2).max(10).optional(),
  })
  .superRefine((value, context) => {
    validateQuestionShape(value, context);
    if (value.choices) validateChoiceLabels(value.choices, context);
  });

export const updatePageQuestionRequestSchema = z
  .object({
    type: pageQuestionTypeSchema.optional(),
    prompt: questionPromptSchema.optional(),
    choices: z.array(updateChoiceInputSchema).min(2).max(10).optional(),
    expectedContentVersion: z.number().int().nonnegative(),
    confirmResponseDeletion: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (
      !Object.keys(value).some((key) =>
        ["type", "prompt", "choices"].includes(key),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "At least one question field is required",
      });
    }
    validateQuestionShape(value, context);
    if (value.choices) {
      validateChoiceLabels(value.choices, context);
      const ids = value.choices
        .map((choice) => choice.id)
        .filter((id): id is string => id !== undefined);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          path: ["choices"],
          message: "Choice ids must be unique",
        });
      }
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
  questionIds: z.array(uuidSchema).min(1).max(100),
  expectedContentVersion: z.number().int().nonnegative(),
});

export const pageChoiceSchema = z.object({
  id: uuidSchema,
  label: choiceLabelSchema,
  displayOrder: z.number().int().min(0),
  creatorMessage: z.string().max(2_000).nullable(),
});

export const pageQuestionSchema = z.object({
  id: uuidSchema,
  pageId: uuidSchema,
  type: pageQuestionTypeSchema,
  prompt: questionPromptSchema,
  displayOrder: z.number().int().nonnegative(),
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
