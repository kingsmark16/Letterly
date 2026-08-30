import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@letterly/database';
import {
  pageJourneyGraphSchema,
  type PageJourneyGraph,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  PageJourneyOwnerState,
  PageJourneyRevision,
  PageJourneySaveInput,
  PageJourneySaveResult,
  PageJourneysRepository,
} from '../application/page-journeys.repository';

const journeySelect = {
  pageId: true,
  page: {
    select: {
      creatorId: true,
      status: true,
      contentVersion: true,
      templateVersion: {
        select: { registryKey: true, version: true },
      },
    },
  },
  draftRevision: {
    select: {
      revisionNumber: true,
      maxDepth: true,
      rootQuestion: { select: { key: true } },
      questions: {
        select: {
          key: true,
          prompt: true,
          displayOrder: true,
          choices: {
            select: {
              key: true,
              label: true,
              displayOrder: true,
              nextQuestion: { select: { key: true } },
              outcome: { select: { key: true } },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      outcomes: {
        select: {
          key: true,
          title: true,
          resultMessage: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
  },
  publishedRevision: { select: { revisionNumber: true } },
} as const;

type JourneyRow = Prisma.PageJourneyGetPayload<{
  select: typeof journeySelect;
}>;

type RevisionRow = {
  revisionNumber: number;
  maxDepth: number;
  rootQuestion: { key: string };
  questions: Array<{
    key: string;
    prompt: string;
    displayOrder: number;
    choices: Array<{
      key: string;
      label: string;
      displayOrder: number;
      nextQuestion: { key: string } | null;
      outcome: { key: string } | null;
    }>;
  }>;
  outcomes: Array<{
    key: string;
    title: string;
    resultMessage: string;
    displayOrder: number;
  }>;
};

async function deferJourneyConstraints(
  transaction: Pick<Prisma.TransactionClient, '$executeRaw'>,
): Promise<void> {
  await transaction.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
}

function mapRevision(row: RevisionRow): PageJourneyRevision {
  return {
    revisionNumber: row.revisionNumber,
    maxDepth: row.maxDepth,
    graph: pageJourneyGraphSchema.parse({
      schemaVersion: 1,
      rootQuestionKey: row.rootQuestion.key,
      questions: row.questions.map((question) => ({
        key: question.key,
        prompt: question.prompt,
        displayOrder: question.displayOrder,
        choices: question.choices.map((choice) => ({
          key: choice.key,
          label: choice.label,
          displayOrder: choice.displayOrder,
          nextQuestionKey: choice.nextQuestion?.key ?? null,
          outcomeKey: choice.outcome?.key ?? null,
        })),
      })),
      outcomes: row.outcomes,
    }),
  };
}

function mapOwnerState(row: JourneyRow): PageJourneyOwnerState {
  return {
    pageId: row.pageId,
    creatorId: row.page.creatorId,
    status: row.page.status,
    contentVersion: row.page.contentVersion,
    template: row.page.templateVersion,
    draft: mapRevision(row.draftRevision),
    publishedGraphVersion: row.publishedRevision?.revisionNumber ?? null,
  };
}

async function createRevisionRows(
  transaction: Prisma.TransactionClient,
  journeyId: string,
  revisionNumber: number,
  graph: PageJourneyGraph,
  maxDepth: number,
  revisionId = randomUUID(),
): Promise<string> {
  const questionIds = new Map(
    graph.questions.map((question) => [question.key, randomUUID()]),
  );
  const outcomeIds = new Map(
    graph.outcomes.map((outcome) => [outcome.key, randomUUID()]),
  );
  const rootQuestionId = questionIds.get(graph.rootQuestionKey);

  if (!rootQuestionId) {
    throw new Error('Journey root question is missing');
  }

  await transaction.pageJourneyGraphRevision.create({
    data: {
      id: revisionId,
      journeyId,
      revisionNumber,
      rootQuestionId,
      maxDepth,
    },
  });

  await transaction.pageJourneyQuestion.createMany({
    data: graph.questions.map((question) => ({
      id: questionIds.get(question.key) as string,
      revisionId,
      key: question.key,
      prompt: question.prompt,
      displayOrder: question.displayOrder,
    })),
  });

  await transaction.pageJourneyOutcome.createMany({
    data: graph.outcomes.map((outcome) => ({
      id: outcomeIds.get(outcome.key) as string,
      revisionId,
      key: outcome.key,
      title: outcome.title,
      resultMessage: outcome.resultMessage,
      displayOrder: outcome.displayOrder,
    })),
  });

  await transaction.pageJourneyChoice.createMany({
    data: graph.questions.flatMap((question) =>
      question.choices.map((choice) => ({
        id: randomUUID(),
        questionId: questionIds.get(question.key) as string,
        key: choice.key,
        label: choice.label,
        displayOrder: choice.displayOrder,
        nextQuestionId: choice.nextQuestionKey
          ? (questionIds.get(choice.nextQuestionKey) as string)
          : null,
        outcomeId: choice.outcomeKey
          ? (outcomeIds.get(choice.outcomeKey) as string)
          : null,
      })),
    ),
  });

  return revisionId;
}

@Injectable()
export class PrismaPageJourneysRepository implements PageJourneysRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findOwned(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageJourneyOwnerState | null> {
    const row = await this.prisma.pageJourney.findFirst({
      where: { pageId: input.pageId, page: { creatorId: input.creatorId } },
      select: journeySelect,
    });
    return row ? mapOwnerState(row) : null;
  }

  async save(input: PageJourneySaveInput): Promise<PageJourneySaveResult> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id" FROM "Page"
        WHERE "id" = ${input.pageId} AND "creatorId" = ${input.creatorId}
        FOR UPDATE
      `;
      await deferJourneyConstraints(transaction);

      const page = await transaction.page.findFirst({
        where: { id: input.pageId, creatorId: input.creatorId },
        select: { id: true, contentVersion: true, status: true },
      });
      if (!page) {
        return { type: 'not_found' };
      }
      if (page.contentVersion !== input.expectedContentVersion) {
        return {
          type: 'stale',
          currentContentVersion: page.contentVersion,
        };
      }
      if (page.status === 'ARCHIVED' || page.status === 'PUBLISHED') {
        return { type: 'invalid_state' };
      }

      const journey = await transaction.pageJourney.findUnique({
        where: { pageId: input.pageId },
        select: { id: true, nextRevisionNumber: true },
      });
      if (!journey) {
        return { type: 'not_found' };
      }

      await createRevisionRows(
        transaction,
        journey.id,
        journey.nextRevisionNumber,
        input.graph,
        input.maxDepth,
      );
      await transaction.pageJourney.update({
        where: { id: journey.id },
        data: {
          draftRevision: {
            connect: {
              journeyId_revisionNumber: {
                journeyId: journey.id,
                revisionNumber: journey.nextRevisionNumber,
              },
            },
          },
          nextRevisionNumber: { increment: 1 },
        },
      });
      await transaction.page.update({
        where: { id: input.pageId },
        data: { contentVersion: { increment: 1 } },
      });

      const row = await transaction.pageJourney.findUnique({
        where: { pageId: input.pageId },
        select: journeySelect,
      });
      if (!row) {
        return { type: 'not_found' };
      }
      return { type: 'updated', state: mapOwnerState(row) };
    });
  }
}
