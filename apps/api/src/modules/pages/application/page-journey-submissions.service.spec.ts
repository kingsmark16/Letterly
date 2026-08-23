import { chooseYourHeartDefaultGraph } from '@letterly/templates';
import type {
  PageJourneySubmissionRepository,
  SubmitPageJourneyResponseInput,
} from './page-journey-submissions.repository';
import type { PageJourneyMetrics } from './page-journey-metrics';
import {
  hashPageJourneySubmissionPayload,
  PageJourneySubmissionDuplicateError,
  PageJourneySubmissionIdempotencyConflictError,
  PageJourneySubmissionInvalidBranchError,
  PageJourneySubmissionService,
  PageJourneySubmissionVersionConflictError,
} from './page-journey-submissions.service';

function createRepository(): jest.Mocked<PageJourneySubmissionRepository> {
  return {
    findPublishedPageScope: jest.fn(),
    submitJourneyResponse: jest.fn(),
  };
}

function input(): Omit<
  SubmitPageJourneyResponseInput,
  'idempotencyPayloadHash'
> {
  return {
    slug: 'letter42',
    browserTokenHash: 'browser-hash',
    idempotencyKey: 'journey-request-1',
    publishedGraphVersion: 3,
    answers: [{ questionKey: 'root', choiceKey: 'happy' }],
    outcomeKey: 'happy-result',
  };
}

function createMetrics(): jest.Mocked<PageJourneyMetrics> {
  return { record: jest.fn() };
}

describe('PageJourneySubmissionService', () => {
  it('hashes the published version, path, outcome, and message', () => {
    const base = input();
    const first = hashPageJourneySubmissionPayload(base);
    expect(first).toBe(hashPageJourneySubmissionPayload(base));
    expect(
      hashPageJourneySubmissionPayload({
        ...base,
        publishedGraphVersion: base.publishedGraphVersion + 1,
      }),
    ).not.toBe(first);
    expect(
      hashPageJourneySubmissionPayload({
        ...base,
        visitorMessage: 'A private note',
      }),
    ).not.toBe(first);
  });

  it('passes a validated journey response to the repository', async () => {
    const repository = createRepository();
    repository.submitJourneyResponse.mockResolvedValue({ type: 'accepted' });
    const service = new PageJourneySubmissionService(repository);

    await expect(service.submit(input())).resolves.toEqual({ accepted: true });
    const call = repository.submitJourneyResponse.mock.calls.at(0)?.[0];
    expect(call).toMatchObject(input());
    expect(call?.idempotencyPayloadHash).toEqual(expect.any(String));
  });

  it('records only the bounded submission outcome', async () => {
    const repository = createRepository();
    repository.submitJourneyResponse.mockResolvedValue({ type: 'accepted' });
    const metrics = createMetrics();
    const service = new PageJourneySubmissionService(repository, metrics);

    await service.submit({
      ...input(),
      visitorMessage: 'private message',
      browserTokenHash: 'private-token-hash',
    });

    expect(metrics.record.mock.calls.at(-1)?.[0]).toEqual({
      event: 'journey_submission',
      templateKey: 'choose-your-heart',
      outcome: 'accepted',
    });
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain(
      'private message',
    );
    expect(JSON.stringify(metrics.record.mock.calls)).not.toContain(
      'private-token-hash',
    );
  });

  it('AC-17 records an error metric when the submission repository fails', async () => {
    const repository = createRepository();
    repository.submitJourneyResponse.mockRejectedValue(
      new Error('database unavailable'),
    );
    const metrics = createMetrics();
    const service = new PageJourneySubmissionService(repository, metrics);

    await expect(service.submit(input())).rejects.toThrow(
      'database unavailable',
    );

    expect(metrics.record.mock.calls).toContainEqual([
      {
        event: 'journey_submission',
        templateKey: 'choose-your-heart',
        outcome: 'error',
      },
    ]);
  });

  it.each([
    ['invalid_branch', PageJourneySubmissionInvalidBranchError],
    ['version_conflict', PageJourneySubmissionVersionConflictError],
    ['duplicate', PageJourneySubmissionDuplicateError],
    ['idempotency_conflict', PageJourneySubmissionIdempotencyConflictError],
  ] as const)('maps %s to a stable error', async (type, errorClass) => {
    const repository = createRepository();
    repository.submitJourneyResponse.mockResolvedValue({ type });
    const service = new PageJourneySubmissionService(repository);

    await expect(service.submit(input())).rejects.toBeInstanceOf(errorClass);
  });

  it('keeps the starter graph available to the journey contract', () => {
    expect(chooseYourHeartDefaultGraph.rootQuestionKey).toBe('root');
    expect(chooseYourHeartDefaultGraph.questions[0]?.choices).toHaveLength(2);
  });
});
