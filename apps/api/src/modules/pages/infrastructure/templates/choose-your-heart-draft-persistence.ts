import { randomUUID } from 'node:crypto';
import {
  chooseYourHeartTemplate,
  secretLetterContentSchema,
  secretLetterSettingsSchema,
  type PageJourneyGraph,
} from '@letterly/templates';
import type {
  DraftTransaction,
  TemplateDraftPersistenceAdapter,
} from './draft-persistence-adapter';

async function createJourneyRevision(
  transaction: DraftTransaction,
  journeyId: string,
  pageId: string,
  graph: PageJourneyGraph,
  maxDepth: number,
): Promise<void> {
  const revisionId = randomUUID();
  const revisionNumber = 1;
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

  await transaction.pageJourney.create({
    data: {
      id: journeyId,
      pageId,
      draftRevisionId: revisionId,
    },
  });
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
}

export const chooseYourHeartDraftPersistenceAdapter: TemplateDraftPersistenceAdapter =
  {
    registryKey: 'confession.choose-your-heart',
    version: 1,
    prepare(input) {
      const journey = input.journey;
      if (!journey) throw new Error('Choose Your Heart journey is missing');
      return {
        content: secretLetterContentSchema.parse(input.content),
        settings: {
          ...secretLetterSettingsSchema.parse(input.settings),
          ...chooseYourHeartTemplate.settingsSchema.parse(input.settings),
        },
        async beforePage(transaction) {
          await transaction.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
        },
        async afterPage(transaction, pageId) {
          await createJourneyRevision(
            transaction,
            randomUUID(),
            pageId,
            journey.graph,
            journey.maxDepth,
          );
        },
      };
    },
  };
