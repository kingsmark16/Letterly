import { z } from "zod";
import { countGraphemes } from "@letterly/templates/graphemes";

const journeyKeySchema = z.string().trim().min(1).max(100);

const boundedText = (maximum: number, name: string) =>
  z
    .string()
    .trim()
    .min(1, `${name} is required`)
    .refine(
      (value) => countGraphemes(value) <= maximum,
      `${name} must contain at most ${maximum} graphemes`,
    );

export const pageJourneyChoiceLabelSchema = boundedText(
  80,
  "choice label",
);
export const pageJourneyQuestionPromptSchema = boundedText(
  200,
  "question prompt",
);
export const pageJourneyOutcomeTitleSchema = boundedText(
  120,
  "outcome title",
);
export const pageJourneyOutcomeMessageSchema = boundedText(
  2_000,
  "outcome result message",
);

export const pageJourneyChoiceSchema = z
  .object({
    key: journeyKeySchema,
    label: pageJourneyChoiceLabelSchema,
    displayOrder: z.number().int().min(0),
    nextQuestionKey: journeyKeySchema.nullable().optional(),
    outcomeKey: journeyKeySchema.nullable().optional(),
  })
  .superRefine((choice, context) => {
    const hasQuestion = Boolean(choice.nextQuestionKey);
    const hasOutcome = Boolean(choice.outcomeKey);

    if (hasQuestion === hasOutcome) {
      context.addIssue({
        code: "custom",
        path: ["nextQuestionKey"],
        message: "A choice must point to exactly one question or outcome",
      });
    }
  });

export const pageJourneyQuestionSchema = z.object({
  key: journeyKeySchema,
  prompt: pageJourneyQuestionPromptSchema,
  displayOrder: z.number().int().min(0),
  choices: z.array(pageJourneyChoiceSchema).min(2).max(4),
});

export const pageJourneyOutcomeSchema = z.object({
  key: journeyKeySchema,
  title: pageJourneyOutcomeTitleSchema,
  resultMessage: pageJourneyOutcomeMessageSchema,
  displayOrder: z.number().int().min(0),
});

export const pageJourneyGraphSchema = z.object({
  schemaVersion: z.literal(1),
  rootQuestionKey: journeyKeySchema,
  questions: z.array(pageJourneyQuestionSchema).max(12),
  outcomes: z.array(pageJourneyOutcomeSchema).max(12),
});

export const pageJourneySnapshotSchema = z.object({
  revisionNumber: z.number().int().positive(),
  answers: z.array(
    z.object({
      questionKey: journeyKeySchema,
      prompt: pageJourneyQuestionPromptSchema,
      choiceKey: journeyKeySchema,
      choiceLabel: pageJourneyChoiceLabelSchema,
    }),
  ),
  outcomeKey: journeyKeySchema,
  outcomeTitle: pageJourneyOutcomeTitleSchema,
  outcomeMessage: pageJourneyOutcomeMessageSchema,
});

export interface PageJourneyValidationIssue {
  path: Array<string | number>;
  message: string;
}

export interface PageJourneyValidationResult {
  valid: boolean;
  issues: PageJourneyValidationIssue[];
  graph?: PageJourneyGraph;
  maxDepth?: number;
}

function addIssue(
  issues: PageJourneyValidationIssue[],
  path: Array<string | number>,
  message: string,
): void {
  issues.push({ path, message });
}

/**
 * Validates the complete bounded graph used by a published journey.
 *
 * Parsing is intentionally kept separate from this check. The Zod schema
 * validates field shapes and limits, while this function validates references,
 * reachability, cycles, and the publication invariants that span fields.
 */
export function validatePageJourneyGraph(
  input: unknown,
): PageJourneyValidationResult {
  const parsed = pageJourneyGraphSchema.safeParse(input);

  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.map((segment) =>
          typeof segment === "symbol" ? String(segment) : segment,
        ),
        message: issue.message,
      })),
    };
  }

  const graph = parsed.data;
  const issues: PageJourneyValidationIssue[] = [];

  if (graph.questions.length === 0) {
    addIssue(issues, ["questions"], "At least one question is required");
  }

  if (graph.outcomes.length === 0) {
    addIssue(issues, ["outcomes"], "At least one outcome is required");
  }

  const questionByKey = new Map<string, PageJourneyQuestion>();
  const outcomeByKey = new Map<string, PageJourneyOutcome>();
  const allNodeKeys = new Map<string, "question" | "outcome">();

  for (const [index, question] of graph.questions.entries()) {
    if (questionByKey.has(question.key)) {
      addIssue(
        issues,
        ["questions", index, "key"],
        "Question keys must be unique",
      );
    } else {
      questionByKey.set(question.key, question);
    }

    const previousNode = allNodeKeys.get(question.key);
    if (previousNode) {
      addIssue(
        issues,
        ["questions", index, "key"],
        `Node key is already used by a ${previousNode}`,
      );
    } else {
      allNodeKeys.set(question.key, "question");
    }

    const displayOrders = new Set<number>();
    const labels = new Map<string, number>();
    const choiceKeys = new Set<string>();

    for (const [choiceIndex, choice] of question.choices.entries()) {
      if (displayOrders.has(choice.displayOrder)) {
        addIssue(
          issues,
          ["questions", index, "choices", choiceIndex, "displayOrder"],
          "Choice display orders must be unique within a question",
        );
      }
      displayOrders.add(choice.displayOrder);

      if (choiceKeys.has(choice.key)) {
        addIssue(
          issues,
          ["questions", index, "choices", choiceIndex, "key"],
          "Choice keys must be unique within a question",
        );
      }
      choiceKeys.add(choice.key);

      const foldedLabel = choice.label.trim().toLocaleLowerCase();
      const previousLabelIndex = labels.get(foldedLabel);
      if (previousLabelIndex !== undefined) {
        addIssue(
          issues,
          ["questions", index, "choices", choiceIndex, "label"],
          `Choice label duplicates choice ${previousLabelIndex + 1} after case folding`,
        );
      }
      labels.set(foldedLabel, choiceIndex);
    }

    const questionOrders = questionByKey.get(question.key);
    if (questionOrders !== question) {
      // The duplicate key issue above is enough to keep the graph invalid.
      // This branch prevents duplicate nodes from replacing the first node in
      // the map and keeps reference checks deterministic.
      continue;
    }
  }

  const questionDisplayOrders = new Set<number>();
  for (const [index, question] of graph.questions.entries()) {
    if (questionDisplayOrders.has(question.displayOrder)) {
      addIssue(
        issues,
        ["questions", index, "displayOrder"],
        "Question display orders must be unique",
      );
    }
    questionDisplayOrders.add(question.displayOrder);
  }

  const outcomeDisplayOrders = new Set<number>();
  for (const [index, outcome] of graph.outcomes.entries()) {
    if (outcomeByKey.has(outcome.key)) {
      addIssue(
        issues,
        ["outcomes", index, "key"],
        "Outcome keys must be unique",
      );
    } else {
      outcomeByKey.set(outcome.key, outcome);
    }

    const previousNode = allNodeKeys.get(outcome.key);
    if (previousNode) {
      addIssue(
        issues,
        ["outcomes", index, "key"],
        `Node key is already used by a ${previousNode}`,
      );
    } else {
      allNodeKeys.set(outcome.key, "outcome");
    }

    if (outcomeDisplayOrders.has(outcome.displayOrder)) {
      addIssue(
        issues,
        ["outcomes", index, "displayOrder"],
        "Outcome display orders must be unique",
      );
    }
    outcomeDisplayOrders.add(outcome.displayOrder);
  }

  if (!questionByKey.has(graph.rootQuestionKey)) {
    addIssue(
      issues,
      ["rootQuestionKey"],
      "The root question must reference a question in this graph",
    );
  }

  for (const [questionIndex, question] of graph.questions.entries()) {
    for (const [choiceIndex, choice] of question.choices.entries()) {
      if (
        choice.nextQuestionKey &&
        !questionByKey.has(choice.nextQuestionKey)
      ) {
        addIssue(
          issues,
          [
            "questions",
            questionIndex,
            "choices",
            choiceIndex,
            "nextQuestionKey",
          ],
          "Choice destination question does not exist in this graph",
        );
      }
      if (choice.outcomeKey && !outcomeByKey.has(choice.outcomeKey)) {
        addIssue(
          issues,
          ["questions", questionIndex, "choices", choiceIndex, "outcomeKey"],
          "Choice destination outcome does not exist in this graph",
        );
      }
    }
  }

  if (issues.length > 0 || !questionByKey.has(graph.rootQuestionKey)) {
    return { valid: false, issues, graph };
  }

  const reachableQuestions = new Set<string>();
  const reachableOutcomes = new Set<string>();
  const visiting = new Set<string>();
  const depthByQuestion = new Map<string, number>();
  const cycleNodes = new Set<string>();

  // The graph is bounded, but a shared downstream question can be reached by
  // many paths. Memoizing the longest suffix depth keeps validation linear in
  // the number of graph edges instead of revisiting every path.
  const visitQuestion = (questionKey: string): number => {
    if (visiting.has(questionKey)) {
      if (!cycleNodes.has(questionKey)) {
        cycleNodes.add(questionKey);
        addIssue(
          issues,
          [
            "questions",
            graph.questions.findIndex((item) => item.key === questionKey),
          ],
          "The journey graph must not contain cycles",
        );
      }
      return 0;
    }

    const cachedDepth = depthByQuestion.get(questionKey);
    if (cachedDepth !== undefined) {
      return cachedDepth;
    }

    const question = questionByKey.get(questionKey);
    if (!question) {
      return 0;
    }

    visiting.add(questionKey);
    reachableQuestions.add(questionKey);
    let longestDepth = 0;

    for (const choice of question.choices) {
      if (choice.nextQuestionKey) {
        longestDepth = Math.max(
          longestDepth,
          1 + visitQuestion(choice.nextQuestionKey),
        );
      } else if (choice.outcomeKey) {
        reachableOutcomes.add(choice.outcomeKey);
        longestDepth = Math.max(longestDepth, 1);
      }
    }

    visiting.delete(questionKey);
    depthByQuestion.set(questionKey, longestDepth);
    return longestDepth;
  };

  const maxDepth = visitQuestion(graph.rootQuestionKey);

  for (const [index, question] of graph.questions.entries()) {
    if (!reachableQuestions.has(question.key)) {
      addIssue(
        issues,
        ["questions", index],
        "Question is unreachable from the root",
      );
    }
  }
  for (const [index, outcome] of graph.outcomes.entries()) {
    if (!reachableOutcomes.has(outcome.key)) {
      addIssue(
        issues,
        ["outcomes", index],
        "Outcome is unreachable from the root",
      );
    }
  }

  if (maxDepth === 0) {
    addIssue(issues, ["questions"], "The root question must reach an outcome");
  }

  return {
    valid: issues.length === 0,
    issues,
    graph,
    ...(issues.length === 0 ? { maxDepth } : {}),
  };
}

export type PageJourneyChoice = z.infer<typeof pageJourneyChoiceSchema>;
export type PageJourneyQuestion = z.infer<typeof pageJourneyQuestionSchema>;
export type PageJourneyOutcome = z.infer<typeof pageJourneyOutcomeSchema>;
export type PageJourneyGraph = z.infer<typeof pageJourneyGraphSchema>;
export type PageJourneySnapshot = z.infer<typeof pageJourneySnapshotSchema>;
