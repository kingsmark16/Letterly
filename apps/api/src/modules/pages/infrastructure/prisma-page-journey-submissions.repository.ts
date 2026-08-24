import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import {
  pageJourneySnapshotSchema,
  secretLetterPrivateSettingsSchema,
  secretLetterSettingsSchema,
  templateRegistry,
  type PageJourneySnapshot,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  PageJourneySubmissionRepository,
  SubmitPageJourneyResponseInput,
  SubmitPageJourneyResponseResult,
} from '../application/page-journey-submissions.repository';
import { publicPageAvailabilityWhere } from '../application/public-availability';

const publishedRevisionSelect = {
  revisionNumber: true,
  rootQuestion: { select: { key: true } },
  questions: {
    select: {
      key: true,
      prompt: true,
      choices: {
        select: {
          key: true,
          label: true,
          nextQuestion: { select: { key: true } },
          outcome: { select: { key: true } },
        },
      },
    },
  },
  outcomes: {
    select: {
      key: true,
      title: true,
      resultMessage: true,
    },
  },
} as const;

export const JOURNEY_SUBMISSION_TRANSACTION_TIMEOUT_MS = 30_000;

export type PublishedJourneyRevision = {
  revisionNumber: number;
  rootQuestion: { key: string };
  questions: Array<{
    key: string;
    prompt: string;
    choices: Array<{
      key: string;
      label: string;
      nextQuestion: { key: string } | null;
      outcome: { key: string } | null;
    }>;
  }>;
  outcomes: Array<{
    key: string;
    title: string;
    resultMessage: string;
  }>;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function resolveTemplate(page: {
  templateVersion: { registryKey: string; version: number };
}) {
  return Object.values(templateRegistry).find(
    (candidate) =>
      candidate.registryKey === page.templateVersion.registryKey &&
      candidate.version === page.templateVersion.version,
  );
}

export function buildPageJourneySnapshot(
  revision: PublishedJourneyRevision,
  input: SubmitPageJourneyResponseInput,
): PageJourneySnapshot | null {
  const questions = new Map(
    revision.questions.map((question) => [question.key, question]),
  );
  const outcomes = new Map(
    revision.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  const answers: PageJourneySnapshot['answers'] = [];
  let questionKey = revision.rootQuestion.key;
  let outcomeKey: string | null = null;

  for (const [index, answer] of input.answers.entries()) {
    if (answer.questionKey !== questionKey) {
      return null;
    }
    const question = questions.get(questionKey);
    const choice = question?.choices.find(
      (candidate) => candidate.key === answer.choiceKey,
    );
    if (!question || !choice) {
      return null;
    }

    answers.push({
      questionKey: question.key,
      prompt: question.prompt,
      choiceKey: choice.key,
      choiceLabel: choice.label,
    });

    if (choice.outcome) {
      if (index !== input.answers.length - 1) {
        return null;
      }
      outcomeKey = choice.outcome.key;
    } else if (choice.nextQuestion) {
      questionKey = choice.nextQuestion.key;
    } else {
      return null;
    }
  }

  if (!outcomeKey || outcomeKey !== input.outcomeKey) {
    return null;
  }
  const outcome = outcomes.get(outcomeKey);
  if (!outcome) {
    return null;
  }

  return pageJourneySnapshotSchema.parse({
    revisionNumber: revision.revisionNumber,
    answers,
    outcomeKey: outcome.key,
    outcomeTitle: outcome.title,
    outcomeMessage: outcome.resultMessage,
  });
}

@Injectable()
export class PrismaPageJourneySubmissionRepository implements PageJourneySubmissionRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findPublishedPageScope(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findFirst({
      where: publicPageAvailabilityWhere(slug.trim().toLowerCase()),
      select: {
        id: true,
        settings: true,
        templateVersion: {
          select: { registryKey: true, version: true },
        },
      },
    });
    if (!page) return null;

    const template = resolveTemplate(page);
    const settings = secretLetterSettingsSchema.parse(page.settings);
    return template?.registryKey === 'confession.choose-your-heart' &&
      settings.responsesEnabled
      ? page.id
      : null;
  }

  async submitJourneyResponse(
    input: SubmitPageJourneyResponseInput,
  ): Promise<SubmitPageJourneyResponseResult> {
    const normalizedSlug = input.slug.trim().toLowerCase();

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          await transaction.$queryRaw`
          SELECT page."id" FROM "Page" page
          INNER JOIN "user" creator ON creator."id" = page."creatorId"
          WHERE page."slug" = ${normalizedSlug}
            AND page."status" = 'PUBLISHED'
            AND page."moderationStatus" = 'ACTIVE'
            AND creator."moderationStatus" = 'ACTIVE'
            AND (page."expiresAt" IS NULL OR page."expiresAt" > CURRENT_TIMESTAMP)
          FOR UPDATE OF page
        `;
          await transaction.$queryRaw`
          SELECT "id" FROM "PageJourney"
          WHERE "pageId" = (
            SELECT page."id" FROM "Page" page
            INNER JOIN "user" creator ON creator."id" = page."creatorId"
            WHERE page."slug" = ${normalizedSlug}
              AND page."status" = 'PUBLISHED'
              AND page."moderationStatus" = 'ACTIVE'
              AND creator."moderationStatus" = 'ACTIVE'
              AND (page."expiresAt" IS NULL OR page."expiresAt" > CURRENT_TIMESTAMP)
          )
          FOR UPDATE
        `;

          const page = await transaction.page.findFirst({
            where: publicPageAvailabilityWhere(normalizedSlug),
            select: {
              id: true,
              settings: true,
              templateVersion: {
                select: { registryKey: true, version: true },
              },
            },
          });
          if (!page) return { type: 'not_found' };

          const template = resolveTemplate(page);
          if (template?.registryKey !== 'confession.choose-your-heart') {
            return { type: 'unsupported_capability' };
          }

          const settings = secretLetterPrivateSettingsSchema.parse(
            page.settings,
          );
          if (!settings.responsesEnabled) return { type: 'not_found' };
          if (
            input.observedPasswordVersion !== undefined &&
            (settings.passwordProtection?.passwordVersion ?? null) !==
              input.observedPasswordVersion
          ) {
            return { type: 'not_found' };
          }

          const existingByKey = await transaction.visitorSubmission.findUnique({
            where: {
              pageId_idempotencyKey: {
                pageId: page.id,
                idempotencyKey: input.idempotencyKey,
              },
            },
            select: { idempotencyPayloadHash: true },
          });
          if (existingByKey) {
            return existingByKey.idempotencyPayloadHash ===
              input.idempotencyPayloadHash
              ? { type: 'accepted' }
              : { type: 'idempotency_conflict' };
          }

          const journey = await transaction.pageJourney.findUnique({
            where: { pageId: page.id },
            select: {
              publishedRevision: { select: publishedRevisionSelect },
            },
          });
          const revision =
            journey?.publishedRevision as PublishedJourneyRevision | null;
          if (!revision) return { type: 'not_found' };
          if (revision.revisionNumber !== input.publishedGraphVersion) {
            return { type: 'version_conflict' };
          }

          const existingByBrowser =
            await transaction.visitorSubmission.findUnique({
              where: {
                pageId_browserTokenHash: {
                  pageId: page.id,
                  browserTokenHash: input.browserTokenHash,
                },
              },
              select: { id: true },
            });
          if (existingByBrowser) return { type: 'duplicate' };

          const snapshot = buildPageJourneySnapshot(revision, input);
          if (!snapshot) return { type: 'invalid_branch' };

          await transaction.visitorSubmission.create({
            data: {
              pageId: page.id,
              browserTokenHash: input.browserTokenHash,
              idempotencyKey: input.idempotencyKey,
              idempotencyPayloadHash: input.idempotencyPayloadHash,
              journeySnapshot: snapshot,
              visitorMessage: input.visitorMessage
                ? {
                    create: {
                      promptSnapshot: template.response.visitorMessagePrompt,
                      message: input.visitorMessage,
                    },
                  }
                : undefined,
            },
          });
          return { type: 'accepted' };
        },
        { timeout: JOURNEY_SUBMISSION_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const pageId = await this.findPublishedPageScope(normalizedSlug);
        if (!pageId) return { type: 'not_found' };
        const existing = await this.prisma.visitorSubmission.findUnique({
          where: {
            pageId_idempotencyKey: {
              pageId,
              idempotencyKey: input.idempotencyKey,
            },
          },
          select: { idempotencyPayloadHash: true },
        });
        if (existing) {
          return existing.idempotencyPayloadHash ===
            input.idempotencyPayloadHash
            ? { type: 'accepted' }
            : { type: 'idempotency_conflict' };
        }
        return { type: 'duplicate' };
      }
      throw error;
    }
  }
}
