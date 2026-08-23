import {
  pageJourneyChoiceSchema,
  pageJourneyChoiceLabelSchema,
  pageJourneyGraphSchema,
  pageJourneyOutcomeSchema,
  pageJourneyOutcomeMessageSchema,
  pageJourneyOutcomeTitleSchema,
  pageJourneyQuestionSchema,
  pageJourneyQuestionPromptSchema,
  pageJourneySnapshotSchema,
} from "@letterly/templates/journey";
import { z } from "zod";

const uuidSchema = z.string().uuid();

export const pageJourneyValidationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string().min(1),
});

export const pageJourneyValidationReportSchema = z.object({
  valid: z.boolean(),
  issues: z.array(pageJourneyValidationIssueSchema),
});

export const pageJourneyDraftSchema = pageJourneyGraphSchema.extend({
  revisionNumber: z.number().int().positive(),
});

export const pageJourneyOwnerResponseSchema = z.object({
  draft: pageJourneyDraftSchema,
  publishedGraphVersion: z.number().int().positive().nullable(),
  contentVersion: z.number().int().nonnegative(),
  validation: pageJourneyValidationReportSchema,
});

export const pageJourneySaveRequestSchema = pageJourneyGraphSchema.extend({
  expectedContentVersion: z.number().int().nonnegative(),
});

export const pageJourneySaveResponseSchema = pageJourneyOwnerResponseSchema;

export const pageJourneyPublicChoiceSchema = z.object({
  key: z.string().trim().min(1).max(100),
  label: pageJourneyChoiceLabelSchema,
  displayOrder: z.number().int().nonnegative(),
  nextQuestionKey: z.string().trim().min(1).max(100).nullable(),
  outcomeKey: z.string().trim().min(1).max(100).nullable(),
});

export const pageJourneyPublicQuestionSchema = z.object({
  key: z.string().trim().min(1).max(100),
  prompt: pageJourneyQuestionPromptSchema,
  displayOrder: z.number().int().nonnegative(),
  choices: z.array(pageJourneyPublicChoiceSchema).min(2).max(4),
});

export const pageJourneyPublicOutcomeSchema = z.object({
  key: z.string().trim().min(1).max(100),
  title: pageJourneyOutcomeTitleSchema,
  resultMessage: pageJourneyOutcomeMessageSchema,
  displayOrder: z.number().int().nonnegative(),
});

export const pageJourneyPublicProjectionSchema = z.object({
  displaySlug: z.string().min(1),
  canonicalUrl: z.string().url(),
  templateKey: z.string().trim().min(1),
  templateVersion: z.number().int().positive(),
  publishedGraphVersion: z.number().int().positive(),
  rootQuestionKey: z.string().trim().min(1).max(100),
  maxDepth: z.number().int().min(1).max(12),
  questions: z.array(pageJourneyPublicQuestionSchema).max(12),
  outcomes: z.array(pageJourneyPublicOutcomeSchema).max(12),
});

const pageJourneyPublicResponseSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    requiredAnswers: z.boolean(),
    visitorMessageEnabled: z.boolean(),
    visitorMessagePrompt: z.string().min(1).max(2000),
    visitorMessagePrivacyText: z.string().min(1).max(2000),
    visitorMessageMaxLength: z.number().int().positive().max(2000),
    textAnswerMaxLength: z.number().int().positive().max(2000),
  }),
]);

export const pageJourneyPublicPageProjectionSchema = z.object({
  displaySlug: z.string().min(1),
  canonicalUrl: z.string().url(),
  template: z.object({
    key: z.literal("choose-your-heart"),
    version: z.number().int().positive(),
  }),
  publishedGraphVersion: z.number().int().positive(),
  rootQuestionKey: z.string().trim().min(1).max(100),
  maxDepth: z.number().int().min(1).max(12),
  questions: z.array(pageJourneyPublicQuestionSchema).max(12),
  outcomes: z.array(pageJourneyPublicOutcomeSchema).max(12),
  images: z.array(
    z.object({
      imageId: uuidSchema,
      mediaUrl: z.string().startsWith("/"),
      caption: z.string().max(500).nullable(),
    }),
  ).max(10).default([]),
  response: pageJourneyPublicResponseSchema.default({ enabled: false }),
});

export const pageJourneySubmissionAnswerSchema = z.object({
  questionKey: z.string().trim().min(1).max(100),
  choiceKey: z.string().trim().min(1).max(100),
});

export const pageJourneySubmissionRequestSchema = z.object({
  publishedGraphVersion: z.number().int().positive(),
  answers: z.array(pageJourneySubmissionAnswerSchema).min(1).max(12),
  outcomeKey: z.string().trim().min(1).max(100),
  visitorMessage: z.string().trim().min(1).max(2_000).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
});

export const pageJourneySnapshotSchemaWithId = pageJourneySnapshotSchema.extend({
  pageId: uuidSchema,
});

export {
  pageJourneyChoiceSchema,
  pageJourneyGraphSchema,
  pageJourneyOutcomeSchema,
  pageJourneyQuestionSchema,
  pageJourneySnapshotSchema,
};

export type PageJourneyOwnerResponse = z.infer<
  typeof pageJourneyOwnerResponseSchema
>;
export type PageJourneySaveRequest = z.infer<
  typeof pageJourneySaveRequestSchema
>;
export type PageJourneySaveResponse = z.infer<
  typeof pageJourneySaveResponseSchema
>;
export type PageJourneyPublicProjection = z.infer<
  typeof pageJourneyPublicProjectionSchema
>;
export type PageJourneyPublicPageProjection = z.infer<
  typeof pageJourneyPublicPageProjectionSchema
>;
export type PageJourneySubmissionRequest = z.infer<
  typeof pageJourneySubmissionRequestSchema
>;
