jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import {
  buildPageJourneySnapshot,
  JOURNEY_SUBMISSION_TRANSACTION_TIMEOUT_MS,
  type PublishedJourneyRevision,
} from './prisma-page-journey-submissions.repository';
import type { SubmitPageJourneyResponseInput } from '../application/page-journey-submissions.repository';
import type { PrismaClient } from '@letterly/database';
import { PrismaPageJourneySubmissionRepository } from './prisma-page-journey-submissions.repository';

const revision: PublishedJourneyRevision = {
  revisionNumber: 7,
  rootQuestion: { key: 'root' },
  questions: [
    {
      key: 'root',
      prompt: 'What do you remember?',
      choices: [
        {
          key: 'happy',
          label: 'The happy moments',
          nextQuestion: { key: 'follow-up' },
          outcome: null,
        },
        {
          key: 'quiet',
          label: 'The quiet moments',
          nextQuestion: null,
          outcome: { key: 'peace' },
        },
      ],
    },
    {
      key: 'follow-up',
      prompt: 'What stays with you?',
      choices: [
        {
          key: 'warmth',
          label: 'The warmth',
          nextQuestion: null,
          outcome: { key: 'joy' },
        },
        {
          key: 'stillness',
          label: 'The stillness',
          nextQuestion: null,
          outcome: { key: 'peace' },
        },
      ],
    },
  ],
  outcomes: [
    { key: 'joy', title: 'A warm heart', resultMessage: 'You remember joy.' },
    {
      key: 'peace',
      title: 'A peaceful heart',
      resultMessage: 'You remember stillness.',
    },
  ],
};

function input(
  answers: ReadonlyArray<SubmitPageJourneyResponseInput['answers'][number]>,
  outcomeKey: string,
): SubmitPageJourneyResponseInput {
  return {
    slug: 'letter42',
    browserTokenHash: 'browser-hash',
    idempotencyKey: 'journey-request-1',
    idempotencyPayloadHash: 'payload-hash',
    publishedGraphVersion: 7,
    answers: [...answers],
    outcomeKey,
  };
}

describe('buildPageJourneySnapshot', () => {
  it('records the ordered path and immutable text snapshots', () => {
    expect(
      buildPageJourneySnapshot(
        revision,
        input(
          [
            { questionKey: 'root', choiceKey: 'happy' },
            { questionKey: 'follow-up', choiceKey: 'warmth' },
          ],
          'joy',
        ),
      ),
    ).toEqual({
      revisionNumber: 7,
      answers: [
        {
          questionKey: 'root',
          prompt: 'What do you remember?',
          choiceKey: 'happy',
          choiceLabel: 'The happy moments',
        },
        {
          questionKey: 'follow-up',
          prompt: 'What stays with you?',
          choiceKey: 'warmth',
          choiceLabel: 'The warmth',
        },
      ],
      outcomeKey: 'joy',
      outcomeTitle: 'A warm heart',
      outcomeMessage: 'You remember joy.',
    });
  });

  it.each([
    [[{ questionKey: 'follow-up', choiceKey: 'warmth' }], 'joy'],
    [[{ questionKey: 'root', choiceKey: 'happy' }], 'joy'],
    [
      [
        { questionKey: 'root', choiceKey: 'quiet' },
        { questionKey: 'follow-up', choiceKey: 'stillness' },
      ],
      'peace',
    ],
  ] as const)('rejects an invalid path %j', (answers, outcomeKey) => {
    expect(
      buildPageJourneySnapshot(revision, input(answers, outcomeKey)),
    ).toBeNull();
  });

  it('accepts written text answers for single-choice text questions and rejects blank text answers', () => {
    const linearRevision: PublishedJourneyRevision = {
      revisionNumber: 3,
      rootQuestion: { key: 'q-choice' },
      questions: [
        {
          key: 'q-choice',
          prompt: 'Which moment stays with you?',
          choices: [
            {
              key: 'c1',
              label: 'Our first walk',
              nextQuestion: { key: 'q-text' },
              outcome: null,
            },
            {
              key: 'c2',
              label: 'Our quiet talks',
              nextQuestion: { key: 'q-text' },
              outcome: null,
            },
          ],
        },
        {
          key: 'q-text',
          prompt: 'What would you like to tell me?',
          choices: [
            {
              key: 'text-slot',
              label: 'Written answer',
              nextQuestion: null,
              outcome: { key: 'done' },
            },
          ],
        },
      ],
      outcomes: [
        {
          key: 'done',
          title: 'Thank you',
          resultMessage: 'Your answers mean a lot.',
        },
      ],
    };

    expect(
      buildPageJourneySnapshot(
        linearRevision,
        input(
          [
            { questionKey: 'q-choice', choiceKey: 'c1' },
            {
              questionKey: 'q-text',
              choiceKey: 'text-slot',
              textAnswer: '  I still think about that evening.  ',
            },
          ],
          'done',
        ),
      ),
    ).toEqual({
      revisionNumber: 3,
      answers: [
        {
          questionKey: 'q-choice',
          prompt: 'Which moment stays with you?',
          choiceKey: 'c1',
          choiceLabel: 'Our first walk',
        },
        {
          questionKey: 'q-text',
          prompt: 'What would you like to tell me?',
          choiceKey: 'text-slot',
          choiceLabel: 'I still think about that evening.',
          textAnswer: 'I still think about that evening.',
        },
      ],
      outcomeKey: 'done',
      outcomeTitle: 'Thank you',
      outcomeMessage: 'Your answers mean a lot.',
    });

    expect(
      buildPageJourneySnapshot(
        linearRevision,
        input(
          [
            { questionKey: 'q-choice', choiceKey: 'c1' },
            {
              questionKey: 'q-text',
              choiceKey: 'text-slot',
              textAnswer: '   ',
            },
          ],
          'done',
        ),
      ),
    ).toBeNull();
  });
});

type JourneyPrismaMock = {
  page: { findFirst: jest.Mock };
  pageJourney: { findUnique: jest.Mock };
  visitorSubmission: { findUnique: jest.Mock; create: jest.Mock };
  $queryRaw: jest.Mock;
  $transaction: jest.Mock;
};

function createJourneyPrismaMock(): JourneyPrismaMock {
  const prisma: JourneyPrismaMock = {
    page: { findFirst: jest.fn() },
    pageJourney: { findUnique: jest.fn() },
    visitorSubmission: { findUnique: jest.fn(), create: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (transaction: JourneyPrismaMock) => Promise<unknown>) =>
      callback(prisma),
  );
  return prisma;
}

function publishedJourneyPage() {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    settings: {
      theme: 'classic',
      fontStyle: 'serif',
      autoPlayMusic: false,
      music: null,
      responsesEnabled: true,
    },
    templateVersion: {
      registryKey: 'confession.choose-your-heart',
      version: 1,
    },
  };
}

function publishedRevision(): PublishedJourneyRevision {
  return {
    revisionNumber: 7,
    rootQuestion: { key: 'root' },
    questions: [
      {
        key: 'root',
        prompt: 'What do you remember?',
        choices: [
          {
            key: 'happy',
            label: 'The happy moments',
            nextQuestion: null,
            outcome: { key: 'joy' },
          },
          {
            key: 'quiet',
            label: 'The quiet moments',
            nextQuestion: null,
            outcome: { key: 'peace' },
          },
        ],
      },
    ],
    outcomes: [
      { key: 'joy', title: 'A warm heart', resultMessage: 'You remember joy.' },
      {
        key: 'peace',
        title: 'A peaceful heart',
        resultMessage: 'You remember stillness.',
      },
    ],
  };
}

function validJourneyInput(): SubmitPageJourneyResponseInput {
  return {
    slug: 'letter42',
    browserTokenHash: 'browser-hash',
    idempotencyKey: 'journey-request-1',
    idempotencyPayloadHash: 'payload-hash',
    publishedGraphVersion: 7,
    answers: [{ questionKey: 'root', choiceKey: 'happy' }],
    outcomeKey: 'joy',
  };
}

describe('PrismaPageJourneySubmissionRepository', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes an accepted response after locking page then journey', async () => {
    const prisma = createJourneyPrismaMock();
    prisma.page.findFirst.mockResolvedValue(publishedJourneyPage());
    prisma.visitorSubmission.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.pageJourney.findUnique.mockResolvedValue({
      publishedRevision: publishedRevision(),
    });
    prisma.visitorSubmission.create.mockResolvedValue({});

    const result = await new PrismaPageJourneySubmissionRepository(
      prisma as unknown as PrismaClient,
    ).submitJourneyResponse(validJourneyInput());

    expect(result).toEqual({ type: 'accepted' });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: JOURNEY_SUBMISSION_TRANSACTION_TIMEOUT_MS,
    });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    const lockQueries = (prisma.$queryRaw.mock.calls as unknown[][]).map(
      (call) => String(call[0]),
    );
    expect(lockQueries[0]).toContain('Page');
    expect(lockQueries[1]).toContain('PageJourney');
    expect(prisma.visitorSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        idempotencyKey: 'journey-request-1',
        journeyAnswerCount: 1,
        journeySnapshot: expect.objectContaining({
          outcomeKey: 'joy',
        }) as jest.AsymmetricMatcher,
      }) as jest.AsymmetricMatcher,
    });
  });

  it('allows a published journey response when the legacy setting is disabled', async () => {
    const prisma = createJourneyPrismaMock();
    const page = publishedJourneyPage();
    prisma.page.findFirst.mockResolvedValue({
      ...page,
      settings: { ...page.settings, responsesEnabled: false },
      pageJourney: { publishedRevision: { id: 'revision-1' } },
    });

    await expect(
      new PrismaPageJourneySubmissionRepository(
        prisma as unknown as PrismaClient,
      ).findPublishedPageScope('letter42'),
    ).resolves.toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('replays an active idempotency key without creating another response', async () => {
    const prisma = createJourneyPrismaMock();
    prisma.page.findFirst.mockResolvedValue(publishedJourneyPage());
    prisma.visitorSubmission.findUnique.mockResolvedValue({
      idempotencyPayloadHash: 'payload-hash',
    });

    const result = await new PrismaPageJourneySubmissionRepository(
      prisma as unknown as PrismaClient,
    ).submitJourneyResponse(validJourneyInput());

    expect(result).toEqual({ type: 'accepted' });
    expect(prisma.visitorSubmission.create).not.toHaveBeenCalled();
  });

  it('rechecks a changed password version before accepting a response', async () => {
    const prisma = createJourneyPrismaMock();
    prisma.page.findFirst.mockResolvedValue({
      ...publishedJourneyPage(),
      settings: {
        ...publishedJourneyPage().settings,
        passwordProtection: {
          ciphertext: 'ciphertext',
          iv: 'iv',
          authTag: 'auth-tag',
          keyVersion: 'key-1',
          passwordVersion: 'password-2',
        },
      },
    });

    const result = await new PrismaPageJourneySubmissionRepository(
      prisma as unknown as PrismaClient,
    ).submitJourneyResponse({
      ...validJourneyInput(),
      observedPasswordVersion: 'password-1',
    });

    expect(result).toEqual({ type: 'not_found' });
    expect(prisma.visitorSubmission.findUnique).not.toHaveBeenCalled();
  });
});
