import {
  createRepositoryTestContext,
  type RepositoryTestContext,
  createPageRecord,
} from '../../../../test/support/prisma-pages-repository-setup';
import { TransientPublicReadError } from '../application/transient-public-read.error';

import {
  chooseYourHeartTemplate,
  secretLetterTemplate,
  type TemplateAudioCapability,
} from '@letterly/templates';

describe('PrismaPagesRepository', () => {
  let prisma: RepositoryTestContext['prisma'];
  let repository: RepositoryTestContext['repository'];

  beforeEach(() => {
    jest.clearAllMocks();
    ({ prisma, repository } = createRepositoryTestContext());
  });

  it('AC-6 reads only a current published slug and omits private fields', async () => {
    prisma.page.findFirst.mockResolvedValue({
      id: 'page-1',
      slug: 'secret-letter',
      displaySlug: 'Secret-Letter',
      currentAudioLink: null,
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
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
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

    await expect(
      repository.findPublicPageBySlug('secret-letter'),
    ).rejects.toMatchObject({ name: 'TransientPublicReadError', cause: error });
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('AC-2 exposes a safe response list with stable question and choice order', async () => {
    const questionA = '11111111-1111-4111-8111-111111111111';
    const questionB = '22222222-2222-4222-8222-222222222222';
    const choiceA = '33333333-3333-4333-8333-333333333333';
    const choiceB = '44444444-4444-4444-8444-444444444444';

    prisma.page.findFirst.mockResolvedValue({
      id: 'page-1',
      slug: 'secret-letter',
      displaySlug: 'Secret-Letter',
      currentAudioLink: null,
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
          displayOrder: 1,
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

  it('AC-7 and AC-10 disable public responses for malformed choice order', async () => {
    prisma.page.findFirst.mockResolvedValue(
      createPageRecord({
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
        questions: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            type: 'CHOICE',
            prompt: 'What do you remember?',
            displayOrder: 0,
            choices: [
              {
                id: '22222222-2222-4222-8222-222222222222',
                label: 'The beginning',
                displayOrder: 0,
              },
              {
                id: '33333333-3333-4333-8333-333333333333',
                label: 'The middle',
                displayOrder: 2,
              },
            ],
          },
        ],
      }),
    );

    const result = await repository.findPublicPageBySlug('secret-letter');

    expect(result?.response).toEqual({ enabled: false });
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

  describe('registered public projection adapters', () => {
    function record(
      registryKey = 'confession.choose-your-heart',
      key = 'choose-your-heart',
    ) {
      return {
        id: 'public-page',
        slug: 'public-page',
        displaySlug: 'A/B',
        creatorId: 'private-owner',
        passwordHash: 'private-password',
        content: {
          recipientName: 'Reader',
          mainMessage: 'The saved letter',
          sections: [],
          storageKey: 'private-content-key',
        },
        settings: {
          ...secretLetterTemplate.defaultSettings,
          ...chooseYourHeartTemplate.defaultSettings,
        },
        templateVersion: { registryKey, version: 1, template: { key } },
        images: [
          { id: 'image', caption: 'A memory', storageKey: 'private-image-key' },
        ],
        currentAudioLink: null,
        pageJourney: {
          draftRevision: { rootQuestion: { key: 'private-draft-root' } },
          publishedRevision: {
            revisionNumber: 3,
            maxDepth: 1,
            rootQuestion: { key: 'start' },
            questions: [
              {
                key: 'start',
                prompt: 'Published question?',
                displayOrder: 0,
                privateNotes: 'private-question-notes',
                choices: [
                  {
                    key: 'yes',
                    label: 'Yes',
                    displayOrder: 0,
                    nextQuestion: null,
                    outcome: { key: 'result' },
                    storageKey: 'private-choice-key',
                  },
                ],
              },
            ],
            outcomes: [
              {
                key: 'result',
                title: 'Published result',
                resultMessage: 'Published words',
                displayOrder: 0,
                creatorId: 'private-owner',
                storageKey: 'private-outcome-key',
              },
            ],
          },
        },
      };
    }
    it('projects only published journey data and allowlisted outcome fields', async () => {
      prisma.page.findFirst.mockResolvedValue(record());
      const result = await repository.findPublicPageBySlug('public-page');
      expect(result).toMatchObject({
        template: {
          registryKey: 'confession.choose-your-heart',
          key: 'choose-your-heart',
          version: 1,
        },
        publishedGraphVersion: 3,
        rootQuestionKey: 'start',
        response: { enabled: true, requiredAnswers: true },
      });
      if (!result || !('outcomes' in result))
        throw new Error('Expected public journey');
      expect(result.outcomes).toEqual([
        {
          key: 'result',
          title: 'Published result',
          resultMessage: 'Published words',
          displayOrder: 0,
        },
      ]);
      expect(JSON.stringify(result)).not.toContain('private-');
      expect(result.images).toEqual([
        {
          imageId: 'image',
          caption: 'A memory',
          mediaUrl: '/p/A%2FB/media/image',
        },
      ]);
    });
    it('rejects a journey without a published revision instead of mapping its draft', async () => {
      prisma.page.findFirst.mockResolvedValue({
        ...record(),
        pageJourney: {
          publishedRevision: null,
          draftRevision: { revisionNumber: 4 },
        },
      });
      await expect(
        repository.findPublicPageBySlug('public-page'),
      ).rejects.toThrow('Published journey revision is missing');
    });
    it.each([
      ['unknown', 'secret-letter', 1],
      ['confession.secret-letter', 'choose-your-heart', 1],
      ['confession.choose-your-heart', 'choose-your-heart', 999],
    ])(
      'rejects mismatched public identity %s/%s/%s',
      async (registryKey, key, version) => {
        const page = record(registryKey, key);
        page.templateVersion.version = version;
        prisma.page.findFirst.mockResolvedValue(page);
        await expect(
          repository.findPublicPageBySlug('public-page'),
        ).rejects.toThrow('Public template registry definition is unavailable');
      },
    );
    it.each([
      ['confession.secret-letter', 'secret-letter'],
      ['confession.choose-your-heart', 'choose-your-heart'],
    ])(
      'keeps nonready audio and foreign links out of %s',
      async (registryKey, key) => {
        prisma.page.findFirst.mockResolvedValue({
          ...record(registryKey, key),
          currentAudio: {
            state: 'VERIFYING',
            displayTitle: 'Unready',
            durationMilliseconds: 100,
          },
          currentAudioLink: {
            id: 'foreign-link',
            pageId: 'different-page',
            provider: 'YOUTUBE',
            videoId: 'foreign',
          },
        });
        const result = await repository.findPublicPageBySlug('public-page');
        expect(result).not.toHaveProperty('audio');
        expect(result).not.toHaveProperty('audioLink');
      },
    );
    it('uses shared ready audio projection when the trusted journey capability permits it', async () => {
      const definition = chooseYourHeartTemplate as unknown as {
        audioCapability: TemplateAudioCapability;
      };
      const original = definition.audioCapability;
      try {
        definition.audioCapability = 'optional';
        prisma.page.findFirst.mockResolvedValue({
          ...record(),
          currentAudio: {
            state: 'READY',
            displayTitle: 'Music',
            durationMilliseconds: 100,
          },
        });
        await expect(
          repository.findPublicPageBySlug('public-page'),
        ).resolves.toMatchObject({
          audio: {
            mediaUrl: '/p/A%2FB/audio',
            title: 'Music',
            durationMilliseconds: 100,
          },
        });
      } finally {
        definition.audioCapability = original;
      }
    });
    it('filters all audio sources when the trusted journey capability is hidden', async () => {
      const definition = chooseYourHeartTemplate as unknown as {
        audioCapability: TemplateAudioCapability;
      };
      const original = definition.audioCapability;
      try {
        definition.audioCapability = 'hidden';
        prisma.page.findFirst.mockResolvedValue({
          ...record(),
          currentAudio: {
            state: 'READY',
            displayTitle: 'Hidden',
            durationMilliseconds: 100,
          },
          currentAudioLink: {
            id: 'link',
            pageId: 'public-page',
            provider: 'YOUTUBE',
            videoId: 'hidden',
          },
        });
        const result = await repository.findPublicPageBySlug('public-page');
        expect(result).not.toHaveProperty('audio');
        expect(result).not.toHaveProperty('audioLink');
      } finally {
        definition.audioCapability = original;
      }
    });
  });

  it('keeps non transient public failures unchanged and avoids pool recovery', async () => {
    const failure = Object.assign(new Error('Invalid data'), { code: 'P2002' });
    prisma.page.findFirst.mockRejectedValue(failure);
    await expect(repository.findPublicPageBySlug('letter')).rejects.toBe(
      failure,
    );
    expect(prisma.$disconnect).not.toHaveBeenCalled();
    expect(prisma.$connect).not.toHaveBeenCalled();
  });

  it('preserves a transient cause when best effort reconnect fails', async () => {
    const original = Object.assign(new Error('Original connection failure'), {
      code: 'P1001',
    });
    prisma.page.findFirst.mockRejectedValue(original);
    prisma.$disconnect.mockRejectedValue(new Error('Disconnect failed'));
    prisma.$connect.mockRejectedValue(new Error('Connect failed'));
    let failure: unknown;
    try {
      await repository.findPublicPageBySlug('letter');
    } catch (error: unknown) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(TransientPublicReadError);
    expect((failure as TransientPublicReadError).cause).toBe(original);
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
  });
});
