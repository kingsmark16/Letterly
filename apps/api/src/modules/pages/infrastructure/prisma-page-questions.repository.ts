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
  endsJourney: true,
  nextQuestionId: true,
  choices: {
    select: {
      id: true,
      key: true,
      label: true,
      displayOrder: true,
      creatorMessage: true,
      endsJourney: true,
      nextQuestionId: true,
    },
    orderBy: { displayOrder: 'asc' },
  },
} as const;

const graphSelect = {
  id: true,
  nextQuestionId: true,
  choices: {
    select: {
      nextQuestionId: true,
    },
  },
} as const;

type QuestionRow = Prisma.PageQuestionGetPayload<{
  select: typeof questionSelect;
}>;

type GraphRow = Prisma.PageQuestionGetPayload<{
  select: typeof graphSelect;
}>;

type PageTemplateIdentity = {
  templateVersion: {
    registryKey: string;
    version: number;
  };
};

type QuestionMutationRollback =
  | { type: 'stale'; currentContentVersion: number }
  | { type: 'updated'; question: PageQuestionRecord; contentVersion: number }
  | { type: 'deleted'; contentVersion: number };

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
    endsJourney: row.endsJourney,
    nextQuestionId: row.nextQuestionId,
    choices: row.choices.map((choice) => ({
      id: choice.id,
      key: choice.key,
      label: choice.label,
      displayOrder: choice.displayOrder,
      creatorMessage: choice.creatorMessage,
      endsJourney: choice.endsJourney,
      nextQuestionId: choice.nextQuestionId,
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

function edgesFor(row: GraphRow): string[] {
  return [
    ...(row.nextQuestionId ? [row.nextQuestionId] : []),
    ...row.choices.flatMap((choice) =>
      choice.nextQuestionId ? [choice.nextQuestionId] : [],
    ),
  ];
}

function hasValidBranchGraph(
  rows: GraphRow[],
  replacement?: { id: string; edges: string[] },
  addition?: { id: string; edges: string[] },
): boolean {
  const graph = new Map<string, string[]>(
    rows.map((row) => [row.id, edgesFor(row)]),
  );

  if (replacement) {
    graph.set(replacement.id, replacement.edges);
  }

  if (addition) {
    graph.set(addition.id, addition.edges);
  }

  const inbound = new Map<string, number>();
  for (const edges of graph.values()) {
    for (const target of edges) {
      if (!graph.has(target)) {
        return false;
      }

      const count = (inbound.get(target) ?? 0) + 1;
      if (count > 1) {
        return false;
      }
      inbound.set(target, count);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visiting.has(id)) {
      return false;
    }
    if (visited.has(id)) {
      return true;
    }

    visiting.add(id);
    for (const target of graph.get(id) ?? []) {
      if (!visit(target)) {
        return false;
      }
    }
    visiting.delete(id);
    visited.add(id);
    return true;
  };

  return [...graph.keys()].every((id) => visit(id));
}

function collectSubtree(
  rows: GraphRow[],
  rootId: string,
  replacement?: { id: string; edges: string[] },
): Set<string> {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    children.set(row.id, edgesFor(row));
  }
  if (replacement) {
    children.set(replacement.id, replacement.edges);
  }

  const result = new Set<string>();
  const visit = (id: string): void => {
    if (result.has(id)) {
      return;
    }
    result.add(id);
    for (const child of children.get(id) ?? []) {
      visit(child);
    }
  };
  visit(rootId);
  return result;
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

function questionEdges(
  type: 'CHOICE' | 'PLAIN_MESSAGE',
  nextQuestionId: string | null | undefined,
  choices: QuestionChoiceInput[],
): string[] {
  return type === 'PLAIN_MESSAGE'
    ? nextQuestionId
      ? [nextQuestionId]
      : []
    : choices.flatMap((choice) =>
        choice.nextQuestionId ? [choice.nextQuestionId] : [],
      );
}

function hasInvalidFinishDestination(
  endsJourney: boolean | undefined,
  nextQuestionId: string | null | undefined,
): boolean {
  return endsJourney === true && Boolean(nextQuestionId);
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
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });

        if (!page) {
          return { type: 'not_found' as const };
        }
        if (page.status === 'ARCHIVED') {
          return { type: 'invalid_state' as const };
        }
        if (!hasQuestionCapability(page)) {
          return { type: 'unsupported_capability' as const };
        }

        const choices = input.choices ?? [];
        const endsJourney =
          input.type === 'PLAIN_MESSAGE' ? (input.endsJourney ?? false) : false;
        if (
          (input.type === 'CHOICE' && !isValidChoiceList(choices)) ||
          (input.type === 'PLAIN_MESSAGE' && choices.length > 0) ||
          (input.type === 'CHOICE' && input.nextQuestionId) ||
          (input.type === 'CHOICE' && input.endsJourney) ||
          (input.type === 'PLAIN_MESSAGE' &&
            hasInvalidFinishDestination(endsJourney, input.nextQuestionId)) ||
          choices.some((choice) =>
            hasInvalidFinishDestination(
              choice.endsJourney,
              choice.nextQuestionId,
            ),
          )
        ) {
          return { type: 'invalid_branch' as const };
        }

        const rows = await transaction.pageQuestion.findMany({
          where: { pageId: input.pageId },
          select: graphSelect,
        });
        const id = randomUUID();
        const edges = questionEdges(input.type, input.nextQuestionId, choices);
        if (!hasValidBranchGraph(rows, undefined, { id, edges })) {
          return { type: 'invalid_branch' as const };
        }

        await transaction.pageQuestion.create({
          data: {
            id,
            pageId: input.pageId,
            key: input.key,
            type: input.type,
            prompt: input.prompt,
            displayOrder: input.displayOrder,
            config: toJsonObject(input.config),
            endsJourney,
            nextQuestionId:
              input.type === 'PLAIN_MESSAGE'
                ? (input.nextQuestionId ?? null)
                : null,
            choices:
              input.type === 'CHOICE'
                ? {
                    create: choices.map((choice) => ({
                      key: choice.key,
                      label: choice.label,
                      displayOrder: choice.displayOrder,
                      creatorMessage: choice.creatorMessage ?? null,
                      endsJourney: choice.endsJourney ?? false,
                      nextQuestionId: choice.nextQuestionId ?? null,
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
      if (error instanceof RollbackMutationError) {
        return error.result.type === 'stale'
          ? error.result
          : { type: 'invalid_branch' };
      }
      if (isUniqueViolation(error)) {
        return { type: 'key_taken' };
      }
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
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });

        if (!page) {
          return { type: 'not_found' as const };
        }
        if (page.status === 'ARCHIVED') {
          return { type: 'invalid_state' as const };
        }
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
        if (!current) {
          return { type: 'not_found' as const };
        }

        const rows = await transaction.pageQuestion.findMany({
          where: { pageId: input.pageId },
          select: graphSelect,
        });
        const finalType = input.type ?? current.type;
        const currentChoicesByKey = new Map(
          current.choices.map((choice) => [choice.key, choice]),
        );
        const finalChoices =
          input.choices?.map((choice) => ({
            ...choice,
            endsJourney:
              choice.endsJourney ??
              currentChoicesByKey.get(choice.key)?.endsJourney ??
              false,
          })) ??
          (finalType === 'CHOICE'
            ? current.choices.map((choice) => ({
                key: choice.key,
                label: choice.label,
                displayOrder: choice.displayOrder,
                creatorMessage: choice.creatorMessage ?? undefined,
                endsJourney: choice.endsJourney,
                nextQuestionId: choice.nextQuestionId,
              }))
            : []);
        const finalEndsJourney =
          finalType === 'PLAIN_MESSAGE'
            ? (input.endsJourney ?? current.endsJourney)
            : false;
        const finalNextQuestionId =
          finalType === 'PLAIN_MESSAGE'
            ? 'nextQuestionId' in input
              ? (input.nextQuestionId ?? null)
              : current.nextQuestionId
            : null;

        if (
          (finalType === 'CHOICE' && !isValidChoiceList(finalChoices)) ||
          (finalType === 'PLAIN_MESSAGE' && finalChoices.length > 0) ||
          (finalType === 'CHOICE' &&
            'nextQuestionId' in input &&
            input.nextQuestionId) ||
          (finalType === 'CHOICE' && input.endsJourney) ||
          hasInvalidFinishDestination(finalEndsJourney, finalNextQuestionId) ||
          finalChoices.some((choice) =>
            hasInvalidFinishDestination(
              choice.endsJourney,
              choice.nextQuestionId,
            ),
          )
        ) {
          return { type: 'invalid_branch' as const };
        }

        const edges = questionEdges(
          finalType,
          finalNextQuestionId,
          finalChoices,
        );
        if (!hasValidBranchGraph(rows, { id: input.questionId, edges })) {
          return { type: 'invalid_branch' as const };
        }

        const responseContentChanged = [
          'type',
          'prompt',
          'config',
          'endsJourney',
          'nextQuestionId',
          'choices',
        ].some((field) => Object.prototype.hasOwnProperty.call(input, field));
        const affectedQuestionIds = responseContentChanged
          ? [
              ...new Set([
                ...collectSubtree(rows, input.questionId),
                ...collectSubtree(rows, input.questionId, {
                  id: input.questionId,
                  edges,
                }),
              ]),
            ]
          : [];
        const affectedSubmissionIds = responseContentChanged
          ? [
              ...new Set(
                (
                  await transaction.visitorAnswer.findMany({
                    where: {
                      questionId: { in: affectedQuestionIds },
                      submission: { deletedAt: null },
                    },
                    select: { submissionId: true },
                  })
                ).map((answer) => answer.submissionId),
              ),
            ]
          : [];
        const affectedResponseCount = affectedSubmissionIds.length;
        if (affectedResponseCount > 0 && !input.confirmResponseDeletion) {
          return {
            type: 'response_impact' as const,
            affectedResponseCount,
          };
        }

        if (affectedResponseCount > 0) {
          await transaction.visitorAnswer.deleteMany({
            where: { questionId: { in: affectedQuestionIds } },
          });
          if (transaction.visitorSubmission.findMany) {
            const emptySubmissions =
              await transaction.visitorSubmission.findMany({
                where: {
                  id: { in: affectedSubmissionIds },
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
          } else {
            await transaction.visitorSubmission.deleteMany({
              where: {
                id: { in: affectedSubmissionIds },
                answers: { none: {} },
                visitorMessage: { is: null },
              },
            });
          }
        }

        await transaction.pageQuestion.update({
          where: { id: input.questionId },
          data: {
            type: finalType,
            prompt: input.prompt ?? current.prompt,
            displayOrder: input.displayOrder ?? current.displayOrder,
            ...(Object.prototype.hasOwnProperty.call(input, 'config')
              ? { config: toJsonObject(input.config) }
              : {}),
            endsJourney: finalEndsJourney,
            nextQuestionId: finalNextQuestionId,
            choices: {
              deleteMany: {},
              ...(finalType === 'CHOICE'
                ? {
                    create: finalChoices.map((choice) => ({
                      key: choice.key,
                      label: choice.label,
                      displayOrder: choice.displayOrder,
                      creatorMessage: choice.creatorMessage ?? null,
                      endsJourney: choice.endsJourney ?? false,
                      nextQuestionId: choice.nextQuestionId ?? null,
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
      if (error instanceof RollbackMutationError) {
        return error.result.type === 'stale'
          ? error.result
          : { type: 'invalid_branch' };
      }
      if (isUniqueViolation(error)) {
        return { type: 'key_taken' };
      }
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
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: {
            contentVersion: true,
            status: true,
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) {
          return { type: 'not_found' as const };
        }
        if (page.status === 'ARCHIVED') {
          return { type: 'invalid_state' as const };
        }
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
          select: graphSelect,
        });
        if (!rows.some((row) => row.id === input.questionId)) {
          return { type: 'not_found' as const };
        }

        const subtree = collectSubtree(rows, input.questionId);
        const hasExternalReference = rows.some(
          (row) =>
            !subtree.has(row.id) &&
            edgesFor(row).some((target) => subtree.has(target)),
        );
        if (hasExternalReference) {
          return { type: 'question_referenced' as const };
        }
        const affectedAnswers = await transaction.visitorAnswer.findMany({
          where: {
            questionId: { in: [...subtree] },
            submission: { deletedAt: null },
          },
          select: { submissionId: true },
        });
        const affectedSubmissionIds = [
          ...new Set(affectedAnswers.map((answer) => answer.submissionId)),
        ];
        const affectedResponseCount = affectedSubmissionIds.length;
        if (affectedResponseCount > 0 && !input.confirmResponseDeletion) {
          return {
            type: 'response_impact' as const,
            affectedResponseCount,
          };
        }

        if (affectedResponseCount > 0) {
          await transaction.visitorAnswer.deleteMany({
            where: { questionId: { in: [...subtree] } },
          });
          if (transaction.visitorSubmission.findMany) {
            const emptySubmissions =
              await transaction.visitorSubmission.findMany({
                where: {
                  id: { in: affectedSubmissionIds },
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
          } else {
            await transaction.visitorSubmission.deleteMany({
              where: {
                id: { in: affectedSubmissionIds },
                answers: { none: {} },
                visitorMessage: { is: null },
              },
            });
          }
        }
        await transaction.pageQuestion.deleteMany({
          where: {
            pageId: input.pageId,
            id: { in: [...subtree] },
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

        return {
          type: 'deleted' as const,
          contentVersion: page.contentVersion + 1,
        };
      });
    } catch (error: unknown) {
      if (error instanceof RollbackMutationError) {
        return error.result.type === 'stale'
          ? error.result
          : { type: 'invalid_branch' };
      }
      throw error;
    }
  }
}
