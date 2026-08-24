import { z } from "zod";

const metricTemplateKeySchema = z.string().trim().min(1).max(80);
const boundedCountSchema = z.number().int().min(0).max(128);

const journeyMetricOutcomeCategoryValues = [
  "outcome_1",
  "outcome_2",
  "outcome_3",
  "outcome_4",
  "outcome_5",
  "outcome_6",
  "outcome_7",
  "outcome_8",
  "outcome_9",
  "outcome_10",
  "outcome_11",
  "outcome_12",
] as const;

export const journeyMetricOutcomeCategorySchema = z.enum(
  journeyMetricOutcomeCategoryValues,
);

export const pageJourneyMetricEventSchema = z.discriminatedUnion("event", [
  z.object({
    event: z.literal("journey_graph_validation"),
    templateKey: metricTemplateKeySchema,
    outcome: z.enum(["valid", "invalid"]),
    questionCount: boundedCountSchema,
    outcomeCount: boundedCountSchema,
    issueCount: boundedCountSchema,
  }),
  z.object({
    event: z.literal("journey_publish"),
    templateKey: metricTemplateKeySchema,
    outcome: z.enum([
      "published",
      "rejected",
      "conflict",
      "not_found",
      "unavailable",
      "error",
    ]),
  }),
  z.object({
    event: z.literal("journey_start"),
    templateKey: metricTemplateKeySchema,
  }),
  z.object({
    event: z.literal("journey_completed"),
    templateKey: metricTemplateKeySchema,
    outcomeCategory: journeyMetricOutcomeCategorySchema,
  }),
  z.object({
    event: z.literal("journey_submission"),
    templateKey: metricTemplateKeySchema,
    outcome: z.enum([
      "accepted",
      "duplicate",
      "conflict",
      "invalid",
      "not_found",
      "unsupported",
      "rate_limited",
      "error",
    ]),
  }),
]);

export const publicPageJourneyMetricEventSchema = z.discriminatedUnion(
  "event",
  [
    z.object({
      event: z.literal("journey_start"),
      templateKey: metricTemplateKeySchema,
    }),
    z.object({
      event: z.literal("journey_completed"),
      templateKey: metricTemplateKeySchema,
      outcomeCategory: journeyMetricOutcomeCategorySchema,
    }),
  ],
);

export type PageJourneyMetricEvent = z.infer<
  typeof pageJourneyMetricEventSchema
>;

export type PublicPageJourneyMetricEvent = z.infer<
  typeof publicPageJourneyMetricEventSchema
>;

export type JourneyMetricOutcomeCategory = z.infer<
  typeof journeyMetricOutcomeCategorySchema
>;

export function journeyMetricOutcomeCategory(
  displayOrder: number,
): JourneyMetricOutcomeCategory {
  const normalized = Number.isFinite(displayOrder)
    ? Math.max(
        0,
        Math.min(
          journeyMetricOutcomeCategoryValues.length - 1,
          Math.floor(displayOrder),
        ),
      )
    : 0;
  return journeyMetricOutcomeCategoryValues[normalized] ?? "outcome_1";
}
