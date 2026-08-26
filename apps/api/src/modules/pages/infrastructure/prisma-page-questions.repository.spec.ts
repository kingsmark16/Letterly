jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaPageQuestionsRepository } from './prisma-page-questions.repository';

type PrismaMock = {
  page: {
    findFirst: jest.Mock;
    updateMany: jest.Mock;
  };
  pageQuestion: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    deleteMany: jest.Mock;
  };
  visitorAnswer: {
    count: jest.Mock;
    findMany: jest.Mock;
    deleteMany: jest.Mock;
  };
  visitorSubmission: {
    deleteMany: jest.Mock;
  };
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
};

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const rootId = '11111111-1111-4111-8111-111111111111';
const childId = '22222222-2222-4222-8222-222222222222';

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    page: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    pageQuestion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
    visitorAnswer: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    visitorSubmission: {
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

function questionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: rootId,
    pageId,
    key: 'first-question',
    type: 'CHOICE' as const,
    prompt: 'What do you remember?',
    displayOrder: 0,
    config: null,
    nextQuestionId: null,
    choices: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        key: 'happy',
        label: 'The happy moments',
        displayOrder: 0,
        creatorMessage: null,
        nextQuestionId: null,
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        key: 'quiet',
        label: 'The quiet moments',
        displayOrder: 1,
        creatorMessage: null,
        nextQuestionId: null,
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

  it('creates a choice question and advances the page content version', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 0,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([]);
    prisma.pageQuestion.findUniqueOrThrow.mockResolvedValue(questionRow());
    prisma.pageQuestion.create.mockResolvedValue({});
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.create({
      creatorId,
      pageId,
      key: 'first-question',
      type: 'CHOICE',
      prompt: 'What do you remember?',
      displayOrder: 0,
      choices: [
        { key: 'happy', label: 'The happy moments', displayOrder: 0 },
        { key: 'quiet', label: 'The quiet moments', displayOrder: 1 },
      ],
    });

    expect(result).toMatchObject({
      type: 'updated',
      contentVersion: 1,
      question: { id: rootId, type: 'CHOICE' },
    });
    expect(prisma.pageQuestion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pageId,
          type: 'CHOICE',
          choices: expect.objectContaining({
            create: expect.arrayContaining([
              expect.objectContaining({ key: 'happy' }),
              expect.objectContaining({ key: 'quiet' }),
            ]) as jest.AsymmetricMatcher,
          }) as jest.AsymmetricMatcher,
        }) as jest.AsymmetricMatcher,
      }),
    );
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, contentVersion: 0 },
      data: { contentVersion: { increment: 1 } },
    });
  });

  it('reorders the complete question list in one content version transaction', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId },
      { id: childId },
      { id: '55555555-5555-4555-8555-555555555555' },
    ]);
    prisma.pageQuestion.updateMany.mockResolvedValue({ count: 1 });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.reorder({
      creatorId,
      pageId,
      questionIds: [childId, '55555555-5555-4555-8555-555555555555', rootId],
      expectedContentVersion: 4,
    });

    expect(result).toEqual({ type: 'reordered', contentVersion: 5 });
    expect(prisma.pageQuestion.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: childId, pageId },
      data: { displayOrder: 0 },
    });
    expect(prisma.pageQuestion.updateMany).toHaveBeenNthCalledWith(2, {
      where: {
        id: '55555555-5555-4555-8555-555555555555',
        pageId,
      },
      data: { displayOrder: 1 },
    });
    expect(prisma.pageQuestion.updateMany).toHaveBeenNthCalledWith(3, {
      where: { id: rootId, pageId },
      data: { displayOrder: 2 },
    });
    expect(prisma.page.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, contentVersion: 4 },
      data: { contentVersion: { increment: 1 } },
    });
  });

  it('rejects a branch that creates a cycle', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 2,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(questionRow());
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId, nextQuestionId: childId, choices: [] },
      { id: childId, nextQuestionId: null, choices: [] },
    ]);

    const result = await repository.update({
      creatorId,
      pageId,
      questionId: childId,
      prompt: 'A nested question',
      expectedContentVersion: 2,
      confirmResponseDeletion: false,
      nextQuestionId: rootId,
    });

    expect(result).toEqual({ type: 'invalid_branch' });
    expect(prisma.pageQuestion.update).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a finish state that still targets another question', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 2,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });

    await expect(
      repository.create({
        creatorId,
        pageId,
        key: 'finished-question',
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        displayOrder: 1,
        endsJourney: true,
        nextQuestionId: rootId,
      }),
    ).resolves.toEqual({ type: 'invalid_branch' });
    expect(prisma.pageQuestion.create).not.toHaveBeenCalled();
  });

  it('requires confirmation before changing a question with responses', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'PUBLISHED',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(questionRow());
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId, nextQuestionId: childId, choices: [] },
      { id: childId, nextQuestionId: null, choices: [] },
    ]);
    prisma.visitorAnswer.findMany.mockResolvedValue([
      { submissionId: 'submission-1' },
      { submissionId: 'submission-2' },
      { submissionId: 'submission-3' },
    ]);

    const result = await repository.update({
      creatorId,
      pageId,
      questionId: rootId,
      prompt: 'Updated prompt',
      expectedContentVersion: 4,
      confirmResponseDeletion: false,
    });

    expect(result).toEqual({
      type: 'response_impact',
      affectedResponseCount: 3,
    });
    expect(prisma.visitorAnswer.deleteMany).not.toHaveBeenCalled();
    expect(prisma.pageQuestion.update).not.toHaveBeenCalled();
  });

  it('counts responses in a newly attached descendant subtree', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'PUBLISHED',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(questionRow());
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId, nextQuestionId: null, choices: [] },
      { id: childId, nextQuestionId: null, choices: [] },
    ]);
    prisma.visitorAnswer.findMany.mockResolvedValue([
      { submissionId: 'submission-in-child' },
    ]);

    const result = await repository.update({
      creatorId,
      pageId,
      questionId: rootId,
      choices: [
        {
          key: 'happy',
          label: 'The happy moments',
          displayOrder: 0,
          nextQuestionId: childId,
        },
        { key: 'quiet', label: 'The quiet moments', displayOrder: 1 },
      ],
      expectedContentVersion: 4,
      confirmResponseDeletion: false,
    });

    expect(result).toEqual({
      type: 'response_impact',
      affectedResponseCount: 1,
    });
    expect(prisma.pageQuestion.update).not.toHaveBeenCalled();
  });

  it('rejects question mutations when the trusted template lacks questions', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 0,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'future.no-questions',
        version: 1,
      },
    });

    await expect(
      repository.create({
        creatorId,
        pageId,
        key: 'first-question',
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        displayOrder: 0,
      }),
    ).resolves.toEqual({ type: 'unsupported_capability' });
    expect(prisma.pageQuestion.create).not.toHaveBeenCalled();
  });

  it('deletes the affected response tree after confirmation', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 4,
      status: 'PUBLISHED',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findFirst.mockResolvedValue(questionRow());
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId, nextQuestionId: childId, choices: [] },
      { id: childId, nextQuestionId: null, choices: [] },
    ]);
    prisma.visitorAnswer.findMany.mockResolvedValue([
      { submissionId: 'submission-1' },
      { submissionId: 'submission-2' },
      { submissionId: 'submission-3' },
    ]);
    prisma.pageQuestion.findUniqueOrThrow.mockResolvedValue(
      questionRow({ prompt: 'Updated prompt' }),
    );
    prisma.pageQuestion.update.mockResolvedValue({});
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.update({
      creatorId,
      pageId,
      questionId: rootId,
      prompt: 'Updated prompt',
      expectedContentVersion: 4,
      confirmResponseDeletion: true,
    });

    expect(result).toMatchObject({ type: 'updated', contentVersion: 5 });
    expect(prisma.visitorAnswer.deleteMany).toHaveBeenCalledWith({
      where: { questionId: { in: [rootId, childId] } },
    });
    expect(prisma.visitorSubmission.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['submission-1', 'submission-2', 'submission-3'] },
        answers: { none: {} },
        visitorMessage: { is: null },
      },
    });
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, contentVersion: 4 },
      data: { contentVersion: { increment: 1 } },
    });
  });

  it('protects a question that is still referenced by another answer', async () => {
    prisma.page.findFirst.mockResolvedValue({
      contentVersion: 1,
      status: 'DRAFT',
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageQuestion.findMany.mockResolvedValue([
      { id: rootId, nextQuestionId: childId, choices: [] },
      { id: childId, nextQuestionId: null, choices: [] },
    ]);

    await expect(
      repository.delete({
        creatorId,
        pageId,
        questionId: childId,
        expectedContentVersion: 1,
        confirmResponseDeletion: false,
      }),
    ).resolves.toEqual({ type: 'question_referenced' });

    expect(prisma.pageQuestion.deleteMany).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });
});
