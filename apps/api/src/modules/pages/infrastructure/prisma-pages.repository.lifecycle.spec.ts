import {
  createRepositoryTestContext,
  type RepositoryTestContext,
  creatorId,
  createPageRecord,
  type TransactionCallback,
  createPrismaMock,
} from '../../../../test/support/prisma-pages-repository-setup';
import {
  requiredTestValue,
  firstMockCallOrder,
} from '../../../../test/support/required-test-value';

describe('PrismaPagesRepository', () => {
  let prisma: RepositoryTestContext['prisma'];
  let repository: RepositoryTestContext['repository'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ prisma, repository } = createRepositoryTestContext());
  });

  it('AC-7 clears slug reservations before permanently deleting an owned draft', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      archivedAt: null,
    });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageSlugReservation.findMany.mockResolvedValue([
      { id: 'reservation-id' },
    ]);
    prisma.pageSlugReservation.updateMany.mockResolvedValue({
      count: 1,
    });
    prisma.page.delete.mockResolvedValue({});

    await expect(
      repository.deleteOwnedPage({
        creatorId,
        pageId,
      }),
    ).resolves.toBe('deleted');

    expect(prisma.pageSlugReservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['reservation-id'] },
      },
      data: {
        pageId: null,
        isCurrent: false,
      },
    });
    expect(prisma.page.delete).toHaveBeenCalledWith({
      where: {
        id: pageId,
      },
    });
    expect(prisma.pageImage.findMany).toHaveBeenCalledWith({
      where: { pageId },
      select: { storageKey: true, sourceStorageKey: true },
    });
    expect(firstMockCallOrder(prisma.page.updateMany)).toBeLessThan(
      firstMockCallOrder(prisma.page.delete) ?? Infinity,
    );
    expect(firstMockCallOrder(prisma.page.delete)).toBeLessThan(
      firstMockCallOrder(prisma.pageSlugReservation.updateMany) ?? Infinity,
    );
  });

  it('AC-7 removes visitor submissions before permanently deleting an owned page', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      archivedAt: null,
    });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageSlugReservation.findMany.mockResolvedValue([]);
    prisma.visitorSubmission.deleteMany.mockResolvedValue({ count: 1 });
    prisma.page.delete.mockResolvedValue({});

    await expect(
      repository.deleteOwnedPage({ creatorId, pageId }),
    ).resolves.toBe('deleted');

    expect(prisma.visitorSubmission.deleteMany).toHaveBeenCalledWith({
      where: { pageId },
    });
    expect(
      firstMockCallOrder(prisma.visitorSubmission.deleteMany),
    ).toBeLessThan(firstMockCallOrder(prisma.page.delete) ?? Infinity);
  });

  it('AC-11 queues every page audio object before deleting the page', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      archivedAt: null,
    });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageAudio.findMany.mockResolvedValue([
      { sourceStorageKey: `pages/${pageId}/audio/current` },
      { sourceStorageKey: `pages/${pageId}/audio/failed` },
      { sourceStorageKey: null },
    ]);
    prisma.pageSlugReservation.findMany.mockResolvedValue([]);
    prisma.page.delete.mockResolvedValue({});

    await expect(
      repository.deleteOwnedPage({ creatorId, pageId }),
    ).resolves.toBe('deleted');

    expect(prisma.pageAudio.findMany).toHaveBeenCalledWith({
      where: { pageId },
      select: { sourceStorageKey: true },
    });
    expect(prisma.mediaCleanup.createMany).toHaveBeenCalledWith({
      data: [
        {
          objectKey: `pages/${pageId}/audio/current`,
          nextRetryAt: expect.any(Date) as jest.AsymmetricMatcher,
        },
        {
          objectKey: `pages/${pageId}/audio/failed`,
          nextRetryAt: expect.any(Date) as jest.AsymmetricMatcher,
        },
      ],
      skipDuplicates: true,
    });
    expect(firstMockCallOrder(prisma.mediaCleanup.createMany)).toBeLessThan(
      firstMockCallOrder(prisma.page.delete) ?? Infinity,
    );
  });

  it('AC-7 does not mutate data when the owned draft cannot be found', async () => {
    prisma.page.findFirst.mockResolvedValue(null);

    await expect(
      repository.deleteOwnedPage({
        creatorId,
        pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
      }),
    ).resolves.toBe('not_found');

    expect(prisma.pageSlugReservation.updateMany).not.toHaveBeenCalled();
    expect(prisma.page.delete).not.toHaveBeenCalled();
  });

  it('AC-1 publishes a saved draft and keeps its generated reservation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const publishedAt = new Date('2026-08-09T04:00:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({
        id: pageId,
        slug: 'abcdefgh',
        status: 'DRAFT',
        contentVersion: 0,
        templateVersion: {
          registryKey: 'confession.secret-letter',
          version: 1,
        },
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'PUBLISHED',
          publishedAt,
          unpublishedAt: null,
        }),
      );
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation-id',
      normalizedSlug: 'abcdefgh',
    });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.publishPage({
      creatorId,
      pageId,
      expectedContentVersion: 0,
      customSlug: null,
    });

    expect(result).toMatchObject({
      type: 'updated',
      publishedAt,
      unpublishedAt: null,
      page: { id: pageId, status: 'PUBLISHED' },
    });
    const updateCalls = prisma.page.updateMany.mock
      .calls as unknown as unknown[][];
    const publishUpdate = requiredTestValue(
      updateCalls[0]?.[0],
      'Expected fixture value: updateCalls[0]?.[0]',
    ) as {
      where: unknown;
      data: unknown;
    };
    expect(prisma.pageJourney.findUnique.mock.calls).toHaveLength(0);
    expect(prisma.pageJourney.update.mock.calls).toHaveLength(0);
    expect(publishUpdate.data).not.toHaveProperty('contentVersion');
    expect(publishUpdate.where).toEqual({
      id: pageId,
      creatorId,
      status: 'DRAFT',
      slug: 'abcdefgh',
      contentVersion: 0,
    });
    expect(publishUpdate.data).toEqual(
      expect.objectContaining({
        slug: 'abcdefgh',
        displaySlug: 'abcdefgh',
        status: 'PUBLISHED',
        unpublishedAt: null,
      }),
    );
  });

  it('locks the page before the journey while publishing a journey page', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const callOrder: string[] = [];

    prisma.$queryRaw.mockImplementation((strings: TemplateStringsArray) => {
      callOrder.push(
        strings.join('').includes('PageJourney') ? 'journey-lock' : 'page-lock',
      );
      return Promise.resolve([]);
    });
    prisma.page.findFirst
      .mockImplementationOnce(() => {
        callOrder.push('page-read');
        return Promise.resolve({
          id: pageId,
          slug: 'abcdefgh',
          status: 'DRAFT',
          contentVersion: 0,
          templateVersion: {
            registryKey: 'confession.choose-your-heart',
            version: 1,
          },
        });
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-08-09T04:00:00.000Z'),
          unpublishedAt: null,
        }),
      );
    prisma.pageJourney.findUnique.mockImplementation(() => {
      callOrder.push('journey-read');
      return Promise.resolve({
        id: 'journey-id',
        draftRevisionId: 'draft-revision-id',
      });
    });
    prisma.pageJourney.update.mockImplementation(() => {
      callOrder.push('journey-update');
      return Promise.resolve({});
    });
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation-id',
      normalizedSlug: 'abcdefgh',
    });
    prisma.page.updateMany.mockImplementation(() => {
      callOrder.push('page-update');
      return Promise.resolve({ count: 1 });
    });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        customSlug: null,
      }),
    ).resolves.toMatchObject({ type: 'updated' });

    expect(callOrder.indexOf('page-lock')).toBeLessThan(
      callOrder.indexOf('page-read'),
    );
    expect(callOrder).toEqual([
      'page-lock',
      'page-read',
      'journey-lock',
      'journey-read',
      'page-update',
      'journey-update',
    ]);
    expect(prisma.page.updateMany.mock.calls[0]).toEqual([
      expect.objectContaining({
        data: expect.objectContaining({
          contentVersion: { increment: 1 },
        }) as jest.AsymmetricMatcher,
      }),
    ]);
    expect(prisma.pageJourney.update.mock.calls).toEqual([
      [
        {
          where: { id: 'journey-id' },
          data: { publishedRevisionId: 'draft-revision-id' },
        },
      ],
    ]);
  });

  describe('registered persistence publication failures', () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const input = {
      creatorId,
      pageId,
      expectedContentVersion: 0,
      customSlug: null,
    };
    beforeEach(() => {
      prisma.page.findFirst.mockResolvedValue({
        id: pageId,
        slug: 'abcdefgh',
        status: 'DRAFT',
        contentVersion: 0,
        templateVersion: {
          registryKey: 'confession.choose-your-heart',
          version: 1,
        },
      });
      prisma.pageSlugReservation.findFirst.mockResolvedValue({
        id: 'reservation-id',
        normalizedSlug: 'abcdefgh',
      });
      prisma.pageJourney.findUnique.mockResolvedValue({
        id: 'journey-id',
        draftRevisionId: 'draft-revision-id',
      });
      prisma.page.updateMany.mockResolvedValue({ count: 1 });
    });
    it.each([
      { registryKey: 'unknown', version: 1 },
      { registryKey: 'confession.choose-your-heart', version: 999 },
      { registryKey: 'confession.secret-letter', version: 999 },
    ])(
      'rejects unsupported locked template identity %j before template work',
      async (templateVersion) => {
        prisma.page.findFirst.mockResolvedValue({
          id: pageId,
          slug: 'abcdefgh',
          status: 'DRAFT',
          contentVersion: 0,
          templateVersion,
        });
        await expect(repository.publishPage(input)).resolves.toEqual({
          type: 'invalid_state',
        });
        expect(prisma.pageJourney.findUnique.mock.calls).toHaveLength(0);
        expect(prisma.page.updateMany.mock.calls).toHaveLength(0);
        expect(prisma.pageJourney.update.mock.calls).toHaveLength(0);
      },
    );
    it('rejects a missing journey before updating its Page or reserving a slug', async () => {
      prisma.pageJourney.findUnique.mockResolvedValue(null);
      await expect(repository.publishPage(input)).resolves.toEqual({
        type: 'invalid_state',
      });
      expect(prisma.page.updateMany.mock.calls).toHaveLength(0);
      expect(prisma.pageJourney.update.mock.calls).toHaveLength(0);
      expect(prisma.pageSlugReservation.create.mock.calls).toHaveLength(0);
    });
    it('never promotes a revision after losing the conditional owner Page update', async () => {
      prisma.page.updateMany.mockResolvedValue({ count: 0 });
      await expect(repository.publishPage(input)).resolves.toEqual({
        type: 'invalid_state',
      });
      expect(prisma.pageJourney.update.mock.calls).toHaveLength(0);
      expect(prisma.pageSlugReservation.create.mock.calls).toHaveLength(0);
    });
    it('propagates promotion failures so the outer transaction can roll back', async () => {
      const failure = new Error('Revision update failed');
      prisma.pageJourney.update.mockRejectedValue(failure);
      await expect(repository.publishPage(input)).rejects.toBe(failure);
      expect(prisma.pageSlugReservation.create.mock.calls).toHaveLength(0);
      expect(prisma.$transaction.mock.calls).toHaveLength(1);
    });
    it('does all template work on the provided transaction rather than the client', async () => {
      const transaction = createPrismaMock();
      transaction.page.findFirst
        .mockResolvedValueOnce({
          id: pageId,
          slug: 'abcdefgh',
          status: 'DRAFT',
          contentVersion: 0,
          templateVersion: {
            registryKey: 'confession.choose-your-heart',
            version: 1,
          },
        })
        .mockResolvedValueOnce(createPageRecord({ status: 'PUBLISHED' }));
      transaction.pageSlugReservation.findFirst.mockResolvedValue({
        id: 'reservation-id',
        normalizedSlug: 'abcdefgh',
      });
      transaction.pageJourney.findUnique.mockResolvedValue({
        id: 'transaction-journey',
        draftRevisionId: 'transaction-revision',
      });
      transaction.page.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation((operation: TransactionCallback) =>
        operation(transaction),
      );
      await expect(repository.publishPage(input)).resolves.toMatchObject({
        type: 'updated',
      });
      expect(prisma.pageJourney.findUnique.mock.calls).toHaveLength(0);
      expect(prisma.pageJourney.update.mock.calls).toHaveLength(0);
      expect(transaction.pageJourney.update.mock.calls).toEqual([
        [
          {
            where: { id: 'transaction-journey' },
            data: { publishedRevisionId: 'transaction-revision' },
          },
        ],
      ]);
      expect(transaction.$transaction.mock.calls).toHaveLength(0);
    });
  });

  it('AC-13 rejects a publish that loses the conditional state update', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'abcdefgh',
      status: 'DRAFT',
      contentVersion: 0,
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation-id',
      normalizedSlug: 'abcdefgh',
    });
    prisma.page.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        customSlug: null,
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.pageSlugReservation.updateMany).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.create).not.toHaveBeenCalled();
  });

  it('AC-8 keeps an unpublished page slug stable when republishing', async () => {
    const pageId = '9de65e32-53db-4a25-8626-691501a66202';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'old-slug',
      status: 'UNPUBLISHED',
      contentVersion: 0,
    });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        customSlug: 'new-slug',
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.pageSlugReservation.findFirst).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.findUnique).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-8 keeps a previously published slug stable after archive restore', async () => {
    const pageId = '9de65e32-53db-4a25-8626-691501a66202';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'old-slug',
      status: 'DRAFT',
      contentVersion: 0,
      publishedAt: new Date('2026-08-09T05:00:00.000Z'),
    });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        customSlug: 'new-slug',
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.pageSlugReservation.findFirst).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.findUnique).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-1 rejects publishing content that changed after readiness validation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'abcdefgh',
      status: 'DRAFT',
      contentVersion: 4,
    });
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation-id',
      normalizedSlug: 'abcdefgh',
    });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 3,
        customSlug: null,
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-2 rejects a custom slug that is already reserved without mutation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'abcdefgh',
      status: 'DRAFT',
      contentVersion: 0,
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
      },
    });
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation-id',
      normalizedSlug: 'abcdefgh',
    });
    prisma.pageSlugReservation.findUnique.mockResolvedValue({
      id: 'other-reservation',
    });

    await expect(
      repository.publishPage({
        creatorId,
        pageId,
        expectedContentVersion: 0,
        customSlug: 'taken-slug',
      }),
    ).resolves.toEqual({ type: 'slug_already_taken' });

    expect(prisma.pageSlugReservation.update).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.create).not.toHaveBeenCalled();
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-8 changes the slug of a draft and keeps one current reservation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst
      .mockResolvedValueOnce({
        id: pageId,
        slug: 'abcdefgh',
        status: 'DRAFT',
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          slug: 'new-slug',
          displaySlug: 'new-slug',
          status: 'DRAFT',
        }),
      );
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'current-reservation',
      normalizedSlug: 'abcdefgh',
    });
    prisma.pageSlugReservation.findUnique.mockResolvedValue(null);
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageSlugReservation.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.changePublishedSlug({
        creatorId,
        pageId,
        customSlug: 'new-slug',
      }),
    ).resolves.toMatchObject({
      type: 'updated',
      page: { id: pageId, slug: 'new-slug' },
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: {
        id: pageId,
        creatorId,
        status: 'DRAFT',
        slug: 'abcdefgh',
      },
      data: { slug: 'new-slug', displaySlug: 'new-slug' },
    });
    expect(prisma.pageSlugReservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'current-reservation',
        pageId,
        normalizedSlug: 'abcdefgh',
        isCurrent: true,
      },
      data: { isCurrent: false },
    });
    expect(prisma.pageSlugReservation.create).toHaveBeenCalledWith({
      data: {
        normalizedSlug: 'new-slug',
        pageId,
        isCurrent: true,
      },
    });
  });

  it('AC-8 rejects a published slug change without mutation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'live-slug',
      status: 'PUBLISHED',
    });

    await expect(
      repository.changePublishedSlug({
        creatorId,
        pageId,
        customSlug: 'new-slug',
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.page.updateMany).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.findFirst).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.create).not.toHaveBeenCalled();
  });

  it('AC-8 rejects a restored previously published slug change without mutation', async () => {
    const pageId = '9de65e32-53db-4a25-8626-691501a66202';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'live-slug',
      status: 'DRAFT',
      publishedAt: new Date('2026-08-09T05:00:00.000Z'),
    });

    await expect(
      repository.changePublishedSlug({
        creatorId,
        pageId,
        customSlug: 'new-slug',
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.page.updateMany).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.findFirst).not.toHaveBeenCalled();
    expect(prisma.pageSlugReservation.create).not.toHaveBeenCalled();
  });

  it('AC-4 unpublishes only a currently published owner page', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const unpublishedAt = new Date('2026-08-09T05:00:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({
        id: pageId,
        status: 'PUBLISHED',
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'UNPUBLISHED',
          publishedAt: new Date('2026-08-09T04:00:00.000Z'),
          unpublishedAt,
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await repository.unpublishPage({ creatorId, pageId });

    expect(result).toMatchObject({
      type: 'updated',
      unpublishedAt,
      page: { status: 'UNPUBLISHED' },
    });
    const unpublishCalls = prisma.page.updateMany.mock
      .calls as unknown as unknown[][];
    const unpublishUpdate = unpublishCalls[0]?.[0] as {
      where: unknown;
      data: unknown;
    };
    const anyDateMatcher: unknown = expect.any(Date);
    expect(unpublishUpdate.where).toEqual({
      id: pageId,
      creatorId,
      status: 'PUBLISHED',
    });
    expect(unpublishUpdate.data).toEqual(
      expect.objectContaining({
        status: 'UNPUBLISHED',
        unpublishedAt: anyDateMatcher,
      }),
    );
  });

  it('AC-13 rejects an unpublish that loses the conditional state update', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      status: 'PUBLISHED',
    });
    prisma.page.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.unpublishPage({ creatorId, pageId }),
    ).resolves.toEqual({ type: 'invalid_state' });
  });

  it('AC-5 archives an owner page from any active lifecycle state', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const archivedAt = new Date('2026-08-09T06:00:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({ id: pageId, status: 'PUBLISHED' })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'ARCHIVED',
          archivedAt,
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.archivePage({ creatorId, pageId }),
    ).resolves.toMatchObject({
      type: 'updated',
      page: { status: 'ARCHIVED' },
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, status: 'PUBLISHED' },
      data: {
        status: 'ARCHIVED',
        archivedAt: expect.any(Date) as jest.AsymmetricMatcher,
      },
    });
  });

  it('AC-5 restores only archived owner pages to drafts', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst
      .mockResolvedValueOnce({ id: pageId, status: 'ARCHIVED' })
      .mockResolvedValueOnce(createPageRecord({ id: pageId, status: 'DRAFT' }));
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.restorePage({ creatorId, pageId }),
    ).resolves.toMatchObject({
      type: 'updated',
      page: { status: 'DRAFT' },
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, status: 'ARCHIVED' },
      data: { status: 'DRAFT' },
    });
  });

  it('AC-8 restores an archived previously published page as unpublished', async () => {
    const pageId = '9de65e32-53db-4a25-8626-691501a66202';
    const publishedAt = new Date('2026-08-09T05:00:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({
        id: pageId,
        status: 'ARCHIVED',
        publishedAt,
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'UNPUBLISHED',
          publishedAt,
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.restorePage({ creatorId, pageId }),
    ).resolves.toMatchObject({
      type: 'updated',
      page: { status: 'UNPUBLISHED' },
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: { id: pageId, creatorId, status: 'ARCHIVED' },
      data: {
        status: 'UNPUBLISHED',
        unpublishedAt: expect.any(Date) as jest.AsymmetricMatcher,
      },
    });
  });
});
