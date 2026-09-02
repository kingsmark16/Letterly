jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageQuestionsRepository } from './prisma-page-questions.repository';

type PrismaMock = {
  page: { findFirst: jest.Mock; updateMany: jest.Mock };
  pageQuestion: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    delete: jest.Mock;
  };
  visitorAnswer: { findMany: jest.Mock; deleteMany: jest.Mock };
  visitorSubmission: { deleteMany: jest.Mock };
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
};

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    page: { findFirst: jest.fn(), updateMany: jest.fn() },
    pageQuestion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      delete: jest.fn(),
    },
    visitorAnswer: { findMany: jest.fn(), deleteMany: jest.fn() },
    visitorSubmission: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction.mockImplementation(
    async (callback: (transaction: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
  );
  return prisma;
}

function questionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: firstId,
    pageId,
    key: 'question-first',
    type: 'CHOICE' as const,
    prompt: 'What do you remember?',
    displayOrder: 0,
    config: null,
    choices: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        key: 'happy',
        label: 'The happy moments',
        displayOrder: 0,
        creatorMessage: null,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        key: 'quiet',
        label: 'The quiet moments',
        displayOrder: 1,
        creatorMessage: null,
      },
    ],
    ...overrides,
  };
}

describe('PrismaPageQuestionsRepository', () => {
  let prisma: PrismaMock;
  let repository: PrismaPageQuestionsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    repository = new PrismaPageQuestionsRepository(
      prisma as unknown as PrismaClient,
    );
  });

  it('appends a server generated question and clears legacy branch fields', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 0,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { displayOrder: 0 },
      { displayOrder: 3 },
    ]);
    prisma.pageQuestion.findUniqueOrThrow.mockResolvedValue(
      questionRow({ id: secondId, displayOrder: 4 }),
    );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.create({
      creatorId,
      pageId,
      expectedContentVersion: 0,
      key: 'ignored-client-key',
      type: 'CHOICE',
      prompt: 'What do you remember?',
      displayOrder: 0,
      endsJourney: true,
      nextQuestionId: firstId,
      choices: [
        {
          key: 'happy',
          label: 'The happy moments',
          displayOrder: 0,
          nextQuestionId: firstId,
        },
        {
          key: 'quiet',
          label: 'The quiet moments',
          displayOrder: 1,
          endsJourney: true,
        },
      ],
    });

    expect(result).toMatchObject({ type: 'updated', contentVersion: 1 });
    expect(prisma.pageQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          displayOrder: 4,
          key: expect.stringMatching(/^question-/) as jest.AsymmetricMatcher,
          endsJourney: false,
          nextQuestionId: null,
          choices: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({
                endsJourney: false,
                nextQuestionId: null,
              }),
            ]) as jest.AsymmetricMatcher,
          }) as jest.AsymmetricMatcher,
        }) as jest.AsymmetricMatcher,
      }) as jest.AsymmetricMatcher,
    );
  });

  it('blocks question edits and reordering while the page is published', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'PUBLISHED',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    await expect(
      repository.update({
        creatorId,
        pageId,
        questionId: firstId,
        prompt: 'Updated prompt',
        expectedContentVersion: 4,
        confirmResponseDeletion: false,
      }),
    ).resolves.toEqual({ type: 'invalid_state' });
    expect(prisma.pageQuestion.update).not.toHaveBeenCalled();

    await expect(
      repository.reorder({
        creatorId,
        pageId,
        questionIds: [secondId, firstId],
        expectedContentVersion: 4,
      }),
    ).resolves.toEqual({ type: 'invalid_state' });
    expect(prisma.pageQuestion.updateMany).not.toHaveBeenCalled();
  });

  it('keeps Choose Your Heart on its independent journey API', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 0,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.choose-your-heart',
        version: 1,
      },
    });

    await expect(
      repository.create({
        creatorId,
        pageId,
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        expectedContentVersion: 0,
      }),
    ).resolves.toEqual({ type: 'unsupported_capability' });
    expect(prisma.pageQuestion.create).not.toHaveBeenCalled();
  });

  it('rejects a new question when the page already has 100 questions', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 100,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findMany.mockResolvedValue(
      Array.from({ length: 100 }, (_, displayOrder) => ({ displayOrder })),
    );

    await expect(
      repository.create({
        creatorId,
        pageId,
        type: 'PLAIN_MESSAGE',
        prompt: 'One more memory',
        expectedContentVersion: 100,
      }),
    ).resolves.toEqual({ type: 'question_limit' });
    expect(prisma.pageQuestion.create).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('updates content and clears all legacy destinations after confirmation', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(questionRow());
    prisma.visitorAnswer.findMany.mockResolvedValue([]);
    prisma.pageQuestion.findUniqueOrThrow.mockResolvedValue(
      questionRow({ prompt: 'Updated prompt' }),
    );
    prisma.pageQuestion.update.mockResolvedValue({});
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.update({
        creatorId,
        pageId,
        questionId: firstId,
        prompt: 'Updated prompt',
        expectedContentVersion: 4,
        confirmResponseDeletion: true,
      }),
    ).resolves.toMatchObject({ type: 'updated', contentVersion: 5 });
    expect(prisma.pageQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          endsJourney: false,
          nextQuestionId: null,
        }) as jest.AsymmetricMatcher,
      }) as jest.AsymmetricMatcher,
    );
  });

  it('rejects choices when the final question type is plain message', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(
      questionRow({ type: 'PLAIN_MESSAGE', choices: [] }),
    );

    await expect(
      repository.update({
        creatorId,
        pageId,
        questionId: firstId,
        choices: [
          { label: 'Unexpected choice one' },
          { label: 'Unexpected choice two' },
        ],
        expectedContentVersion: 4,
        confirmResponseDeletion: false,
      }),
    ).resolves.toEqual({ type: 'invalid_branch' });
    expect(prisma.visitorAnswer.findMany).not.toHaveBeenCalled();
    expect(prisma.pageQuestion.update).not.toHaveBeenCalled();
  });

  it('updates a private choice note without deleting existing responses', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    const current = questionRow();
    prisma.pageQuestion.findFirst.mockResolvedValue(current);
    prisma.pageQuestion.findUniqueOrThrow.mockResolvedValue(
      questionRow({
        choices: current.choices.map((choice, index) => ({
          ...choice,
          creatorMessage: index === 0 ? 'Only I can see this' : null,
        })),
      }),
    );
    prisma.pageQuestion.update.mockResolvedValue({});
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.update({
        creatorId,
        pageId,
        questionId: firstId,
        choices: [
          {
            id: current.choices[0].id,
            label: current.choices[0].label,
            creatorMessage: 'Only I can see this',
          },
          {
            id: current.choices[1].id,
            label: current.choices[1].label,
            creatorMessage: null,
          },
        ],
        expectedContentVersion: 4,
        confirmResponseDeletion: false,
      }),
    ).resolves.toMatchObject({ type: 'updated', contentVersion: 5 });
    expect(prisma.visitorAnswer.findMany).not.toHaveBeenCalled();
    expect(prisma.pageQuestion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          choices: expect.objectContaining({
            update: expect.arrayContaining([
              expect.objectContaining({
                data: expect.objectContaining({
                  creatorMessage: 'Only I can see this',
                }) as jest.AsymmetricMatcher,
              }),
            ]) as jest.AsymmetricMatcher,
          }) as jest.AsymmetricMatcher,
        }) as jest.AsymmetricMatcher,
      }) as jest.AsymmetricMatcher,
    );
  });

  it('deletes one question and normalizes the remaining order', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 1,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue({ id: firstId });
    prisma.visitorAnswer.findMany.mockResolvedValue([]);
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: secondId },
      { id: '55555555-5555-4555-8555-555555555555' },
    ]);
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.delete({
        creatorId,
        pageId,
        questionId: firstId,
        expectedContentVersion: 1,
        confirmResponseDeletion: false,
      }),
    ).resolves.toEqual({ type: 'deleted', contentVersion: 2 });
    expect(prisma.pageQuestion.delete).toHaveBeenCalledWith({
      where: { id: firstId },
    });
    expect(prisma.pageQuestion.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: secondId, pageId },
      data: { displayOrder: 0 },
    });
  });

  it('rejects incomplete or duplicate reorder requests without writing', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 2,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: firstId },
      { id: secondId },
    ]);

    await expect(
      repository.reorder({
        creatorId,
        pageId,
        questionIds: [firstId, firstId],
        expectedContentVersion: 2,
      }),
    ).resolves.toEqual({ type: 'invalid_order' });
    expect(prisma.pageQuestion.updateMany).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a reorder from a stale content version before changing order', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 3,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });

    await expect(
      repository.reorder({
        creatorId,
        pageId,
        questionIds: [firstId, secondId],
        expectedContentVersion: 2,
      }),
    ).resolves.toEqual({ type: 'stale', currentContentVersion: 3 });
    expect(prisma.pageQuestion.findMany).not.toHaveBeenCalled();
    expect(prisma.pageQuestion.updateMany).not.toHaveBeenCalled();
  });

  it('returns the current version without writing when reorder is unchanged', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 2,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: firstId, displayOrder: 0 },
      { id: secondId, displayOrder: 1 },
    ]);

    await expect(
      repository.reorder({
        creatorId,
        pageId,
        questionIds: [firstId, secondId],
        expectedContentVersion: 2,
      }),
    ).resolves.toEqual({
      type: 'reordered',
      questionIds: [firstId, secondId],
      contentVersion: 2,
    });
    expect(prisma.pageQuestion.updateMany).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a reorder containing a question from another page', async () => {
    const foreignId = '66666666-6666-4666-8666-666666666666';
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 2,
      status: 'DRAFT',
      templateVersion: { registryKey: 'confession.secret-letter', version: 1 },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: firstId },
      { id: secondId },
    ]);

    await expect(
      repository.reorder({
        creatorId,
        pageId,
        questionIds: [firstId, foreignId],
        expectedContentVersion: 2,
      }),
    ).resolves.toEqual({ type: 'invalid_order' });
    expect(prisma.pageQuestion.updateMany).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });
});
