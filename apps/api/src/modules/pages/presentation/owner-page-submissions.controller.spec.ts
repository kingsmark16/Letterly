jest.mock('../../auth/better-auth-session.guard', () => ({
  BetterAuthSessionGuard: class BetterAuthSessionGuard {},
}));
import type { PageSubmissionsService } from '../application/page-submissions.service';
import type { AuthenticatedRequest } from '../../auth/better-auth-session.guard';
import { OwnerPageSubmissionsController } from './owner-page-submissions.controller';
const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const submissionId = '11111111-1111-4111-8111-111111111111';
const creatorId = 'creator-123';
const ownerRequest = {
  authSession: { user: { id: creatorId } },
} as AuthenticatedRequest;
describe('OwnerPageSubmissionsController', () => {
  it('lists owner submissions through the authenticated page boundary', async () => {
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
    const controller = new OwnerPageSubmissionsController(
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
    const submissionService = {
      markRead: jest.fn().mockResolvedValue({
        submissionId,
        readState: 'READ',
      }),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
    };
    const controller = new OwnerPageSubmissionsController(
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
