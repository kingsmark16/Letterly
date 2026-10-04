import {
  createRepositoryTestContext,
  type RepositoryTestContext,
  creatorId,
  createPageRecord,
} from '../../../../test/support/prisma-pages-repository-setup';
import { TemplateDefinitionUnavailableError } from '../application/template-definition-unavailable.error';

describe('PrismaPagesRepository', () => {
  let prisma: RepositoryTestContext['prisma'];
  let repository: RepositoryTestContext['repository'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ prisma, repository } = createRepositoryTestContext());
  });

  it.each([
    {
      registryKey: 'confession.secret-letter',
      key: 'secret-letter',
      name: 'Secret Letter',
    },
    {
      registryKey: 'confession.choose-your-heart',
      key: 'choose-your-heart',
      name: 'Choose Your Heart',
    },
  ])(
    'uses pinned $registryKey metadata for owner detail and summary after family metadata changes',
    async (identity) => {
      const record = createPageRecord({ status: 'PUBLISHED' });
      record.templateVersion.registryKey = identity.registryKey;
      record.templateVersion.template.key = identity.key;
      record.templateVersion.template.name = 'Newer family metadata from v2';
      prisma.page.findFirst.mockResolvedValue(record);
      prisma.page.findMany.mockResolvedValue([record]);
      const expected = {
        id: record.templateVersion.template.id,
        key: identity.key,
        name: identity.name,
        templateVersionId: record.templateVersion.id,
        version: 1,
        registryKey: identity.registryKey,
      };
      const owner = await repository.findOwnedPage({
        creatorId,
        pageId: record.id,
      });
      const list = await repository.listPages({
        creatorId,
        size: 10,
        cursor: null,
      });
      expect(owner?.template).toEqual(expected);
      expect(list.items[0]?.template).toEqual(expected);
      expect(owner?.status).toBe('PUBLISHED');
      expect(list.items[0]?.status).toBe('PUBLISHED');
      expect(record.templateVersion.template.name).toBe(
        'Newer family metadata from v2',
      );
      expect(prisma.page.update).not.toHaveBeenCalled();
      expect(prisma.page.updateMany).not.toHaveBeenCalled();
    },
  );

  it('AC-5 lists only the creator draft summaries and omits the main message', async () => {
    const latest = createPageRecord({
      id: '11111111-1111-4111-8111-111111111111',
      content: {
        title: '  For Juliet  ',
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
    expect(result.items[0]?.preview).toEqual({ title: 'For Juliet' });
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

  it('AC-6 hides a failed attempt that was superseded by a ready replacement', async () => {
    const currentAudioCreatedAt = new Date('2026-08-09T02:00:00.000Z');
    const failedAudioCreatedAt = new Date('2026-08-09T01:00:00.000Z');

    prisma.page.findFirst.mockResolvedValue(
      createPageRecord({
        currentAudio: {
          id: 'ready-audio',
          state: 'READY',
          displayTitle: 'Our song',
          sourceMimeType: 'audio/mpeg',
          sourceByteSize: 1024,
          durationMilliseconds: 180_000,
          failureCode: null,
          createdAt: currentAudioCreatedAt,
        },
        audioUploads: [
          {
            id: 'failed-audio',
            state: 'FAILED',
            displayTitle: 'Old song',
            sourceMimeType: 'audio/mpeg',
            sourceByteSize: 1024,
            durationMilliseconds: 180_000,
            failureCode: 'AUDIO_UPLOAD_FAILED',
            createdAt: failedAudioCreatedAt,
          },
        ],
      }),
    );

    const result = await repository.findOwnedPage({
      creatorId,
      pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
    });

    expect(result?.audioRetry).toBeUndefined();
  });

  it.each([
    { registryKey: 'unknown', version: 1, key: 'secret-letter' },
    {
      registryKey: 'confession.secret-letter',
      version: 2,
      key: 'secret-letter',
    },
    {
      registryKey: 'confession.choose-your-heart',
      version: 1,
      key: 'secret-letter',
    },
  ])(
    'rejects inconsistent owner identity $registryKey/$key/$version in details and summaries',
    async (identity) => {
      const record = createPageRecord();
      record.templateVersion = {
        ...record.templateVersion,
        registryKey: identity.registryKey,
        version: identity.version,
        template: { ...record.templateVersion.template, key: identity.key },
      };
      prisma.page.findFirst.mockResolvedValue(record);
      prisma.page.findMany.mockResolvedValue([record]);
      await expect(
        repository.findOwnedPage({ creatorId, pageId: record.id }),
      ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
      await expect(
        repository.listPages({ creatorId, size: 10, cursor: null }),
      ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    },
  );

  it('maps journey owner settings and draft previews without encrypted password material', async () => {
    const record = createPageRecord();
    const settings = {
      ...record.settings,
      responsesEnabled: true,
      passwordProtection: {
        ciphertext: 'private-ciphertext',
        iv: 'iv',
        authTag: 'tag',
        keyVersion: 'key',
        passwordVersion: 'password',
      },
    };
    const journeyRecord = {
      ...record,
      settings,
      templateVersion: {
        ...record.templateVersion,
        registryKey: 'confession.choose-your-heart',
        template: {
          ...record.templateVersion.template,
          key: 'choose-your-heart',
        },
      },
      pageJourney: {
        draftRevision: {
          rootQuestion: {
            prompt: 'Draft prompt',
            choices: [{ key: 'yes', label: 'Yes' }],
          },
        },
        publishedRevision: {
          rootQuestion: { prompt: 'Private published prompt', choices: [] },
        },
      },
    };
    prisma.page.findFirst.mockResolvedValue(journeyRecord);
    prisma.page.findMany.mockResolvedValue([journeyRecord]);
    const owner = await repository.findOwnedPage({
      creatorId,
      pageId: record.id,
    });
    expect(owner).toMatchObject({
      passwordProtected: true,
      settings: { responsesEnabled: true },
    });
    expect(owner?.settings).not.toHaveProperty('passwordProtection');
    const summaries = await repository.listPages({
      creatorId,
      size: 10,
      cursor: null,
    });
    expect(summaries.items[0]?.preview).toEqual({
      firstQuestion: {
        prompt: 'Draft prompt',
        choices: [{ key: 'yes', label: 'Yes' }],
      },
    });
    expect(JSON.stringify(summaries)).not.toContain('Private published prompt');
    expect(JSON.stringify(owner)).not.toContain('private-ciphertext');
  });
});
