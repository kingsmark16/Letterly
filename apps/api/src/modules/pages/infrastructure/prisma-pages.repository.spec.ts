jest.mock('node:crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import { randomInt } from 'node:crypto';
import type { PrismaClient } from '@letterly/database';
import { PrismaPagesRepository } from './prisma-pages.repository';

const creatorId = 'creator-123';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

type PrismaMock = {
  page: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
    delete: jest.Mock;
  };
  pageSlugReservation: {
    updateMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

type TransactionCallback = (transaction: PrismaMock) => Promise<unknown>;

function createPrismaMock(): PrismaMock {
  return {
    page: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    pageSlugReservation: {
      updateMany: jest.fn(),
    },
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

    const result = await repository.listDrafts({
      creatorId,
      size: 1,
      cursor: null,
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: 'DRAFT',
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

    await repository.listDrafts({
      creatorId,
      size: 20,
      cursor,
    });

    expect(prisma.page.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          creatorId,
          status: 'DRAFT',
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
        status: 'DRAFT',
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

  it('AC-7 clears slug reservations before permanently deleting an owned draft', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

    prisma.page.findFirst.mockResolvedValue({
      id: pageId,
    });
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
        pageId,
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
          status: 'DRAFT',
          contentVersion: 2,
        },
      }),
    );
  });
});
