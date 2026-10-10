import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { chooseYourHeartDefaultGraph } from '@letterly/templates';
import {
  PageJourneyService,
  PageJourneyNotFoundError,
  PageJourneyValidationError,
} from '../src/modules/pages/application/page-journeys.service';
import {
  PAGE_JOURNEYS_REPOSITORY,
  type PageJourneysRepository,
  type PageJourneyOwnerState,
} from '../src/modules/pages/application/page-journeys.repository';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from '../src/modules/pages/application/page-journey-metrics';
import { pageJourneyServiceProvider } from '../src/modules/pages/pages.module';

const owner = { creatorId: 'creator-1', pageId: 'page-1' };
const graph = structuredClone(chooseYourHeartDefaultGraph);
const input = { ...owner, expectedContentVersion: 0, graph };
const state: PageJourneyOwnerState = {
  ...owner,
  status: 'DRAFT',
  contentVersion: 1,
  template: { registryKey: 'confession.choose-your-heart', version: 1 },
  draft: { revisionNumber: 2, maxDepth: 1, graph },
  publishedGraphVersion: null,
};

function createRepository() {
  return {
    findOwned: jest.fn<PageJourneysRepository['findOwned']>(),
    save: jest.fn<PageJourneysRepository['save']>(),
  };
}

describe('Journey service factory composition', () => {
  let module: TestingModule | undefined;
  let repository: ReturnType<typeof createRepository>;
  let metrics: {
    record: ReturnType<typeof jest.fn<PageJourneyMetrics['record']>>;
  };

  beforeEach(() => {
    repository = createRepository();
    metrics = { record: jest.fn<PageJourneyMetrics['record']>() };
  });

  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  async function compose(withMetrics: boolean) {
    const builder = Test.createTestingModule({
      providers: [
        pageJourneyServiceProvider,
        { provide: PAGE_JOURNEYS_REPOSITORY, useValue: {} },
        ...(withMetrics
          ? [{ provide: PAGE_JOURNEY_METRICS, useValue: {} }]
          : []),
      ],
    })
      .overrideProvider(PAGE_JOURNEYS_REPOSITORY)
      .useValue(repository);
    if (withMetrics) {
      builder.overrideProvider(PAGE_JOURNEY_METRICS).useValue(metrics);
    }
    module = await builder.compile();
    return module.get(PageJourneyService);
  }

  it.each([true, false])(
    'saves a valid graph with metrics enabled: %s',
    async (withMetrics) => {
      const service = await compose(withMetrics);
      expect(module?.get(PageJourneyService)).toBe(service);
      repository.save.mockResolvedValue({ type: 'updated', state });
      await expect(service.save(input)).resolves.toEqual(state);
      expect(repository.save.mock.calls).toEqual([[{ ...input, maxDepth: 1 }]]);
      expect(metrics.record.mock.calls).toEqual(
        withMetrics
          ? [
              [
                {
                  event: 'journey_graph_validation',
                  templateKey: 'choose-your-heart',
                  outcome: 'valid',
                  questionCount: 1,
                  outcomeCount: 2,
                  issueCount: 0,
                },
              ],
            ]
          : [],
      );
      if (withMetrics) {
        expect(metrics.record.mock.invocationCallOrder[0]).toBeLessThan(
          repository.save.mock.invocationCallOrder[0],
        );
      }
    },
  );

  it('records invalid validation metadata without persisting graph content', async () => {
    const service = await compose(true);
    await expect(
      service.save({
        ...input,
        graph: { ...graph, rootQuestionKey: 'missing' },
      }),
    ).rejects.toBeInstanceOf(PageJourneyValidationError);
    expect(repository.save.mock.calls).toHaveLength(0);
    expect(metrics.record.mock.calls).toHaveLength(1);
    expect(metrics.record.mock.calls[0]?.[0]).toEqual({
      event: 'journey_graph_validation',
      templateKey: 'choose-your-heart',
      outcome: 'invalid',
      questionCount: 1,
      outcomeCount: 2,
      issueCount: 1,
    });
  });

  it('retains owner scope, unavailable owner errors, and stale version details', async () => {
    const service = await compose(false);
    repository.findOwned.mockResolvedValue(state);
    await expect(service.getOwned(owner)).resolves.toEqual(state);
    expect(repository.findOwned.mock.calls).toEqual([[owner]]);
    repository.findOwned.mockResolvedValue(null);
    await expect(service.getOwned(owner)).rejects.toBeInstanceOf(
      PageJourneyNotFoundError,
    );
    repository.save.mockResolvedValue({
      type: 'stale',
      currentContentVersion: 4,
    });
    await expect(service.save(input)).rejects.toMatchObject({
      name: 'PageJourneyStaleVersionError',
      currentContentVersion: 4,
    });
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageJourneyServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      getOwned: jest
        .fn<PageJourneyService['getOwned']>()
        .mockResolvedValue(state),
    };
    module = await Test.createTestingModule({
      providers: [pageJourneyServiceProvider],
    })
      .overrideProvider(PageJourneyService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageJourneyService)).toBe(replacement);
    await expect(
      module.get(PageJourneyService).getOwned(owner),
    ).resolves.toEqual(state);
  });
});
