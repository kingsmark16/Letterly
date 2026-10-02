import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PageSubmissionsService,
  SubmissionNotFoundError,
  SubmissionConfirmationRequiredError,
} from '../src/modules/pages/application/page-submissions.service';
import {
  PAGE_SUBMISSIONS_REPOSITORY,
  type PageSubmissionsRepository,
} from '../src/modules/pages/application/page-submissions.repository';
import { pageSubmissionsServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';
const creatorId = 'fixture-creator';

function createRepository() {
  return {
    findPublishedPageScope:
      jest.fn<PageSubmissionsRepository['findPublishedPageScope']>(),
    submitVisitorResponse:
      jest.fn<PageSubmissionsRepository['submitVisitorResponse']>(),
    listOwned: jest.fn<PageSubmissionsRepository['listOwned']>(),
    findOwned: jest.fn<PageSubmissionsRepository['findOwned']>(),
    markRead: jest.fn<PageSubmissionsRepository['markRead']>(),
    deleteOwned: jest.fn<PageSubmissionsRepository['deleteOwned']>(),
  };
}

describe('Submissions service factory composition', () => {
  let module: TestingModule;
  let repository: ReturnType<typeof createRepository>;
  let service: PageSubmissionsService;

  beforeEach(async () => {
    repository = createRepository();
    module = await Test.createTestingModule({
      providers: [
        pageSubmissionsServiceProvider,
        { provide: PAGE_SUBMISSIONS_REPOSITORY, useValue: {} },
      ],
    })
      .overrideProvider(PAGE_SUBMISSIONS_REPOSITORY)
      .useValue(repository)
      .compile();
    service = module.get(PageSubmissionsService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('resolves the singleton factory and preserves the canonical payload hash through a repository override', async () => {
    expect(module.get(PageSubmissionsService)).toBe(service);
    repository.submitVisitorResponse.mockResolvedValue({ type: 'accepted' });
    const input = {
      slug: 'letter42',
      browserTokenHash: 'browser-hash',
      idempotencyKey: 'request-1',
      observedPasswordVersion: 'version-1',
      answers: [{ questionId: 'question-1', textAnswer: '  answer  ' }],
      visitorMessage: { message: ' note ' },
    };
    await expect(service.submit(input)).resolves.toEqual({ accepted: true });
    expect(repository.submitVisitorResponse.mock.calls).toEqual([
      [
        {
          ...input,
          idempotencyPayloadHash:
            '5f81614afcf756ba6574fce4828c8d0edafc8881bfee295b4dae8010b9b72b11',
        },
      ],
    ]);
  });

  it('preserves owner scope for list/detail queries and unavailable owner errors', async () => {
    const result = { items: [], unreadCount: 0, nextCursor: null };
    repository.listOwned.mockResolvedValue(result);
    const input = {
      creatorId,
      pageId,
      filter: 'unread' as const,
      size: 20,
      cursor: null,
    };
    await expect(service.list(input)).resolves.toEqual(result);
    expect(repository.listOwned.mock.calls).toEqual([[input]]);
    repository.findOwned.mockResolvedValue(null);
    await expect(
      service.find({ creatorId, pageId, submissionId }),
    ).rejects.toBeInstanceOf(SubmissionNotFoundError);
    expect(repository.findOwned.mock.calls).toEqual([
      [{ creatorId, pageId, submissionId }],
    ]);
  });

  it('requires deletion confirmation before persistence and retains the owner scope', async () => {
    await expect(
      service.delete({ creatorId, pageId, submissionId, confirm: false }),
    ).rejects.toBeInstanceOf(SubmissionConfirmationRequiredError);
    expect(repository.deleteOwned.mock.calls).toHaveLength(0);
    repository.deleteOwned.mockResolvedValue('deleted');
    await expect(
      service.delete({ creatorId, pageId, submissionId, confirm: true }),
    ).resolves.toEqual({ deleted: true });
    expect(repository.deleteOwned.mock.calls).toEqual([
      [{ creatorId, pageId, submissionId, confirm: true }],
    ]);
  });

  it('keeps the repository token required', async () => {
    await expect(
      Test.createTestingModule({
        providers: [pageSubmissionsServiceProvider],
      }).compile(),
    ).rejects.toThrow('dependencies');
  });

  it('retains service overrides without constructing missing dependencies', async () => {
    const replacement = {
      findPublicPageScope: jest
        .fn<PageSubmissionsService['findPublicPageScope']>()
        .mockResolvedValue(pageId),
    };
    const isolated = await Test.createTestingModule({
      providers: [pageSubmissionsServiceProvider],
    })
      .overrideProvider(PageSubmissionsService)
      .useValue(replacement)
      .compile();
    try {
      expect(isolated.get(PageSubmissionsService)).toBe(replacement);
      await expect(
        isolated.get(PageSubmissionsService).findPublicPageScope('letter42'),
      ).resolves.toBe(pageId);
    } finally {
      await isolated.close();
    }
  });
});
