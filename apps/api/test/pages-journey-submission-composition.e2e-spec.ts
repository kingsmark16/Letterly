import { firstMockCallOrder } from './support/required-test-value';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PageJourneySubmissionService,
  PageJourneySubmissionNotFoundError,
  PageJourneySubmissionCapabilityError,
  PageJourneySubmissionInvalidBranchError,
  PageJourneySubmissionVersionConflictError,
  PageJourneySubmissionDuplicateError,
  PageJourneySubmissionIdempotencyConflictError,
} from '../src/modules/pages/application/page-journey-submissions.service';
import {
  PAGE_JOURNEY_SUBMISSIONS_REPOSITORY,
  type PageJourneySubmissionRepository,
  type SubmitPageJourneyResponseInput,
} from '../src/modules/pages/application/page-journey-submissions.repository';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from '../src/modules/pages/application/page-journey-metrics';
import { pageJourneySubmissionServiceProvider } from '../src/modules/pages/pages.module';

const input: Omit<SubmitPageJourneyResponseInput, 'idempotencyPayloadHash'> = {
  slug: ' Letter42 ',
  browserTokenHash: 'browser-hash',
  idempotencyKey: 'journey-request-1',
  publishedGraphVersion: 3,
  answers: [{ questionKey: 'root', choiceKey: 'happy' }],
  outcomeKey: 'happy-result',
  visitorMessage: ' private note ',
  observedPasswordVersion: 'version-1',
};

function createRepository() {
  return {
    findPublishedPageScope:
      jest.fn<PageJourneySubmissionRepository['findPublishedPageScope']>(),
    submitJourneyResponse:
      jest.fn<PageJourneySubmissionRepository['submitJourneyResponse']>(),
  };
}

describe('Journey submission service factory composition', () => {
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
        pageJourneySubmissionServiceProvider,
        { provide: PAGE_JOURNEY_SUBMISSIONS_REPOSITORY, useValue: {} },
        ...(withMetrics
          ? [{ provide: PAGE_JOURNEY_METRICS, useValue: {} }]
          : []),
      ],
    })
      .overrideProvider(PAGE_JOURNEY_SUBMISSIONS_REPOSITORY)
      .useValue(repository);
    if (withMetrics) {
      builder.overrideProvider(PAGE_JOURNEY_METRICS).useValue(metrics);
    }
    module = await builder.compile();
    return module.get(PageJourneySubmissionService);
  }

  it.each([true, false])(
    'preserves the canonical digest and raw payload with metrics enabled: %s',
    async (withMetrics) => {
      const service = await compose(withMetrics);
      expect(module?.get(PageJourneySubmissionService)).toBe(service);
      repository.submitJourneyResponse.mockResolvedValue({ type: 'accepted' });
      await expect(service.submit(input)).resolves.toEqual({ accepted: true });
      expect(repository.submitJourneyResponse.mock.calls).toEqual([
        [
          {
            ...input,
            idempotencyPayloadHash:
              '5c2a6cc6edd293cc74fa1614daf1210bbf8d5ea69893b4298272156e8e0b32e0',
          },
        ],
      ]);
      expect(metrics.record.mock.calls).toEqual(
        withMetrics
          ? [
              [
                {
                  event: 'journey_submission',
                  templateKey: 'choose-your-heart',
                  outcome: 'accepted',
                },
              ],
            ]
          : [],
      );
      if (withMetrics) {
        expect(
          firstMockCallOrder(repository.submitJourneyResponse),
        ).toBeLessThan(firstMockCallOrder(metrics.record));
      }
    },
  );

  it.each([
    ['not_found', PageJourneySubmissionNotFoundError, 'not_found'],
    [
      'unsupported_capability',
      PageJourneySubmissionCapabilityError,
      'unsupported',
    ],
    ['invalid_branch', PageJourneySubmissionInvalidBranchError, 'invalid'],
    ['version_conflict', PageJourneySubmissionVersionConflictError, 'conflict'],
    ['duplicate', PageJourneySubmissionDuplicateError, 'duplicate'],
    [
      'idempotency_conflict',
      PageJourneySubmissionIdempotencyConflictError,
      'conflict',
    ],
  ] as const)(
    'preserves %s errors and redacted metric outcomes',
    async (type, errorClass, outcome) => {
      const service = await compose(true);
      repository.submitJourneyResponse.mockResolvedValue({ type });
      await expect(service.submit(input)).rejects.toBeInstanceOf(errorClass);
      expect(metrics.record.mock.calls).toEqual([
        [
          {
            event: 'journey_submission',
            templateKey: 'choose-your-heart',
            outcome,
          },
        ],
      ]);
    },
  );

  it.each([true, false])(
    'rethrows repository failures with metrics enabled: %s',
    async (withMetrics) => {
      const service = await compose(withMetrics);
      const failure = new Error('fixture repository unavailable');
      repository.submitJourneyResponse.mockRejectedValue(failure);
      await expect(service.submit(input)).rejects.toBe(failure);
      expect(metrics.record.mock.calls).toEqual(
        withMetrics
          ? [
              [
                {
                  event: 'journey_submission',
                  templateKey: 'choose-your-heart',
                  outcome: 'error',
                },
              ],
            ]
          : [],
      );
    },
  );

  it('forwards the scope lookup and preserves unavailable page errors', async () => {
    const service = await compose(false);
    repository.findPublishedPageScope.mockResolvedValue('page-1');
    await expect(service.findPublicPageScope(input.slug)).resolves.toBe(
      'page-1',
    );
    expect(repository.findPublishedPageScope.mock.calls).toEqual([
      [input.slug],
    ]);
    repository.findPublishedPageScope.mockResolvedValue(null);
    await expect(
      service.findPublicPageScope(input.slug),
    ).rejects.toBeInstanceOf(PageJourneySubmissionNotFoundError);
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageJourneySubmissionServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      findPublicPageScope: jest
        .fn<PageJourneySubmissionService['findPublicPageScope']>()
        .mockResolvedValue('page-1'),
    };
    module = await Test.createTestingModule({
      providers: [pageJourneySubmissionServiceProvider],
    })
      .overrideProvider(PageJourneySubmissionService)
      .useValue(replacement)
      .compile();
    expect(module.get(PageJourneySubmissionService)).toBe(replacement);
    await expect(
      module.get(PageJourneySubmissionService).findPublicPageScope(input.slug),
    ).resolves.toBe('page-1');
  });
});
