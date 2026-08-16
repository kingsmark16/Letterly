import {
  InvalidSubmissionBranchError,
  PageSubmissionsService,
  SubmissionConfirmationRequiredError,
  SubmissionIdempotencyConflictError,
  SubmissionNotFoundError,
  hashSubmissionPayload,
} from './page-submissions.service';
import type { PageSubmissionsRepository } from './page-submissions.repository';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
const submissionId = '11111111-1111-4111-8111-111111111111';

function createRepository(): jest.Mocked<PageSubmissionsRepository> {
  return {
    findPublishedPageScope: jest.fn(),
    submitVisitorResponse: jest.fn(),
    listOwned: jest.fn(),
    findOwned: jest.fn(),
    markRead: jest.fn(),
    deleteOwned: jest.fn(),
  };
}

describe('PageSubmissionsService', () => {
  it('hashes the response payload deterministically', () => {
    const input = {
      answers: [{ questionId: pageId, choiceId: submissionId }],
      visitorMessage: { message: 'A note' },
    };

    expect(hashSubmissionPayload(input)).toBe(hashSubmissionPayload(input));
    expect(
      hashSubmissionPayload({ ...input, visitorMessage: { message: 'Other' } }),
    ).not.toBe(hashSubmissionPayload(input));
  });

  it('maps idempotency conflicts and invalid branches to stable errors', async () => {
    const repository = createRepository();
    const service = new PageSubmissionsService(repository);

    repository.submitVisitorResponse.mockResolvedValueOnce({
      type: 'idempotency_conflict',
    });
    await expect(
      service.submit({
        slug: 'letter42',
        browserTokenHash: 'hash',
        idempotencyKey: 'key',
        answers: [],
      }),
    ).rejects.toBeInstanceOf(SubmissionIdempotencyConflictError);

    repository.submitVisitorResponse.mockResolvedValueOnce({
      type: 'invalid_branch',
    });
    await expect(
      service.submit({
        slug: 'letter42',
        browserTokenHash: 'hash',
        idempotencyKey: 'key-2',
        answers: [],
      }),
    ).rejects.toBeInstanceOf(InvalidSubmissionBranchError);
  });

  it('requires explicit confirmation before deleting a response', async () => {
    const repository = createRepository();
    const service = new PageSubmissionsService(repository);

    await expect(
      service.delete({
        creatorId: 'creator',
        pageId,
        submissionId,
        confirm: false,
      }),
    ).rejects.toBeInstanceOf(SubmissionConfirmationRequiredError);
    expect(repository.deleteOwned).not.toHaveBeenCalled();

    repository.deleteOwned.mockResolvedValue('not_found');
    await expect(
      service.delete({
        creatorId: 'creator',
        pageId,
        submissionId,
        confirm: true,
      }),
    ).rejects.toBeInstanceOf(SubmissionNotFoundError);
  });
});
