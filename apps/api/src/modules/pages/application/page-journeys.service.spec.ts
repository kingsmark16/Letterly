import {
  chooseYourHeartDefaultGraph,
  validatePageJourneyGraph,
} from '@letterly/templates';
import { pageJourneyPublicPageProjectionSchema } from '@letterly/contracts/page-journeys';
import type { PageJourneysRepository } from './page-journeys.repository';
import type { PageJourneyMetrics } from './page-journey-metrics';
import {
  PageJourneyService,
  PageJourneyValidationError,
} from './page-journeys.service';

function createRepository(): jest.Mocked<PageJourneysRepository> {
  return {
    findOwned: jest.fn(),
    save: jest.fn(),
  };
}

function createMetrics(): jest.Mocked<PageJourneyMetrics> {
  return { record: jest.fn() };
}

describe('PageJourneyService', () => {
  it.each([
    ['short-first', ['short', 'long']],
    ['long-first', ['long', 'short']],
  ] as const)(
    'calculates the longest path through a reconverging graph (%s)',
    (_name, order) => {
      const graph = {
        schemaVersion: 1 as const,
        rootQuestionKey: 'root',
        questions: [
          {
            key: 'root',
            prompt: 'Root',
            displayOrder: 0,
            choices: order.map((destination, index) => ({
              key: `root-${destination}`,
              label: destination,
              displayOrder: index,
              nextQuestionKey: destination,
              outcomeKey: null,
            })),
          },
          {
            key: 'short',
            prompt: 'Short path',
            displayOrder: 1,
            choices: [
              {
                key: 'short-shared',
                label: 'Continue',
                displayOrder: 0,
                nextQuestionKey: 'shared',
                outcomeKey: null,
              },
              {
                key: 'short-alternate',
                label: 'Alternate',
                displayOrder: 1,
                nextQuestionKey: null,
                outcomeKey: 'alternate',
              },
            ],
          },
          {
            key: 'long',
            prompt: 'Long path',
            displayOrder: 2,
            choices: [
              {
                key: 'long-middle',
                label: 'Continue',
                displayOrder: 0,
                nextQuestionKey: 'middle',
                outcomeKey: null,
              },
              {
                key: 'long-alternate',
                label: 'Alternate',
                displayOrder: 1,
                nextQuestionKey: null,
                outcomeKey: 'alternate',
              },
            ],
          },
          {
            key: 'middle',
            prompt: 'Middle path',
            displayOrder: 3,
            choices: [
              {
                key: 'middle-shared',
                label: 'Continue',
                displayOrder: 0,
                nextQuestionKey: 'shared',
                outcomeKey: null,
              },
              {
                key: 'middle-alternate',
                label: 'Alternate',
                displayOrder: 1,
                nextQuestionKey: null,
                outcomeKey: 'alternate',
              },
            ],
          },
          {
            key: 'shared',
            prompt: 'Shared path',
            displayOrder: 4,
            choices: [
              {
                key: 'shared-final',
                label: 'Finish',
                displayOrder: 0,
                nextQuestionKey: null,
                outcomeKey: 'final',
              },
              {
                key: 'shared-alternate',
                label: 'Alternate',
                displayOrder: 1,
                nextQuestionKey: null,
                outcomeKey: 'alternate',
              },
            ],
          },
        ],
        outcomes: [
          {
            key: 'final',
            title: 'Final',
            resultMessage: 'Final result',
            displayOrder: 0,
          },
          {
            key: 'alternate',
            title: 'Alternate',
            resultMessage: 'Alternate result',
            displayOrder: 1,
          },
        ],
      };

      const result = validatePageJourneyGraph(graph);

      expect(result).toMatchObject({ valid: true, maxDepth: 4 });
    },
  );

  it('accepts grapheme bounded public journey text', () => {
    const graph = {
      displaySlug: 'emoji-journey',
      canonicalUrl: 'https://letterly.example/p/emoji-journey',
      template: { key: 'choose-your-heart' as const, version: 1 },
      publishedGraphVersion: 1,
      rootQuestionKey: 'root',
      maxDepth: 1,
      questions: [
        {
          key: 'root',
          prompt: '💖'.repeat(200),
          displayOrder: 0,
          choices: [
            {
              key: 'first',
              label: '🌸'.repeat(80),
              displayOrder: 0,
              nextQuestionKey: null,
              outcomeKey: 'result',
            },
            {
              key: 'second',
              label: '✨'.repeat(80),
              displayOrder: 1,
              nextQuestionKey: null,
              outcomeKey: 'result',
            },
          ],
        },
      ],
      outcomes: [
        {
          key: 'result',
          title: '🌙'.repeat(120),
          resultMessage: '💌'.repeat(2_000),
          displayOrder: 0,
        },
      ],
    };

    expect(pageJourneyPublicPageProjectionSchema.parse(graph)).toMatchObject(
      graph,
    );
  });

  it('memoizes repeated destinations in a maximum depth graph', () => {
    const questionCount = 12;
    const outcomeCount = 4;
    const graph = {
      schemaVersion: 1 as const,
      rootQuestionKey: 'question-0',
      questions: Array.from({ length: questionCount }, (_, questionIndex) => ({
        key: `question-${questionIndex}`,
        prompt: `Question ${questionIndex}`,
        displayOrder: questionIndex,
        choices: Array.from({ length: 4 }, (_, choiceIndex) => ({
          key: `choice-${questionIndex}-${choiceIndex}`,
          label: `Choice ${questionIndex}-${choiceIndex}`,
          displayOrder: choiceIndex,
          nextQuestionKey:
            questionIndex < questionCount - 1
              ? `question-${questionIndex + 1}`
              : null,
          outcomeKey:
            questionIndex === questionCount - 1
              ? `outcome-${choiceIndex}`
              : null,
        })),
      })),
      outcomes: Array.from({ length: outcomeCount }, (_, outcomeIndex) => ({
        key: `outcome-${outcomeIndex}`,
        title: `Outcome ${outcomeIndex}`,
        resultMessage: `Result ${outcomeIndex}`,
        displayOrder: outcomeIndex,
      })),
    };
    const startedAt = performance.now();

    const result = validatePageJourneyGraph(graph);

    expect(result).toMatchObject({ valid: true, maxDepth: questionCount });
    expect(performance.now() - startedAt).toBeLessThan(250);
  });

  it('rejects duplicate choice labels after case folding', async () => {
    const repository = createRepository();
    const service = new PageJourneyService(repository);
    const graph = {
      ...chooseYourHeartDefaultGraph,
      questions: [
        {
          ...chooseYourHeartDefaultGraph.questions[0],
          choices: [
            chooseYourHeartDefaultGraph.questions[0].choices[0],
            {
              ...chooseYourHeartDefaultGraph.questions[0].choices[1],
              label: ' THE HAPPY MOMENTS ',
            },
          ],
        },
      ],
    };

    await expect(
      service.save({
        creatorId: 'creator-1',
        pageId: 'page-1',
        expectedContentVersion: 0,
        graph,
      }),
    ).rejects.toBeInstanceOf(PageJourneyValidationError);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('maps stale page versions from the repository', async () => {
    const repository = createRepository();
    repository.save.mockResolvedValue({
      type: 'stale',
      currentContentVersion: 4,
    });
    const service = new PageJourneyService(repository);

    await expect(
      service.save({
        creatorId: 'creator-1',
        pageId: 'page-1',
        expectedContentVersion: 0,
        graph: chooseYourHeartDefaultGraph,
      }),
    ).rejects.toMatchObject({ currentContentVersion: 4 });
  });

  it('records a redacted graph validation result', async () => {
    const repository = createRepository();
    repository.save.mockResolvedValue({
      type: 'updated',
      state: {
        pageId: 'page-1',
        creatorId: 'creator-1',
        status: 'DRAFT',
        contentVersion: 1,
        template: {
          registryKey: 'confession.choose-your-heart',
          version: 1,
        },
        draft: {
          revisionNumber: 2,
          maxDepth: 1,
          graph: chooseYourHeartDefaultGraph,
        },
        publishedGraphVersion: null,
      },
    });
    const metrics = createMetrics();
    const service = new PageJourneyService(repository, metrics);

    await service.save({
      creatorId: 'creator-1',
      pageId: 'page-1',
      expectedContentVersion: 0,
      graph: chooseYourHeartDefaultGraph,
    });

    expect(metrics.record.mock.calls.at(-1)?.[0]).toEqual({
      event: 'journey_graph_validation',
      templateKey: 'choose-your-heart',
      outcome: 'valid',
      questionCount: 1,
      outcomeCount: 2,
      issueCount: 0,
    });
  });
});
