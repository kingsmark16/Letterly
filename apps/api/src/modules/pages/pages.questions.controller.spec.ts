import type { PageService } from './application/page.service';
import {
  PageQuestionService,
  InvalidQuestionOrderError,
  QuestionResponseImpactError,
} from './application/page-questions.service';
import { PagesController } from './pages.controller';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { ApiException } from '../../infrastructure/http/api-exception';
import { createPageQuestionRequestSchema } from '@letterly/contracts/questions';

jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

const creatorId = 'creator-123';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const questionId = '11111111-1111-4111-8111-111111111111';

const request = {
  authSession: { user: { id: creatorId } },
} as AuthenticatedRequest;

const question = {
  id: questionId,
  pageId,
  key: 'first-question',
  type: 'CHOICE' as const,
  prompt: 'What do you remember?',
  displayOrder: 0,
  config: null,
  endsJourney: false,
  nextQuestionId: null,
  choices: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      key: 'happy',
      label: 'The happy moments',
      displayOrder: 0,
      creatorMessage: null,
      endsJourney: false,
      nextQuestionId: null,
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      key: 'quiet',
      label: 'The quiet moments',
      displayOrder: 1,
      creatorMessage: null,
      endsJourney: false,
      nextQuestionId: null,
    },
  ],
};

describe('PagesController question routes', () => {
  it('passes the authenticated owner to question creation', async () => {
    const pageService = {} as PageService;
    const questionService = {
      create: jest.fn().mockResolvedValue({
        type: 'updated',
        question,
        contentVersion: 1,
      }),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      questionService as unknown as PageQuestionService,
    );

    await expect(
      controller.createQuestion(
        request,
        { pageId },
        {
          key: 'first-question',
          type: 'CHOICE',
          prompt: 'What do you remember?',
          displayOrder: 0,
          choices: [
            { key: 'happy', label: 'The happy moments', displayOrder: 0 },
            { key: 'quiet', label: 'The quiet moments', displayOrder: 1 },
          ],
        },
      ),
    ).resolves.toMatchObject({ question, contentVersion: 1 });

    expect(questionService.create).toHaveBeenCalledWith({
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
  });

  it('returns a conflict with the affected response count', async () => {
    const pageService = {} as PageService;
    const questionService = {
      create: jest.fn(),
      update: jest.fn().mockRejectedValue(new QuestionResponseImpactError(4)),
      delete: jest.fn(),
      reorder: jest.fn(),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      questionService as unknown as PageQuestionService,
    );

    let error: unknown;
    try {
      await controller.updateQuestion(
        request,
        { pageId, questionId },
        {
          prompt: 'Updated prompt',
          expectedContentVersion: 1,
          confirmResponseDeletion: false,
        },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 409,
      code: 'RESPONSE_IMPACT',
      details: {
        affectedResponseCount: 4,
        confirmResponseDeletion: true,
      },
    });
  });

  it('passes supported linear question content without branch controls', async () => {
    const pageService = {} as PageService;
    const questionService = {
      create: jest.fn().mockResolvedValue({
        type: 'updated',
        question: {
          ...question,
          choices: question.choices.map((choice, index) => ({
            ...choice,
            endsJourney: index === 0,
          })),
        },
        contentVersion: 2,
      }),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      questionService as unknown as PageQuestionService,
    );

    await expect(
      controller.createQuestion(
        request,
        { pageId },
        {
          key: 'first-question',
          type: 'CHOICE',
          prompt: 'What do you remember?',
          displayOrder: 0,
          choices: [
            {
              key: 'happy',
              label: 'The happy moments',
              displayOrder: 0,
            },
            { key: 'quiet', label: 'The quiet moments', displayOrder: 1 },
          ],
        },
      ),
    ).resolves.toMatchObject({ contentVersion: 2 });

    expect(questionService.create).toHaveBeenCalledWith({
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
  });

  it('maps invalid order to the stable validation code', async () => {
    const pageService = {} as PageService;
    const questionService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn().mockRejectedValue(new InvalidQuestionOrderError()),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      questionService as unknown as PageQuestionService,
    );

    let error: unknown;
    try {
      await controller.reorderQuestions(
        request,
        { pageId },
        { questionIds: [questionId], expectedContentVersion: 1 },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 422,
      code: 'INVALID_ORDER',
    });
  });

  it('accepts linear question input and ignores legacy branch fields', () => {
    expect(
      createPageQuestionRequestSchema.parse({
        key: 'written-memory',
        type: 'PLAIN_MESSAGE',
        prompt: 'Tell me more',
        displayOrder: 0,
        endsJourney: true,
        nextQuestionId: questionId,
      }),
    ).toMatchObject({
      type: 'PLAIN_MESSAGE',
      prompt: 'Tell me more',
    });
  });

  it('forwards a complete reorder request with the authenticated owner', async () => {
    const pageService = {} as PageService;
    const questionService = {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn().mockResolvedValue({
        questionIds: [questionId],
        contentVersion: 2,
      }),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      questionService as unknown as PageQuestionService,
    );

    await expect(
      controller.reorderQuestions(
        request,
        { pageId },
        { questionIds: [questionId], expectedContentVersion: 1 },
      ),
    ).resolves.toEqual({ questionIds: [questionId], contentVersion: 2 });

    expect(questionService.reorder).toHaveBeenCalledWith({
      creatorId,
      pageId,
      questionIds: [questionId],
      expectedContentVersion: 1,
    });
  });
});
