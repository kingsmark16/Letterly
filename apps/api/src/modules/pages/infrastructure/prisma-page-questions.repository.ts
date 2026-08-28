import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { DbNull } from '@letterly/database/json';
import type { Prisma, PrismaClient } from '@letterly/database';
import { templateRegistry } from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CreatePageQuestionInput,
  DeletePageQuestionInput,
  DeletePageQuestionResult,
  PageQuestionMutationResult,
  PageQuestionRecord,
  PageQuestionsRepository,
  QuestionChoiceInput,
  ReorderPageQuestionsInput,
  ReorderPageQuestionsResult,
  UpdatePageQuestionInput,
} from '../application/page-questions.repository';

const questionSelect = {
  id: true,
  pageId: true,
  key: true,
  type: true,
  prompt: true,
  displayOrder: true,
  config: true,
  choices: {
    select: {
      id: true,
      key: true,
      label: true,
      displayOrder: true,
      creatorMessage: true,
    },
    orderBy: { displayOrder: 'asc' },
  },
} as const;

type QuestionRow = Prisma.PageQuestionGetPayload<{
  select: typeof questionSelect;
}>;

function nextQuestionOrder(rows: Array<{ displayOrder?: number }>): number {
  return (
    rows.reduce(
      (highest, row) =>
        typeof row.displayOrder === 'number'
          ? Math.max(highest, row.displayOrder)
          : highest,
      -1,
    ) + 1
  );
}

type PageTemplateIdentity = {
  templateVersion: {
    registryKey: string;
    version: number;
  };
};

type QuestionMutationRollback =
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'updated'; question: PageQuestionRecord; contentVersion: number }
  | { type: 'deleted'; contentVersion: number }
  | { type: 'reordered'; questionIds: string[]; contentVersion: number };

class RollbackMutationError extends Error {
  constructor(readonly result: QuestionMutationRollback) {
    super('Question mutation rolled back');
    this.name = 'RollbackMutationError';
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function mapConfig(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function mapQuestion(row: QuestionRow): PageQuestionRecord {
  return {
    id: row.id,
    pageId: row.pageId,
    key: row.key,
    type: row.type,
    prompt: row.prompt,
    displayOrder: row.displayOrder,
    config: mapConfig(row.config),
    choices: row.choices.map((choice) => ({
      id: choice.id,
      key: choice.key,
      label: choice.label,
      displayOrder: choice.displayOrder,
      creatorMessage: choice.creatorMessage,
    })),
  };
}

function isValidChoiceList(choices: QuestionChoiceInput[]): boolean {
  const keys = new Set<string>();
  const orders = new Set<number>();

  for (const choice of choices) {
    if (keys.has(choice.key) || orders.has(choice.displayOrder)) {
      return false;
    }
    keys.add(choice.key);
    orders.add(choice.displayOrder);
  }

  return choices.length >= 2 && choices.length <= 10;
}

function hasQuestionCapability(page: PageTemplateIdentity): boolean {
  const template = Object.values(templateRegistry).find(
    (candidate) =>
      candidate.registryKey === page.templateVersion.registryKey &&
      candidate.version === page.templateVersion.version,
  );
  return template?.capabilities.includes('questions') ?? false;
}

async function lockPage(
  transaction: Pick<PrismaClient, '$queryRaw'>,
  pageId: string,
  creatorId?: string,
): Promise<void> {
  if (creatorId) {
    await transaction.$queryRaw`
      SELECT "id" FROM "Page"
      WHERE "id" = ${pageId} AND "creatorId" = ${creatorId}
      FOR UPDATE
    `;
    return;
  }

  await transaction.$queryRaw`
    SELECT "id" FROM "Page"
    WHERE "id" = ${pageId}
    FOR UPDATE
  `;
}

function toJsonObject(
  config: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  return config === undefined
    ? undefined
    : config === null
      ? DbNull
      : (config as Prisma.InputJsonObject);
}

async function removeAffectedResponses(
  transaction: Prisma.TransactionClient,
  questionIds: string[],
  submissionIds: string[],
): Promise<void> {
  if (submissionIds.length === 0) return;

  await transaction.visitorAnswer.deleteMany({
    where: { questionId: { in: questionIds } },
  });
  if (transaction.visitorSubmission.findMany) {
    const emptySubmissions = await transaction.visitorSubmission.findMany({
      where: {
        id: { in: submissionIds },
        deletedAt: null,
        answers: { none: {} },
        visitorMessage: { is: null },
      },
      select: { id: true },
    });
    await transaction.visitorSubmission.updateMany({
      where: {
        id: { in: emptySubmissions.map((submission) => submission.id) },
      },
      data: { deletedAt: new Date() },
    });
    return;
  }

  await transaction.visitorSubmission.deleteMany({
    where: {
      id: { in: submissionIds },
      answers: { none: {} },
      visitorMessage: { is: null },
    },
  });
}

@Injectable()
export class PrismaPageQuestionsRepository implements PageQuestionsRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async list(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageQuestionRecord[] | null> {
    const page = await this.prisma.page.findFirst({
      where: { id: input.pageId, creatorId: input.creatorId },
      select: { id: true },
    });
    if (!page) return null;

    const rows = await this.prisma.pageQuestion.findMany({
      where: { pageId: input.pageId },
      select: questionSelect,
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapQuestion);
  }

  async create(
    input: CreatePageQuestionInput,
  ): Promise<PageQuestionMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockPage(transaction, input.pageId, input.creatorId);
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) return { type: 'not_found' as const };
        if (page.status === 'ARCHIVED' || page.status === 'PUBLISHED')
          return { type: 'invalid_state' as const };
        if (!hasQuestionCapability(page)) {
          return { type: 'unsupported_capability' as const };
        }

        const choices = input.choices ?? [];
        if (
          (input.type === 'CHOICE' && !isValidChoiceList(choices)) ||
          (input.type === 'PLAIN_MESSAGE' && choices.length > 0)
        ) {
          return { type: 'invalid_branch' as const };
        }

        const rows = await transaction.pageQuestion.findMany({
          where: { pageId: input.pageId },
          select: { displayOrder: true },
        });
        const id = randomUUID();
        const displayOrder = nextQuestionOrder(rows);
        await transaction.pageQuestion.create({
          data: {
            id,
            pageId: input.pageId,
            key: `question-${id}`,
            type: input.type,
            prompt: input.prompt,
            displayOrder,
            config: toJsonObject(input.config),
            endsJourney: false,
            nextQuestionId: null,
            choices:
              input.type === 'CHOICE'
                ? {
                    create: choices.map((choice) => ({
                      key: choice.key,
                      label: choice.label,
                      displayOrder: choice.displayOrder,
                      creatorMessage: choice.creatorMessage ?? null,
                      endsJourney: false,
                      nextQuestionId: null,
                    })),
                  }
                : undefined,
          },
        });

        const updated = await transaction.page.updateMany({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            contentVersion: page.contentVersion,
          },
          data: { contentVersion: { increment: 1 } },
        });
        if (updated.count !== 1) {
          const current = await transaction.page.findFirst({
            where: { id: input.pageId, creatorId: input.creatorId },
            select: { contentVersion: true },
          });
          throw new RollbackMutationError({
            type: 'stale',
            currentContentVersion:
              current?.contentVersion ?? page.contentVersion,
          });
        }

        const question = await transaction.pageQuestion.findUniqueOrThrow({
          where: { id },
          select: questionSelect,
        });
        return {
          type: 'updated' as const,
          question: mapQuestion(question),
          contentVersion: page.contentVersion + 1,
        };
      });
    } catch (error: unknown) {
      if (error instanceof RollbackMutationError)
        return error.result as PageQuestionMutationResult;
      if (isUniqueViolation(error)) return { type: 'key_taken' };
      throw error;
    }
  }

  async update(
    input: UpdatePageQuestionInput,
  ): Promise<PageQuestionMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockPage(transaction, input.pageId, input.creatorId);
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) return { type: 'not_found' as const };
        if (page.status === 'ARCHIVED' || page.status === 'PUBLISHED')
          return { type: 'invalid_state' as const };
        if (!hasQuestionCapability(page)) {
          return { type: 'unsupported_capability' as const };
        }
        if (page.contentVersion !== input.expectedContentVersion) {
          return {
            type: 'stale' as const,
            currentContentVersion: page.contentVersion,
          };
        }

        const current = await transaction.pageQuestion.findFirst({
          where: { id: input.questionId, pageId: input.pageId },
          select: questionSelect,
        });
        if (!current) return { type: 'not_found' as const };

        const finalType = input.type ?? current.type;
        const finalChoices: QuestionChoiceInput[] =
          finalType === 'CHOICE'
            ? (input.choices ??
              current.choices.map((choice) => ({
                key: choice.key,
                label: choice.label,
                displayOrder: choice.displayOrder,
                creatorMessage: choice.creatorMessage ?? undefined,
              })))
            : [];
        if (
          (finalType === 'CHOICE' && !isValidChoiceList(finalChoices)) ||
          (finalType === 'PLAIN_MESSAGE' && finalChoices.length > 0)
        ) {
          return { type: 'invalid_branch' as const };
        }

        const responseContentChanged = [
          'type',
          'prompt',
          'config',
          'choices',
        ].some((field) => Object.prototype.hasOwnProperty.call(input, field));
        const affectedAnswers = responseContentChanged
          ? await transaction.visitorAnswer.findMany({
              where: {
                questionId: input.questionId,
                submission: { deletedAt: null },
              },
              select: { submissionId: true },
            })
          : [];
        const affectedSubmissionIds = [
          ...new Set(affectedAnswers.map((answer) => answer.submissionId)),
        ];
        if (
          affectedSubmissionIds.length > 0 &&
          !input.confirmResponseDeletion
        ) {
          return {
            type: 'response_impact' as const,
            affectedResponseCount: affectedSubmissionIds.length,
          };
        }
        await removeAffectedResponses(
          transaction,
          [input.questionId],
          affectedSubmissionIds,
        );

        await transaction.pageQuestion.update({
          where: { id: input.questionId },
          data: {
            type: finalType,
            prompt: input.prompt ?? current.prompt,
            ...(Object.prototype.hasOwnProperty.call(input, 'config')
              ? { config: toJsonObject(input.config) }
              : {}),
            endsJourney: false,
            nextQuestionId: null,
            choices: {
              deleteMany: {},
              ...(finalType === 'CHOICE'
                ? {
                    create: finalChoices.map((choice) => ({
                      key: choice.key,
                      label: choice.label,
                      displayOrder: choice.displayOrder,
                      creatorMessage: choice.creatorMessage ?? null,
                      endsJourney: false,
                      nextQuestionId: null,
                    })),
                  }
                : {}),
            },
          },
        });

        const updated = await transaction.page.updateMany({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            contentVersion: page.contentVersion,
          },
          data: { contentVersion: { increment: 1 } },
        });
        if (updated.count !== 1) {
          const currentPage = await transaction.page.findFirst({
            where: { id: input.pageId, creatorId: input.creatorId },
            select: { contentVersion: true },
          });
          throw new RollbackMutationError({
            type: 'stale',
            currentContentVersion:
              currentPage?.contentVersion ?? page.contentVersion,
          });
        }

        const question = await transaction.pageQuestion.findUniqueOrThrow({
          where: { id: input.questionId },
          select: questionSelect,
        });
        return {
          type: 'updated' as const,
          question: mapQuestion(question),
          contentVersion: page.contentVersion + 1,
        };
      });
    } catch (error: unknown) {
      if (error instanceof RollbackMutationError)
        return error.result as PageQuestionMutationResult;
      if (isUniqueViolation(error)) return { type: 'key_taken' };
      throw error;
    }
  }

  async delete(
    input: DeletePageQuestionInput,
  ): Promise<DeletePageQuestionResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockPage(transaction, input.pageId, input.creatorId);
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) return { type: 'not_found' as const };
        if (page.status === 'ARCHIVED' || page.status === 'PUBLISHED')
          return { type: 'invalid_state' as const };
        if (!hasQuestionCapability(page)) {
          return { type: 'unsupported_capability' as const };
        }
        if (page.contentVersion !== input.expectedContentVersion) {
          return {
            type: 'stale' as const,
            currentContentVersion: page.contentVersion,
          };
        }

        const question = await transaction.pageQuestion.findFirst({
          where: { id: input.questionId, pageId: input.pageId },
          select: { id: true },
        });
        if (!question) return { type: 'not_found' as const };

        const affectedAnswers = await transaction.visitorAnswer.findMany({
          where: {
            questionId: input.questionId,
            submission: { deletedAt: null },
          },
          select: { submissionId: true },
        });
        const affectedSubmissionIds = [
          ...new Set(affectedAnswers.map((answer) => answer.submissionId)),
        ];
        if (
          affectedSubmissionIds.length > 0 &&
          !input.confirmResponseDeletion
        ) {
          return {
            type: 'response_impact' as const,
            affectedResponseCount: affectedSubmissionIds.length,
          };
        }
        await removeAffectedResponses(
          transaction,
          [input.questionId],
          affectedSubmissionIds,
        );
        await transaction.pageQuestion.delete({
          where: { id: input.questionId },
        });

        const remainingQuestions = await transaction.pageQuestion.findMany({
          where: { pageId: input.pageId },
          select: { id: true },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        });
        for (const [displayOrder, remaining] of remainingQuestions.entries()) {
          await transaction.pageQuestion.updateMany({
            where: { id: remaining.id, pageId: input.pageId },
            data: { displayOrder },
          });
        }

        const updated = await transaction.page.updateMany({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            contentVersion: page.contentVersion,
          },
          data: { contentVersion: { increment: 1 } },
        });
        if (updated.count !== 1) {
          const current = await transaction.page.findFirst({
            where: { id: input.pageId, creatorId: input.creatorId },
            select: { contentVersion: true },
          });
          throw new RollbackMutationError({
            type: 'stale',
            currentContentVersion:
              current?.contentVersion ?? page.contentVersion,
          });
        }
        return {
          type: 'deleted' as const,
          contentVersion: page.contentVersion + 1,
        };
      });
    } catch (error: unknown) {
      if (error instanceof RollbackMutationError)
        return error.result as DeletePageQuestionResult;
      throw error;
    }
  }

  async reorder(
    input: ReorderPageQuestionsInput,
  ): Promise<ReorderPageQuestionsResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await lockPage(transaction, input.pageId, input.creatorId);
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) return { type: 'not_found' as const };
        if (page.status === 'ARCHIVED' || page.status === 'PUBLISHED')
          return { type: 'invalid_state' as const };
        if (!hasQuestionCapability(page)) {
          return { type: 'unsupported_capability' as const };
        }
        if (page.contentVersion !== input.expectedContentVersion) {
          return {
            type: 'stale' as const,
            currentContentVersion: page.contentVersion,
          };
        }

        const rows = await transaction.pageQuestion.findMany({
          where: { pageId: input.pageId },
          select: { id: true, displayOrder: true },
        });
        const existingIds = new Set(rows.map((row) => row.id));
        const requestedIds = new Set(input.questionIds);
        if (
          requestedIds.size !== input.questionIds.length ||
          requestedIds.size !== existingIds.size ||
          input.questionIds.some((id) => !existingIds.has(id))
        ) {
          return { type: 'invalid_order' as const };
        }

        // The page order has a unique database constraint. Move every row to
        // a temporary, distinct range first so a swap never collides with a
        // row that still has its old order.
        const currentMaximum = rows.reduce(
          (maximum, row) => Math.max(maximum, row.displayOrder),
          -1,
        );
        const temporaryOffset = currentMaximum + rows.length + 1;
        for (const [index, questionId] of input.questionIds.entries()) {
          await transaction.pageQuestion.updateMany({
            where: { id: questionId, pageId: input.pageId },
            data: { displayOrder: temporaryOffset + index },
          });
        }
        for (const [displayOrder, questionId] of input.questionIds.entries()) {
          await transaction.pageQuestion.updateMany({
            where: { id: questionId, pageId: input.pageId },
            data: { displayOrder },
          });
        }
        const updated = await transaction.page.updateMany({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            contentVersion: page.contentVersion,
          },
          data: { contentVersion: { increment: 1 } },
        });
        if (updated.count !== 1) {
          const current = await transaction.page.findFirst({
            where: { id: input.pageId, creatorId: input.creatorId },
            select: { contentVersion: true },
          });
          throw new RollbackMutationError({
            type: 'stale',
            currentContentVersion:
              current?.contentVersion ?? page.contentVersion,
          });
        }
        return {
          type: 'reordered' as const,
          questionIds: input.questionIds,
          contentVersion: page.contentVersion + 1,
        };
      });
    } catch (error: unknown) {
      if (error instanceof RollbackMutationError) {
        return error.result.type === 'stale'
          ? error.result
          : { type: 'invalid_order' };
      }
      throw error;
    }
  }
}
