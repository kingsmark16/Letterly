import {
  createRepositoryTestContext,
  type RepositoryTestContext,
  creatorId,
  templateVersionId,
  createPageRecord,
  type TransactionCallback,
  createPrismaMock,
} from '../../../../test/support/prisma-pages-repository-setup';
import { requiredTestValue } from '../../../../test/support/required-test-value';

import { TemplateDefinitionUnavailableError } from '../application/template-definition-unavailable.error';
import { randomInt } from 'node:crypto';

import { chooseYourHeartDefaultGraph } from '@letterly/templates';

describe('PrismaPagesRepository', () => {
  function journeyRecord() {
    const record = createPageRecord();
    return {
      ...record,
      templateVersion: {
        ...record.templateVersion,
        registryKey: 'confession.choose-your-heart',
        template: {
          ...record.templateVersion.template,
          key: 'choose-your-heart',
        },
      },
    };
  }
  function draftInput(registryKey = 'confession.secret-letter') {
    return {
      creatorId,
      templateVersionId,
      template: { registryKey, version: 1 },
      content: { recipientName: '', mainMessage: '', sections: [] },
      settings: {
        theme: 'romantic',
        fontStyle: 'handwritten',
        autoPlayMusic: false,
        music: null,
      },
      ...(registryKey === 'confession.choose-your-heart'
        ? { journey: { graph: chooseYourHeartDefaultGraph, maxDepth: 1 } }
        : {}),
    };
  }
  let prisma: RepositoryTestContext['prisma'];
  let repository: RepositoryTestContext['repository'];
  let updateDraft: RepositoryTestContext['updateDraft'];
  beforeEach(() => {
    jest.clearAllMocks();
    ({ prisma, repository, updateDraft } = createRepositoryTestContext());
  });

  it('prepares current locked content before writing without parsing template fields', async () => {
    const record = createPageRecord();
    const stored = { opaqueTemplateContent: 'Fresh database value' };
    const prepared = {
      recipientName: 'Prepared recipient',
      mainMessage: 'Prepared message',
      sections: [],
    };
    const order: string[] = [];
    prisma.$queryRaw.mockImplementation(() => {
      order.push('lock');
      return Promise.resolve([]);
    });
    prisma.page.findFirst
      .mockImplementationOnce(() => {
        order.push('read');
        return Promise.resolve({ ...record, content: stored });
      })
      .mockResolvedValueOnce({ ...record, content: prepared });
    prisma.page.updateMany.mockImplementation(() => {
      order.push('write');
      return Promise.resolve({ count: 1 });
    });
    const updateContent = jest.fn((current: unknown) => {
      order.push('prepare');
      expect(current).toBe(stored);
      return prepared;
    });
    const result = await repository.updateDraft({
      creatorId,
      pageId: record.id,
      expectedContentVersion: 0,
      updateContent,
    });
    expect(result).toMatchObject({
      type: 'updated',
      page: { content: prepared },
    });
    expect(order).toEqual(['lock', 'read', 'prepare', 'write']);
    expect(updateContent).toHaveBeenCalledTimes(1);
    expect(prisma.page.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { content: prepared, contentVersion: { increment: 1 } },
      }),
    );
  });

  it('propagates preparation failures before persistence or media mutations', async () => {
    const record = createPageRecord();
    const failure = new Error('Template preparation failed');
    prisma.page.findFirst.mockResolvedValue(record);
    const updateContent = jest.fn(() => {
      throw failure;
    });
    await expect(
      repository.updateDraft({
        creatorId,
        pageId: record.id,
        expectedContentVersion: 0,
        updateContent,
      }),
    ).rejects.toBe(failure);
    expect(prisma.page.updateMany).not.toHaveBeenCalled();
    expect(prisma.pageImage.findMany).not.toHaveBeenCalled();
    expect(prisma.mediaCleanup.createMany).not.toHaveBeenCalled();
  });

  it.each(['not_found', 'stale', 'image_limit'] as const)(
    'does not prepare content after %s early rejection',
    async (outcome) => {
      const record = createPageRecord();
      prisma.page.findFirst.mockResolvedValue(
        outcome === 'not_found' ? null : record,
      );
      const updateContent = jest.fn(() => record.content);
      const result = await repository.updateDraft({
        creatorId,
        pageId: record.id,
        expectedContentVersion: outcome === 'stale' ? 1 : 0,
        updateContent,
        ...(outcome === 'image_limit'
          ? {
              images: [
                { imageId: 'duplicate', sortOrder: 0 },
                { imageId: 'duplicate', sortOrder: 1 },
              ],
            }
          : {}),
      });
      expect(result.type).toBe(outcome);
      expect(updateContent).not.toHaveBeenCalled();
      expect(prisma.page.updateMany).not.toHaveBeenCalled();
    },
  );

  it('AC-1 creates a draft and reserves its generated slug', async () => {
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7]) {
      (randomInt as unknown as jest.Mock).mockReturnValueOnce(value);
    }

    prisma.page.create.mockResolvedValue(createPageRecord());

    await repository.createDraft({
      template: { registryKey: 'confession.secret-letter', version: 1 },
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

  it('AC-1 creates the starter journey in the same transaction as its page', async () => {
    for (const value of [0, 1, 2, 3, 4, 5, 6, 7]) {
      (randomInt as unknown as jest.Mock).mockReturnValueOnce(value);
    }
    prisma.page.create.mockResolvedValue(
      createPageRecord({
        templateVersion: {
          ...createPageRecord().templateVersion,
          registryKey: 'confession.choose-your-heart',
          template: {
            ...createPageRecord().templateVersion.template,
            key: 'choose-your-heart',
          },
        },
      }),
    );

    await repository.createDraft({
      template: { registryKey: 'confession.choose-your-heart', version: 1 },
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

    const result = await updateDraft({
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

  it('updates content while the page is published and preserves its status', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const currentUpdatedAt = new Date('2026-08-09T03:00:00.000Z');
    const sections = [] as const;

    prisma.page.findFirst
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'PUBLISHED' as const,
          contentVersion: 3,
          updatedAt: currentUpdatedAt,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'The published message.',
            sections,
          },
        }),
      )
      .mockResolvedValueOnce(
        createPageRecord({
          id: pageId,
          status: 'PUBLISHED' as const,
          contentVersion: 4,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'The revised public message.',
            sections,
          },
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'The revised public message.',
      expectedContentVersion: 3,
    });

    expect(result).toMatchObject({
      type: 'updated',
      page: {
        status: 'PUBLISHED',
        contentVersion: 4,
        content: {
          mainMessage: 'The revised public message.',
        },
      },
    });
    expect(prisma.page.updateMany).toHaveBeenCalledWith({
      where: {
        id: pageId,
        creatorId,
        status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
        contentVersion: 3,
      },
      data: {
        content: {
          recipientName: 'Juliet',
          mainMessage: 'The revised public message.',
          sections,
        },
        contentVersion: { increment: 1 },
      },
    });
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

    const result = await updateDraft({
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

    const result = await updateDraft({
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

    const result = await updateDraft({
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

  it('does not rewrite legacy response availability when saving letter content', async () => {
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
          },
        }),
      );
    prisma.page.updateMany.mockResolvedValue({ count: 1 });

    await updateDraft({
      creatorId,
      pageId,
      recipientName: 'Juliet',
      mainMessage: 'The revised message.',
      expectedContentVersion: 2,
    });

    const updateCalls = prisma.page.updateMany.mock.calls as unknown as Array<
      [{ data: { settings?: unknown } }]
    >;
    const updateCall = requiredTestValue(
      updateCalls[0]?.[0],
      'Expected fixture value: updateCalls[0]?.[0]',
    );

    expect(updateCall.data.settings).toBeUndefined();
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

    const result = await updateDraft({
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

  it.each([
    { registryKey: 'unknown', version: 1 },
    { registryKey: 'confession.secret-letter', version: 2 },
    { registryKey: 'confession.choose-your-heart', version: 2 },
  ])(
    'rejects unsupported draft persistence $registryKey/$version before writes',
    async (template) => {
      await expect(
        repository.createDraft({ ...draftInput(), template }),
      ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects a journey payload for Secret Letter before writes', async () => {
    await expect(
      repository.createDraft({
        ...draftInput(),
        journey: { graph: chooseYourHeartDefaultGraph, maxDepth: 1 },
      }),
    ).rejects.toThrow('Unexpected Secret Letter journey');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects missing journey data before writes', async () => {
    await expect(
      repository.createDraft({
        ...draftInput(),
        template: { registryKey: 'confession.choose-your-heart', version: 1 },
      }),
    ).rejects.toThrow('Choose Your Heart journey is missing');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses the supplied transaction in constraint, page, and journey write order', async () => {
    const transaction = createPrismaMock();
    const order: string[] = [];
    transaction.$executeRaw.mockImplementation(() => {
      order.push('constraints');
      return Promise.resolve();
    });
    transaction.page.create.mockImplementation(() => {
      order.push('page');
      return Promise.resolve(journeyRecord());
    });
    transaction.pageJourney.create.mockImplementation(() => {
      order.push('journey');
      return Promise.resolve();
    });
    transaction.pageJourneyGraphRevision.create.mockImplementation(() => {
      order.push('revision');
      return Promise.resolve();
    });
    transaction.pageJourneyQuestion.createMany.mockImplementation(() => {
      order.push('questions');
      return Promise.resolve();
    });
    transaction.pageJourneyOutcome.createMany.mockImplementation(() => {
      order.push('outcomes');
      return Promise.resolve();
    });
    transaction.pageJourneyChoice.createMany.mockImplementation(() => {
      order.push('choices');
      return Promise.resolve();
    });
    prisma.$transaction.mockImplementation(
      async (callback: TransactionCallback) => callback(transaction),
    );
    await repository.createDraft(draftInput('confession.choose-your-heart'));
    expect(order).toEqual([
      'constraints',
      'page',
      'journey',
      'revision',
      'questions',
      'outcomes',
      'choices',
    ]);
    expect(prisma.page.create).not.toHaveBeenCalled();
    expect(prisma.pageJourney.create).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('propagates journey write failure from the transaction without retrying it', async () => {
    prisma.page.create.mockResolvedValue(journeyRecord());
    const failure = new Error('Journey write failed');
    prisma.pageJourneyChoice.createMany.mockRejectedValue(failure);
    await expect(
      repository.createDraft(draftInput('confession.choose-your-heart')),
    ).rejects.toBe(failure);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a stored template mismatch inside the transaction before journey writes', async () => {
    prisma.page.create.mockResolvedValue(createPageRecord());
    await expect(
      repository.createDraft(draftInput('confession.choose-your-heart')),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    expect(prisma.pageJourney.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('retries a slug collision using a fresh transaction and creates the graph only after a successful page write', async () => {
    const collision = Object.assign(new Error('Slug collision'), {
      code: 'P2002',
    });
    prisma.page.create
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce(journeyRecord());
    await repository.createDraft(draftInput('confession.choose-your-heart'));
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
    expect(prisma.pageJourney.create).toHaveBeenCalledTimes(1);
  });

  it('keeps Secret Letter creation free of journey writes and constraint deferral', async () => {
    prisma.page.create.mockResolvedValue(createPageRecord());
    await repository.createDraft(draftInput());
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(prisma.pageJourney.create).not.toHaveBeenCalled();
  });

  it.each(['confession.secret-letter', 'confession.choose-your-heart'])(
    'rejects malformed draft settings for %s before opening a transaction',
    async (registryKey) => {
      const input = draftInput(registryKey);
      await expect(
        repository.createDraft({
          ...input,
          settings: { ...input.settings, theme: '' },
        }),
      ).rejects.toThrow();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('stops after five unique collision attempts without template writes', async () => {
    prisma.page.create.mockRejectedValue(
      Object.assign(new Error('Collision'), { code: 'P2002' }),
    );
    await expect(
      repository.createDraft(draftInput('confession.choose-your-heart')),
    ).rejects.toThrow('Collision');
    expect(prisma.$transaction).toHaveBeenCalledTimes(5);
    expect(prisma.pageJourney.create).not.toHaveBeenCalled();
  });
});
