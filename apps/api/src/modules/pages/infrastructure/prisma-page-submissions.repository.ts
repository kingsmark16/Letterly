import { Inject, Injectable } from '@nestjs/common';
import { DbNull } from '@letterly/database/json';
import type { Prisma, PrismaClient } from '@letterly/database';
import {
  pageJourneySnapshotSchema,
  secretLetterPrivateSettingsSchema,
  secretLetterSettingsSchema,
  templateRegistry,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  ListSubmissionsInput,
  ListSubmissionsResult,
  PageSubmissionsRepository,
  SubmissionCursor,
  SubmissionDetail,
  SubmitVisitorResponseInput,
  SubmitVisitorResponseResult,
} from '../application/page-submissions.repository';
import { publicPageAvailabilityWhere } from '../application/public-availability';

const publicQuestionSelect = {
  id: true,
  type: true,
  prompt: true,
  displayOrder: true,
  choices: {
    select: {
      id: true,
      label: true,
    },
    orderBy: { displayOrder: 'asc' },
  },
} as const;

const submissionSummarySelect = {
  id: true,
  readState: true,
  submittedAt: true,
  _count: { select: { answers: true } },
  visitorMessage: { select: { id: true } },
  journeySnapshot: true,
} as const;

const submissionDetailSelect = {
  id: true,
  pageId: true,
  readState: true,
  submittedAt: true,
  answers: {
    select: {
      questionId: true,
      promptSnapshot: true,
      choiceLabelSnapshot: true,
      textAnswer: true,
    },
    orderBy: { answerOrder: 'asc' },
  },
  visitorMessage: {
    select: {
      promptSnapshot: true,
      message: true,
    },
  },
  journeySnapshot: true,
} as const;

type PublicQuestion = Prisma.PageQuestionGetPayload<{
  select: typeof publicQuestionSelect;
}>;

type SubmissionSummaryRow = Prisma.VisitorSubmissionGetPayload<{
  select: typeof submissionSummarySelect;
}>;

type SubmissionDetailRow = Prisma.VisitorSubmissionGetPayload<{
  select: typeof submissionDetailSelect;
}>;

type PageTemplateIdentity = {
  templateVersion: {
    registryKey: string;
    version: number;
  };
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function deletedSubmissionKey(prefix: string, submissionId: string): string {
  return `deleted:${prefix}:${submissionId}`;
}

function mapSummary(row: SubmissionSummaryRow) {
  const journeySnapshot = row.journeySnapshot
    ? pageJourneySnapshotSchema.safeParse(row.journeySnapshot)
    : null;
  return {
    id: row.id,
    readState: row.readState,
    submittedAt: row.submittedAt,
    answerCount:
      row._count.answers ||
      (journeySnapshot?.success ? journeySnapshot.data.answers.length : 0),
    hasVisitorMessage: row.visitorMessage !== null,
  };
}

function mapDetail(row: SubmissionDetailRow): SubmissionDetail {
  return {
    id: row.id,
    pageId: row.pageId,
    readState: row.readState,
    submittedAt: row.submittedAt,
    answers: row.answers,
    visitorMessage: row.visitorMessage,
    journeySnapshot: row.journeySnapshot
      ? pageJourneySnapshotSchema.parse(row.journeySnapshot)
      : null,
  };
}

function findAnswer(
  answers: SubmitVisitorResponseInput['answers'],
  questionId: string,
) {
  return answers.find((answer) => answer.questionId === questionId);
}

export function validateAnswers(
  questions: PublicQuestion[],
  input: SubmitVisitorResponseInput,
  requiredAnswers: boolean,
): Array<{
  questionId: string;
  choiceId: string | null;
  textAnswer: string | null;
  promptSnapshot: string;
  choiceLabelSnapshot: string | null;
}> | null {
  const answerIds = new Set<string>();
  const orderedQuestions = [...questions].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
  const snapshots: Array<{
    questionId: string;
    choiceId: string | null;
    textAnswer: string | null;
    promptSnapshot: string;
    choiceLabelSnapshot: string | null;
  }> = [];

  for (const question of orderedQuestions) {
    const answer = findAnswer(input.answers, question.id);
    if (!answer) {
      if (requiredAnswers) return null;
      continue;
    }

    if (answerIds.has(answer.questionId)) {
      return null;
    }
    answerIds.add(answer.questionId);

    if (question.type === 'CHOICE') {
      if (
        !answer.choiceId ||
        (answer.textAnswer !== undefined && answer.textAnswer !== null)
      ) {
        return null;
      }
      const choice = question.choices.find(
        (item) => item.id === answer.choiceId,
      );
      if (!choice) {
        return null;
      }
      snapshots.push({
        questionId: question.id,
        choiceId: choice.id,
        textAnswer: null,
        promptSnapshot: question.prompt,
        choiceLabelSnapshot: choice.label,
      });
      continue;
    }

    if (
      !answer.textAnswer ||
      (answer.choiceId !== undefined && answer.choiceId !== null)
    ) {
      return null;
    }
    snapshots.push({
      questionId: question.id,
      choiceId: null,
      textAnswer: answer.textAnswer,
      promptSnapshot: question.prompt,
      choiceLabelSnapshot: null,
    });
  }

  if (questions.length === 0) {
    return input.visitorMessage ? [] : null;
  }

  if (answerIds.size !== input.answers.length) {
    return null;
  }

  if (snapshots.length === 0 && !input.visitorMessage) {
    return null;
  }

  return snapshots;
}

function resolveTemplate(page: PageTemplateIdentity) {
  return Object.values(templateRegistry).find(
    (candidate) =>
      candidate.registryKey === page.templateVersion.registryKey &&
      candidate.version === page.templateVersion.version,
  );
}

async function lockPublishedPage(
  transaction: Pick<PrismaClient, '$queryRaw'>,
  slug: string,
): Promise<void> {
  await transaction.$queryRaw`
    SELECT page."id" FROM "Page" page
    INNER JOIN "user" creator ON creator."id" = page."creatorId"
    WHERE page."slug" = ${slug}
      AND page."status" = 'PUBLISHED'
      AND page."moderationStatus" = 'ACTIVE'
      AND creator."moderationStatus" = 'ACTIVE'
      AND (page."expiresAt" IS NULL OR page."expiresAt" > CURRENT_TIMESTAMP)
    FOR UPDATE OF page
  `;
}

function cursorWhere(cursor: SubmissionCursor | null) {
  if (!cursor) {
    return {};
  }

  return {
    OR: [
      { submittedAt: { lt: cursor.submittedAt } },
      { submittedAt: cursor.submittedAt, id: { lt: cursor.id } },
    ],
  };
}

@Injectable()
export class PrismaPageSubmissionsRepository implements PageSubmissionsRepository {
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
        questions: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!page) {
      return null;
    }

    const settings = page.settings
      ? secretLetterSettingsSchema.parse(page.settings)
      : null;
    if (
      (!settings?.responsesEnabled && (page.questions?.length ?? 0) === 0) ||
      !resolveTemplate(page)
    ) {
      return null;
    }

    return page?.id ?? null;
  }

  async submitVisitorResponse(
    input: SubmitVisitorResponseInput,
  ): Promise<SubmitVisitorResponseResult> {
    const normalizedSlug = input.slug.trim().toLowerCase();

    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockPublishedPage(transaction, normalizedSlug);
        const page = await transaction.page.findFirst({
          where: publicPageAvailabilityWhere(normalizedSlug),
          select: {
            id: true,
            settings: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
            questions: {
              select: publicQuestionSelect,
              orderBy: { displayOrder: 'asc' },
            },
          },
        });
        if (!page) {
          return { type: 'not_found' as const };
        }

        const settings = page.settings
          ? secretLetterSettingsSchema.parse(page.settings)
          : null;
        const template = resolveTemplate(page);
        if (!template) {
          return { type: 'unsupported_capability' as const };
        }
        if (
          !settings?.responsesEnabled &&
          (page.questions?.length ?? 0) === 0
        ) {
          return { type: 'not_found' as const };
        }

        const passwordProtection = page.settings
          ? secretLetterPrivateSettingsSchema.parse(page.settings)
              .passwordProtection
          : null;
        if (
          input.observedPasswordVersion !== undefined &&
          (passwordProtection?.passwordVersion ?? null) !==
            input.observedPasswordVersion
        ) {
          return { type: 'not_found' as const };
        }

        if (
          (input.answers.length > 0 &&
            !template.capabilities.includes('questions')) ||
          (input.visitorMessage &&
            !template.capabilities.includes('visitorMessage'))
        ) {
          return { type: 'unsupported_capability' as const };
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
          if (
            existingByKey.idempotencyPayloadHash ===
            input.idempotencyPayloadHash
          ) {
            return { type: 'accepted' as const };
          }
          return { type: 'idempotency_conflict' as const };
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
        if (existingByBrowser) {
          return { type: 'duplicate' as const };
        }

        const snapshots = validateAnswers(
          page.questions,
          input,
          template.questionRules?.required ?? false,
        );
        if (!snapshots) {
          return { type: 'invalid_branch' as const };
        }

        await transaction.visitorSubmission.create({
          data: {
            pageId: page.id,
            browserTokenHash: input.browserTokenHash,
            idempotencyKey: input.idempotencyKey,
            idempotencyPayloadHash: input.idempotencyPayloadHash,
            answers: {
              create: snapshots.map((answer, answerOrder) => ({
                questionId: answer.questionId,
                answerOrder,
                choiceId: answer.choiceId,
                textAnswer: answer.textAnswer,
                promptSnapshot: answer.promptSnapshot,
                choiceLabelSnapshot: answer.choiceLabelSnapshot,
              })),
            },
            visitorMessage: input.visitorMessage
              ? {
                  create: {
                    promptSnapshot: 'Visitor message',
                    message: input.visitorMessage.message,
                  },
                }
              : undefined,
          },
        });
        return { type: 'accepted' as const };
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const pageId = await this.findPublishedPageId(normalizedSlug);
        if (!pageId) {
          return { type: 'not_found' };
        }

        const existingByKey = await this.prisma.visitorSubmission.findUnique({
          where: {
            pageId_idempotencyKey: {
              pageId,
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
        return { type: 'duplicate' };
      }
      throw error;
    }
  }

  async listOwned(
    input: ListSubmissionsInput,
  ): Promise<ListSubmissionsResult | { type: 'not_found' }> {
    return this.prisma.$transaction(
      async (transaction) => {
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: { id: true },
        });
        if (!page) {
          return { type: 'not_found' as const };
        }

        const where = {
          pageId: input.pageId,
          deletedAt: null,
          ...(input.filter === 'unread'
            ? { readState: 'UNREAD' as const }
            : {}),
          ...cursorWhere(input.cursor),
        };
        const countUnread = transaction.visitorSubmission.count.bind(
          transaction.visitorSubmission,
        );
        const [rows, unreadCount] = await Promise.all([
          transaction.visitorSubmission.findMany({
            where,
            orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
            take: input.size + 1,
            select: submissionSummarySelect,
          }),
          countUnread
            ? countUnread({
                where: {
                  pageId: input.pageId,
                  deletedAt: null,
                  readState: 'UNREAD',
                },
              })
            : Promise.resolve(0),
        ]);
        const hasMore = rows.length > input.size;
        const items = hasMore ? rows.slice(0, input.size) : rows;
        const last = items.at(-1);

        return {
          items: items.map(mapSummary),
          unreadCount,
          nextCursor:
            hasMore && last
              ? { submittedAt: last.submittedAt, id: last.id }
              : null,
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async findOwned(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<SubmissionDetail | null> {
    const row = await this.prisma.visitorSubmission.findFirst({
      where: {
        id: input.submissionId,
        pageId: input.pageId,
        deletedAt: null,
        page: { creatorId: input.creatorId },
      },
      select: submissionDetailSelect,
    });
    return row ? mapDetail(row) : null;
  }

  async markRead(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<'updated' | 'not_found'> {
    const result = await this.prisma.visitorSubmission.updateMany({
      where: {
        id: input.submissionId,
        pageId: input.pageId,
        deletedAt: null,
        page: { creatorId: input.creatorId },
      },
      data: { readState: 'READ' },
    });
    return result.count === 1 ? 'updated' : 'not_found';
  }

  async deleteOwned(input: {
    creatorId: string;
    pageId: string;
    submissionId: string;
  }): Promise<'deleted' | 'not_found'> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.visitorSubmission.updateMany({
        where: {
          id: input.submissionId,
          pageId: input.pageId,
          deletedAt: null,
          page: { creatorId: input.creatorId },
        },
        data: {
          deletedAt: new Date(),
          journeySnapshot: DbNull,
          // Keep the tombstone for creator history, but release the visitor
          // supplied uniqueness keys so a later response is not replayed.
          idempotencyKey: deletedSubmissionKey(
            'idempotency',
            input.submissionId,
          ),
          browserTokenHash: deletedSubmissionKey('browser', input.submissionId),
        },
      });
      if (result.count !== 1) return 'not_found' as const;

      if (transaction.visitorAnswer?.deleteMany) {
        await transaction.visitorAnswer.deleteMany({
          where: { submissionId: input.submissionId },
        });
      }
      if (transaction.visitorMessage?.deleteMany) {
        await transaction.visitorMessage.deleteMany({
          where: { submissionId: input.submissionId },
        });
      }
      return 'deleted' as const;
    });
  }

  private async findPublishedPageId(slug: string): Promise<string | null> {
    const page = await this.prisma.page.findFirst({
      where: publicPageAvailabilityWhere(slug),
      select: { id: true },
    });
    return page?.id ?? null;
  }
}
