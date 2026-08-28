jest.mock('node:crypto', () => ({
  randomInt: jest.fn(),
  randomUUID: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import { randomInt } from 'node:crypto';
import type { PrismaClient } from '@letterly/database';
import { chooseYourHeartDefaultGraph } from '@letterly/templates';
import { PrismaPagesRepository } from './prisma-pages.repository';

const creatorId = 'creator-123';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

type PrismaMock = {
  page: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  pageImage: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    updateMany: jest.Mock;
    deleteMany: jest.Mock;
    delete: jest.Mock;
  };
  mediaCleanup: {
    createMany: jest.Mock;
  };
  pageSlugReservation: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  pageJourney: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  pageJourneyGraphRevision: {
    create: jest.Mock;
  };
  pageJourneyQuestion: {
    createMany: jest.Mock;
  };
  pageJourneyOutcome: {
    createMany: jest.Mock;
  };
  pageJourneyChoice: {
    createMany: jest.Mock;
  };
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
  $disconnect: jest.Mock;
  $connect: jest.Mock;
  $transaction: jest.Mock;
};

type TransactionCallback = (transaction: PrismaMock) => Promise<unknown>;

function createPrismaMock(): PrismaMock {
  return {
    page: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pageImage: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    mediaCleanup: {
      createMany: jest.fn(),
    },
    pageSlugReservation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pageJourney: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    pageJourneyGraphRevision: {
      create: jest.fn(),
    },
    pageJourneyQuestion: {
      createMany: jest.fn(),
    },
    pageJourneyOutcome: {
      createMany: jest.fn(),
    },
    pageJourneyChoice: {
      createMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $connect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
  };
}

function createPageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
    creatorId,
    slug: 'abcdefgh',
    displaySlug: 'abcdefgh',
    status: 'DRAFT' as const,
    contentVersion: 0,
    content: {
      recipientName: '',
      mainMessage: '',
      sections: [],
    },
    settings: {
      theme: 'romantic',
      fontStyle: 'handwritten',
      autoPlayMusic: false,
      music: null,
    },
    createdAt: new Date('2026-08-09T00:00:00.000Z'),
    updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    templateVersion: {
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
      template: {
        id: '0cf6b27e-7d7d-40e8-bc18-ef1cdff1cb16',
        key: 'secret-letter',
        name: 'Secret Letter',
      },
    },
    ...overrides,
  };
}

describe('PrismaPagesRepository', () => {
  let prisma: PrismaMock;
  let repository: PrismaPagesRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(prisma),
    );

    repository = new PrismaPagesRepository(prisma as unknown as PrismaClient);
  });

  it('AC-1 creates a draft and reserves its generated slug', async () => {
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7]) {
      (randomInt as unknown as jest.Mock).mockReturnValueOnce(value);
    }

    prisma.page.create.mockResolvedValue(createPageRecord());

    await repository.createDraft({
      creatorId,
      templateVersionId,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A private letter.',
        sections: [],
      },
      settings: {
        theme: 'romantic',
        fontStyle: 'handwritten',
        autoPlayMusic: false,
        music: null,
        responsesEnabled: false,
      },
    });

    expect(prisma.page.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          creatorId,
          templateVersionId,
          slug: 'abcdefgh',
          displaySlug: 'abcdefgh',
          status: 'DRAFT',
          contentVersion: 0,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'A private letter.',
            sections: [],
          },
          settings: {
            theme: 'romantic',
            fontStyle: 'handwritten',
            autoPlayMusic: false,
            music: null,
            responsesEnabled: false,
          },
          slugReservations: {
            create: {
              normalizedSlug: 'abcdefgh',
              isCurrent: true,
            },
          },
        },
      }),
    );
  });

  it('AC-1 creates the starter journey in the same transaction as its page', async () => {
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7]) {
      (randomInt as unknown as jest.Mock).mockReturnValueOnce(value);
    }
    prisma.page.create.mockResolvedValue(createPageRecord());

    await repository.createDraft({
      creatorId,
      templateVersionId,
      content: {
        recipientName: '',
        mainMessage: '',
        sections: [],
      },
      settings: {
        theme: 'romantic',
        fontStyle: 'handwritten',
        autoPlayMusic: false,
        music: null,
        responsesEnabled: false,
      },
      journey: { graph: chooseYourHeartDefaultGraph, maxDepth: 1 },
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const journeyCreateCalls = prisma.pageJourney.create.mock
      .calls as unknown as unknown[][];
    const journeyCreateInput = journeyCreateCalls.at(0)?.at(0) as {
      data?: Record<string, unknown>;
    };
    expect(journeyCreateInput.data?.pageId).toBe(
      '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
    );
    expect(typeof journeyCreateInput.data?.draftRevisionId).toBe('string');
    const revisionCreateCalls = prisma.pageJourneyGraphRevision.create.mock
      .calls as unknown as unknown[][];
    const revisionCreateInput = revisionCreateCalls.at(0)?.at(0) as {
      data?: Record<string, unknown>;
    };
    expect(typeof revisionCreateInput.data?.rootQuestionId).toBe('string');
    expect(revisionCreateInput.data?.maxDepth).toBe(1);
    expect(prisma.pageJourneyQuestion.createMany).toHaveBeenCalled();
    expect(prisma.pageJourneyChoice.createMany).toHaveBeenCalled();
    expect(prisma.pageJourneyOutcome.createMany).toHaveBeenCalled();
  });

  it('AC-5 lists only the creator draft summaries and omits the main message', async () => {
    const latest = createPageRecord({
      id: '11111111-1111-4111-8111-111111111111',
      content: {
        recipientName: '  Juliet  ',
        mainMessage: 'This must not be in the summary.',
        sections: [],
      },
      updatedAt: new Date('2026-08-09T02:00:00.000Z'),
    });
    const older = createPageRecord({
      id: '22222222-2222-4222-8222-222222222222',
      updatedAt: new Date('2026-08-09T01:00:00.000Z'),
    });

    prisma.page.findMany.mockResolvedValue([latest, older]);

    const result = await repository.listPages({
      creatorId,
      size: 1,
      cursor: null,
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 2,
      }),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.recipientLabel).toBe('Juliet');
    expect(result.items[0]).not.toHaveProperty('mainMessage');
    expect(result.nextCursor).toEqual({
      updatedAt: latest.updatedAt,
      id: latest.id,
    });
  });

  it('AC-5 applies the stable cursor boundary for later dashboard pages', async () => {
    const cursor = {
      updatedAt: new Date('2026-08-09T02:00:00.000Z'),
      id: '11111111-1111-4111-8111-111111111111',
    };

    prisma.page.findMany.mockResolvedValue([]);

    await repository.listPages({
      creatorId,
      size: 20,
      cursor,
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
          OR: [
            {
              updatedAt: {
                lt: cursor.updatedAt,
              },
            },
            {
              updatedAt: cursor.updatedAt,
              id: {
                lt: cursor.id,
              },
            },
          ],
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 21,
      }),
    );
  });

  it('AC-5 includes published owner pages in the default list and preserves status', async () => {
    const published = createPageRecord({
      status: 'PUBLISHED',
      content: {
        recipientName: 'Published letter',
        mainMessage: 'This message stays out of the summary.',
        sections: [],
      },
    });
    prisma.page.findMany.mockResolvedValue([published]);

    const result = await repository.listPages({
      creatorId,
      size: 20,
      cursor: null,
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
        },
      }),
    );
    expect(result.items[0]).toMatchObject({
      recipientLabel: 'Published letter',
      status: 'PUBLISHED',
    });
  });

  it('AC-5 includes archived owner pages when the all status is requested', async () => {
    const archived = createPageRecord({
      status: 'ARCHIVED',
      content: {
        recipientName: 'Archived letter',
        mainMessage: 'This message stays out of the summary.',
        sections: [],
      },
    });
    prisma.page.findMany.mockResolvedValue([archived]);

    const result = await repository.listPages({
      creatorId,
      size: 20,
      cursor: null,
      status: 'ALL',
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: {
            in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'],
          },
        },
      }),
    );
    expect(result.items[0]).toMatchObject({
      recipientLabel: 'Archived letter',
      status: 'ARCHIVED',
    });
  });

  it('AC-8 scopes an owner page read by both page ID and creator ID', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue(null);

    await expect(
      repository.findOwnedPage({
        creatorId,
        pageId,
      }),
    ).resolves.toBeNull();

    expect(prisma.page.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: pageId,
          creatorId,
        },
      }),
    );
  });

  it('AC-4 returns stale without updating when the stored version changed', async () => {
    const updatedAt = new Date('2026-08-09T03:00:00.000Z');

    prisma.page.findFirst.mockResolvedValue({
      content: {
        recipientName: 'Juliet',
        mainMessage: 'The newest saved message.',
        sections: [],
      },
      contentVersion: 3,
      updatedAt,
    });

    const result = await repository.updateDraft({
      creatorId,
      pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
      recipientName: 'Juliet',
      mainMessage: 'An older browser attempt.',
      expectedContentVersion: 2,
    });

    expect(result).toEqual({
      type: 'stale',
      currentContentVersion: 3,
      currentUpdatedAt: updatedAt,
    });
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('blocks content updates while the page is published', async () => {
    prisma.page.findFirst.mockResolvedValue({
      content: {
        recipientName: 'Juliet',
        mainMessage: 'The published message.',
        sections: [],
      },
      settings: null,
      status: 'PUBLISHED',
      contentVersion: 3,
      updatedAt: new Date('2026-08-09T03:00:00.000Z'),
    });

    await expect(
      repository.updateDraft({
        creatorId,
        pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        recipientName: 'Juliet',
        mainMessage: 'This must not be saved.',
        expectedContentVersion: 3,
      }),
    ).resolves.toEqual({ type: 'invalid_state' });

    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-4 validates requested images before changing page content or version', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      content: {
        recipientName: 'Juliet',
        mainMessage: 'The original message.',
        sections: [],
      },
      contentVersion: 2,
      updatedAt: new Date('2026-08-09T03:00:00.000Z'),
    });
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageImage.findMany.mockResolvedValue([]);

    const result = await repository.updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'This must not be saved.',
      expectedContentVersion: 2,
      images: [
        {
          imageId: '11111111-1111-4111-8111-111111111111',
          sortOrder: 0,
        },
      ],
    });

    expect(result).toEqual({ type: 'invalid_image' });
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
  });

  it('AC-4 rolls back content when a requested image changes after validation', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const imageId = '11111111-1111-4111-8111-111111111111';

    prisma.page.findFirst
      .mockResolvedValueOnce({
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The original message.',
          sections: [],
        },
        contentVersion: 2,
        updatedAt: new Date('2026-08-09T03:00:00.000Z'),
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          contentVersion: 3,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'This must be rolled back.',
            sections: [],
          },
        }),
      );
    prisma.pageImage.findMany
      .mockResolvedValueOnce([
        {
          id: imageId,
          sourceByteSize: 1024,
          outputByteSize: 512,
          storageKey: `pages/${pageId}/images/${imageId}.webp`,
          sourceStorageKey: null,
        },
      ])
      .mockResolvedValueOnce([]);
    prisma.page.updateMany.mockResolvedValue({ count: 1 });
    prisma.pageImage.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await repository.updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'This must be rolled back.',
      expectedContentVersion: 2,
      images: [{ imageId, sortOrder: 0 }],
    });

    expect(result).toEqual({ type: 'invalid_image' });
  });

  it('AC-3 updates editable fields, preserves sections, and increments the version', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const sections = [
      {
        id: 'opening',
        type: 'message' as const,
        order: 0,
      },
    ];
    const currentUpdatedAt = new Date('2026-08-09T03:00:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The original message.',
          sections,
        },
        contentVersion: 2,
        updatedAt: currentUpdatedAt,
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          contentVersion: 3,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'The revised message.',
            sections,
          },
        }),
      );

    prisma.page.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await repository.updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'The revised message.',
      expectedContentVersion: 2,
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: {
        id: pageId,
        creatorId,
        status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
        contentVersion: 2,
      },
      data: {
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The revised message.',
          sections,
        },
        contentVersion: {
          increment: 1,
        },
      },
    });

    if (result.type !== 'updated') {
      throw new Error('Expected the draft update to succeed');
    }

    expect(result.page.contentVersion).toBe(3);
    expect(result.page.content).toEqual({
      recipientName: 'Juliet',
      mainMessage: 'The revised message.',
      sections,
    });
  });

  it('preserves encrypted password protection when changing response availability', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const passwordProtection = {
      ciphertext: 'ciphertext',
      iv: 'iv',
      authTag: 'auth-tag',
      keyVersion: '1',
      passwordVersion: '2',
    };
    const currentSettings = {
      theme: 'romantic',
      fontStyle: 'handwritten',
      autoPlayMusic: false,
      music: null,
      responsesEnabled: false,
      passwordProtection,
    };

    prisma.page.findFirst
      .mockResolvedValueOnce({
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The original message.',
          sections: [],
        },
        settings: currentSettings,
        contentVersion: 2,
        updatedAt: new Date('2026-08-09T03:00:00.000Z'),
      })
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          contentVersion: 3,
          settings: {
            ...currentSettings,
            responsesEnabled: true,
          },
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await repository.updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'The revised message.',
      responsesEnabled: true,
      expectedContentVersion: 2,
    });

    const updateCalls = prisma.page.updateMany.mock.calls as unknown as Array<
      [{ data: { settings: unknown } }]
    >;
    const updateCall = updateCalls[0]?.[0];

    expect(updateCall.data.settings).toEqual({
      ...currentSettings,
      responsesEnabled: true,
    });
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
    expect(prisma.page.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.page.delete.mock.invocationCallOrder[0] ?? Infinity,
    );
    expect(prisma.page.delete.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.pageSlugReservation.updateMany.mock.invocationCallOrder[0] ??
        Infinity,
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
  it('AC-4 returns the latest version when another save wins during the update', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const originalUpdatedAt = new Date('2026-08-09T03:00:00.000Z');
    const latestUpdatedAt = new Date('2026-08-09T03:01:00.000Z');

    prisma.page.findFirst
      .mockResolvedValueOnce({
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The original message.',
          sections: [],
        },
        contentVersion: 2,
        updatedAt: originalUpdatedAt,
      })
      .mockResolvedValueOnce({
        contentVersion: 3,
        updatedAt: latestUpdatedAt,
      });

    prisma.page.updateMany.mockResolvedValue({
      count: 0,
    });

    const result = await repository.updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'An outdated browser save.',
      expectedContentVersion: 2,
    });

    expect(result).toEqual({
      type: 'stale',
      currentContentVersion: 3,
      currentUpdatedAt: latestUpdatedAt,
    });

    expect(prisma.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: pageId,
          creatorId,
          status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
          contentVersion: 2,
        },
      }),
    );
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
    const publishUpdate = updateCalls[0]?.[0] as {
      where: unknown;
      data: unknown;
    };
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

    prisma.$queryRaw.mockImplementation(() => {
      callOrder.push('page-lock');
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
          templateVersion: { registryKey: 'confession.choose-your-heart' },
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
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

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
    expect(callOrder.indexOf('page-lock')).toBeLessThan(
      callOrder.indexOf('journey-read'),
    );
  });

  it('AC-13 rejects a publish that loses the conditional state update', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
      slug: 'abcdefgh',
      status: 'DRAFT',
      contentVersion: 0,
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

  it('AC-6 reads only a current published slug and omits private fields', async () => {
    prisma.page.findFirst.mockResolvedValue({
      slug: 'secret-letter',
      displaySlug: 'Secret-Letter',
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
        template: { key: 'secret-letter' },
      },
    });

    await expect(
      repository.findPublicPageBySlug('secret-letter'),
    ).resolves.toEqual({
      displaySlug: 'Secret-Letter',
      canonicalSlug: 'secret-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      images: [],
    });

    expect(prisma.page.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'secret-letter',
          status: 'PUBLISHED',
          moderationStatus: 'ACTIVE',
          creator: { moderationStatus: 'ACTIVE' },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) as Date } },
          ],
          slugReservations: {
            some: {
              normalizedSlug: 'secret-letter',
              isCurrent: true,
            },
          },
        },
      }),
    );
  });

  it('resets the Prisma pool after a transient public read failure', async () => {
    const error = Object.assign(new Error('connection timed out'), {
      code: 'ETIMEDOUT',
    });
    prisma.page.findFirst.mockRejectedValue(error);

    await expect(repository.findPublicPageBySlug('secret-letter')).rejects.toBe(
      error,
    );
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('AC-2 exposes a safe response list with stable question and choice order', async () => {
    const questionA = '11111111-1111-4111-8111-111111111111';
    const questionB = '22222222-2222-4222-8222-222222222222';
    const choiceA = '33333333-3333-4333-8333-333333333333';
    const choiceB = '44444444-4444-4444-8444-444444444444';

    prisma.page.findFirst.mockResolvedValue({
      slug: 'secret-letter',
      displaySlug: 'Secret-Letter',
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
      settings: {
        theme: 'romantic',
        fontStyle: 'handwritten',
        autoPlayMusic: false,
        music: null,
        responsesEnabled: false,
      },
      templateVersion: {
        registryKey: 'confession.secret-letter',
        version: 1,
        template: { key: 'secret-letter' },
      },
      questions: [
        {
          id: questionB,
          type: 'PLAIN_MESSAGE',
          prompt: 'Tell me more',
          displayOrder: 0,
          nextQuestionId: null,
          choices: [],
        },
        {
          id: questionA,
          type: 'CHOICE',
          prompt: 'What do you remember?',
          displayOrder: 0,
          nextQuestionId: null,
          choices: [
            {
              id: choiceB,
              label: 'Second',
              displayOrder: 1,
              nextQuestionId: null,
            },
            {
              id: choiceA,
              label: 'First',
              displayOrder: 0,
              nextQuestionId: null,
            },
          ],
        },
      ],
    });

    const result = await repository.findPublicPageBySlug('secret-letter');

    expect(result?.response).toMatchObject({
      enabled: true,
      requiredAnswers: false,
      visitorMessageEnabled: true,
      questions: [
        {
          id: questionA,
          choices: [
            { id: choiceA, label: 'First' },
            { id: choiceB, label: 'Second' },
          ],
        },
        { id: questionB },
      ],
    });
    expect(result).not.toHaveProperty('settings');
    const responseQuestions =
      result?.response && result.response.enabled
        ? (result.response.questions as Array<{
            nextQuestionId?: unknown;
            choices: Array<{ endsJourney?: unknown }>;
          }>)
        : undefined;
    expect(responseQuestions?.[0]).not.toHaveProperty('nextQuestionId');
    expect(responseQuestions?.[0]?.choices[0]).not.toHaveProperty(
      'endsJourney',
    );
  });

  it('fails closed when the stored template registry key does not match', async () => {
    prisma.page.findFirst.mockResolvedValue({
      slug: 'secret-letter',
      displaySlug: 'Secret-Letter',
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
      templateVersion: {
        registryKey: 'confession.choose-your-heart',
        version: 1,
        template: { key: 'secret-letter' },
      },
    });

    await expect(
      repository.findPublicPageBySlug('secret-letter'),
    ).rejects.toThrow('Public template registry definition is unavailable');
  });
});
