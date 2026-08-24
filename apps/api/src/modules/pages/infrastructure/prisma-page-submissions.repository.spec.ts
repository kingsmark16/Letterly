jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import {
  PrismaPageSubmissionsRepository,
  validateAnswers,
} from './prisma-page-submissions.repository';

type PrismaMock = {
  page: {
    findFirst: jest.Mock;
  };
  visitorSubmission: {
    findUnique: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  visitorAnswer: {
    deleteMany: jest.Mock;
  };
  visitorMessage: {
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
};

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const questionId = '11111111-1111-4111-8111-111111111111';
const choiceId = '22222222-2222-4222-8222-222222222222';
const submittedAt = new Date('2026-08-15T01:00:00.000Z');

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    page: {
      findFirst: jest.fn(),
    },
    visitorSubmission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    visitorAnswer: {
      deleteMany: jest.fn(),
    },
    visitorMessage: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };

  prisma.$transaction.mockImplementation(
    async (callback: (transaction: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
  );
  return prisma;
}

function publishedPage() {
  return {
    id: pageId,
    templateVersion: {
      registryKey: 'confession.secret-letter',
      version: 1,
    },
    questions: [
      {
        id: questionId,
        type: 'CHOICE' as const,
        prompt: 'What do you remember?',
        displayOrder: 0,
        nextQuestionId: null,
        choices: [
          {
            id: choiceId,
            label: 'The happy moments',
            nextQuestionId: null,
          },
        ],
      },
    ],
  };
}

const protectedSettings = {
  theme: 'classic',
  fontStyle: 'serif',
  autoPlayMusic: false,
  music: null,
  responsesEnabled: true,
  passwordProtection: {
    ciphertext: 'ciphertext',
    iv: 'iv',
    authTag: 'auth-tag',
    keyVersion: 'key-1',
    passwordVersion: 'password-1',
  },
};

describe('PrismaPageSubmissionsRepository', () => {
  let prisma: PrismaMock;
  let repository: PrismaPageSubmissionsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    repository = new PrismaPageSubmissionsRepository(
      prisma as unknown as PrismaClient,
    );
  });

  it('accepts a valid choice response and stores snapshots', async () => {
    prisma.page.findFirst.mockResolvedValue(publishedPage());
    prisma.visitorSubmission.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.visitorSubmission.create.mockResolvedValue({});

    const result = await repository.submitVisitorResponse({
      slug: 'Letter42',
      browserTokenHash: 'browser-hash',
      idempotencyKey: 'request-1',
      idempotencyPayloadHash: 'payload-hash',
      answers: [{ questionId, choiceId }],
      visitorMessage: { message: 'A private note' },
    });

    expect(result).toEqual({ type: 'accepted' });
    expect(prisma.visitorSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pageId,
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'request-1',
        idempotencyPayloadHash: 'payload-hash',
        answers: {
          create: [
            {
              answerOrder: 0,
              questionId,
              choiceId,
              textAnswer: null,
              promptSnapshot: 'What do you remember?',
              choiceLabelSnapshot: 'The happy moments',
            },
          ],
        },
        visitorMessage: {
          create: {
            promptSnapshot: 'Visitor message',
            message: 'A private note',
          },
        },
      }) as jest.AsymmetricMatcher,
    });
  });

  it('accepts an explicit null password version for an unprotected page', async () => {
    prisma.page.findFirst.mockResolvedValue({
      ...publishedPage(),
      settings: {
        theme: 'classic',
        fontStyle: 'serif',
        autoPlayMusic: false,
        music: null,
        responsesEnabled: true,
      },
    });
    prisma.visitorSubmission.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.visitorSubmission.create.mockResolvedValue({});

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'unprotected-null-version',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId, choiceId }],
        observedPasswordVersion: null,
      }),
    ).resolves.toEqual({ type: 'accepted' });
  });

  it('does not expose a public submission scope when responses are disabled', async () => {
    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      settings: {
        theme: 'classic',
        fontStyle: 'serif',
        autoPlayMusic: false,
        music: null,
        responsesEnabled: false,
      },
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });

    await expect(repository.findPublishedPageScope('letter42')).resolves.toBe(
      null,
    );
  });

  it('rejects a submission when protection changes after an unprotected preflight', async () => {
    prisma.page.findFirst.mockResolvedValue({
      ...publishedPage(),
      settings: protectedSettings,
    });

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'protection-race',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId, choiceId }],
        observedPasswordVersion: null,
      }),
    ).resolves.toEqual({ type: 'not_found' });
    expect(prisma.visitorSubmission.create).not.toHaveBeenCalled();
  });

  it('replays an identical idempotency key without creating another row', async () => {
    prisma.page.findFirst.mockResolvedValue(publishedPage());
    prisma.visitorSubmission.findUnique.mockResolvedValue({
      idempotencyPayloadHash: 'payload-hash',
    });

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'request-1',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId, choiceId }],
      }),
    ).resolves.toEqual({ type: 'accepted' });

    expect(prisma.visitorSubmission.create).not.toHaveBeenCalled();
  });

  it('rejects a different payload with the same idempotency key', async () => {
    prisma.page.findFirst.mockResolvedValue(publishedPage());
    prisma.visitorSubmission.findUnique.mockResolvedValue({
      idempotencyPayloadHash: 'other-payload',
    });

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'request-1',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId, choiceId }],
      }),
    ).resolves.toEqual({ type: 'idempotency_conflict' });
  });

  it('rejects an answer for a nested question without its selected parent branch', async () => {
    const nestedQuestionId = '66666666-6666-4666-8666-666666666666';
    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
      questions: [
        {
          ...publishedPage().questions[0],
          choices: [
            {
              ...publishedPage().questions[0].choices[0],
              nextQuestionId: nestedQuestionId,
            },
          ],
        },
        {
          id: nestedQuestionId,
          type: 'PLAIN_MESSAGE' as const,
          prompt: 'Tell me more',
          displayOrder: 1,
          nextQuestionId: null,
          choices: [],
        },
      ],
    });
    prisma.visitorSubmission.findUnique.mockResolvedValue(null);

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'request-nested',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId: nestedQuestionId, textAnswer: 'orphaned' }],
      }),
    ).resolves.toEqual({ type: 'invalid_branch' });
    expect(prisma.visitorSubmission.create).not.toHaveBeenCalled();
  });

  it('enforces required answers only for questions displayed on the selected path', () => {
    const questions = [
      {
        id: questionId,
        type: 'PLAIN_MESSAGE' as const,
        prompt: 'Tell me something',
        displayOrder: 0,
        nextQuestionId: null,
        choices: [],
      },
    ];

    expect(
      validateAnswers(
        questions,
        {
          answers: [],
          slug: 'letter42',
          browserTokenHash: 'browser-hash',
          idempotencyKey: 'required-empty',
          idempotencyPayloadHash: 'payload-hash',
        },
        true,
      ),
    ).toBeNull();
    expect(
      validateAnswers(
        questions,
        {
          answers: [],
          visitorMessage: { message: 'A note' },
          slug: 'letter42',
          browserTokenHash: 'browser-hash',
          idempotencyKey: 'optional-message',
          idempotencyPayloadHash: 'payload-hash',
        },
        false,
      ),
    ).toEqual([]);
  });

  it('rejects response fields when the trusted template lacks their capability', async () => {
    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      templateVersion: {
        registryKey: 'future.no-questions',
        version: 1,
      },
      questions: [],
    });

    await expect(
      repository.submitVisitorResponse({
        slug: 'letter42',
        browserTokenHash: 'browser-hash',
        idempotencyKey: 'unsupported',
        idempotencyPayloadHash: 'payload-hash',
        answers: [{ questionId, choiceId }],
      }),
    ).resolves.toEqual({ type: 'unsupported_capability' });
    expect(prisma.visitorSubmission.create).not.toHaveBeenCalled();
  });

  it('lists only owned submissions with an opaque cursor boundary', async () => {
    prisma.page.findFirst.mockResolvedValue({ id: pageId });
    prisma.visitorSubmission.findMany.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        readState: 'UNREAD',
        submittedAt,
        _count: { answers: 2 },
        visitorMessage: { id: '44444444-4444-4444-8444-444444444444' },
      },
    ]);
    prisma.visitorSubmission.count.mockResolvedValue(3);

    const result = await repository.listOwned({
      creatorId,
      pageId,
      filter: 'unread',
      size: 20,
      cursor: {
        submittedAt: new Date('2026-08-15T02:00:00.000Z'),
        id: '55555555-5555-4555-8555-555555555555',
      },
    });

    expect(result).toMatchObject({
      items: [
        {
          readState: 'UNREAD',
          answerCount: 2,
          hasVisitorMessage: true,
        },
      ],
      unreadCount: 3,
      nextCursor: null,
    });
    expect(prisma.visitorSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pageId,
          readState: 'UNREAD',
        }) as jest.AsymmetricMatcher,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(prisma.visitorSubmission.count).toHaveBeenCalledWith({
      where: { pageId, deletedAt: null, readState: 'UNREAD' },
    });
  });

  it('marks and deletes only submissions owned by the creator and page', async () => {
    prisma.visitorSubmission.updateMany.mockResolvedValue({ count: 1 });
    prisma.visitorSubmission.deleteMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.markRead({ creatorId, pageId, submissionId: questionId }),
    ).resolves.toBe('updated');
    await expect(
      repository.deleteOwned({
        creatorId,
        pageId,
        submissionId: questionId,
      }),
    ).resolves.toBe('deleted');

    expect(prisma.visitorSubmission.updateMany).toHaveBeenCalledWith({
      where: {
        id: questionId,
        pageId,
        deletedAt: null,
        page: { creatorId },
      },
      data: { readState: 'READ' },
    });
    expect(prisma.visitorSubmission.updateMany).toHaveBeenCalledWith({
      where: {
        id: questionId,
        pageId,
        deletedAt: null,
        page: { creatorId },
      },
      data: expect.objectContaining({
        deletedAt: expect.any(Date) as jest.AsymmetricMatcher,
      }) as jest.AsymmetricMatcher,
    });
    expect(prisma.visitorAnswer.deleteMany).toHaveBeenCalledWith({
      where: { submissionId: questionId },
    });
    expect(prisma.visitorMessage.deleteMany).toHaveBeenCalledWith({
      where: { submissionId: questionId },
    });

    expect(prisma.visitorSubmission.updateMany).toHaveBeenCalledWith({
      where: {
        id: questionId,
        pageId,
        deletedAt: null,
        page: { creatorId },
      },
      data: expect.objectContaining({
        idempotencyKey: `deleted:idempotency:${questionId}`,
        browserTokenHash: `deleted:browser:${questionId}`,
      }) as jest.AsymmetricMatcher,
    });
  });
});
