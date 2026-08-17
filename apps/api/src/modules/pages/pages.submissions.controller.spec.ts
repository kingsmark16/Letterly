jest.mock('../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));

import type { PageService } from './application/page.service';
import { PageSubmissionsService } from './application/page-submissions.service';
import { PagesController, PublicPagesController } from './pages.controller';
import type { AuthenticatedRequest } from '../auth/better-auth-session.guard';
import { ApiException } from '../../infrastructure/http/api-exception';
import type { RateLimitService } from '../../infrastructure/http/rate-limit.service';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const submissionId = '11111111-1111-4111-8111-111111111111';
const creatorId = 'creator-123';

const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as AuthenticatedRequest;

describe('Pages submission controllers', () => {
  it('accepts a visitor submission using the browser cookie', async () => {
    const pageService = {} as PageService;
    const consumeVisitorSubmission = jest.fn();
    const rateLimitService = {
      consumeVisitorSubmission,
    } as unknown as RateLimitService;
    const submissionService = {
      findPublicPageScope: jest.fn().mockResolvedValue(pageId),
      submit: jest.fn().mockResolvedValue({ accepted: true }),
    };
    const controller = new PublicPagesController(
      pageService,
      rateLimitService,
      'visitor-secret',
      undefined,
      submissionService as unknown as PageSubmissionsService,
    );

    const result = await controller.submit(
      { slug: 'Letter42' },
      {
        headers: { cookie: 'other=value; letterly_browser=browser-token' },
        ip: '127.0.0.1',
      } as never,
      {
        answers: [],
        visitorMessage: 'A private message',
        idempotencyKey: 'request-1',
      },
    );

    expect(result).toEqual({ accepted: true });
    expect(consumeVisitorSubmission).toHaveBeenCalledWith(
      pageId,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(submissionService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'letter42',
        browserTokenHash: expect.stringMatching(
          /^[a-f0-9]{64}$/,
        ) as jest.AsymmetricMatcher,
        idempotencyKey: 'request-1',
        visitorMessage: { message: 'A private message' },
      }),
    );
  });

  it('rejects a submission when the browser cookie is unavailable', async () => {
    const pageService = {} as PageService;
    const submissionService = {
      findPublicPageScope: jest.fn(),
      submit: jest.fn(),
    };
    const controller = new PublicPagesController(
      pageService,
      undefined,
      'visitor-secret',
      undefined,
      submissionService as unknown as PageSubmissionsService,
    );

    let error: unknown;
    try {
      await controller.submit(
        { slug: 'letter42' },
        { headers: {}, ip: '127.0.0.1' } as never,
        {
          answers: [],
          visitorMessage: 'A private message',
          idempotencyKey: 'request-1',
        },
      );
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).toApiError()).toMatchObject({
      statusCode: 422,
      code: 'COOKIE_REQUIRED',
    });
    expect(submissionService.submit).not.toHaveBeenCalled();
  });

  it('lists owner submissions through the authenticated page boundary', async () => {
    const pageService = {} as PageService;
    const submissionService = {
      list: jest.fn().mockResolvedValue({
        items: [
          {
            id: submissionId,
            readState: 'UNREAD',
            submittedAt: new Date('2026-08-15T01:00:00.000Z'),
            answerCount: 1,
            hasVisitorMessage: true,
          },
        ],
        nextCursor: null,
      }),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      undefined,
      submissionService as unknown as PageSubmissionsService,
    );

    const result = await controller.listSubmissions(
      ownerRequest,
      { pageId },
      { filter: 'unread', size: 20, cursor: undefined },
    );

    expect(result).toEqual({
      items: [
        {
          id: submissionId,
          readState: 'UNREAD',
          submittedAt: '2026-08-15T01:00:00.000Z',
          answerCount: 1,
          hasVisitorMessage: true,
        },
      ],
      nextCursor: null,
    });
    expect(submissionService.list).toHaveBeenCalledWith({
      creatorId,
      pageId,
      filter: 'unread',
      size: 20,
      cursor: null,
    });
  });

  it('marks an owned submission as read and requires confirmation to delete', async () => {
    const pageService = {} as PageService;
    const submissionService = {
      markRead: jest.fn().mockResolvedValue({
        submissionId,
        readState: 'READ',
      }),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const controller = new PagesController(
      pageService,
      'http://localhost:3000',
      undefined,
      undefined,
      undefined,
      submissionService as unknown as PageSubmissionsService,
    );

    await expect(
      controller.markSubmissionRead(ownerRequest, { pageId, submissionId }),
    ).resolves.toEqual({ submissionId, readState: 'READ' });
    await expect(
      controller.deleteSubmission(
        ownerRequest,
        { pageId, submissionId },
        { confirm: true },
      ),
    ).resolves.toEqual({ deleted: true });

    expect(submissionService.markRead).toHaveBeenCalledWith({
      creatorId,
      pageId,
      submissionId,
    });
    expect(submissionService.delete).toHaveBeenCalledWith({
      creatorId,
      pageId,
      submissionId,
      confirm: true,
    });
  });
});
