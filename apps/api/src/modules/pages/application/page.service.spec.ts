import type { PublicPageReadFailureLogger } from './public-page-read-failure-logger';
import { TransientPublicReadError } from './transient-public-read.error';
import type { PagesRepository } from './pages.repository';
import {
  PageService,
  InvalidSlugError,
  InvalidPageStateError,
  ConfirmationRequiredError,
  SlugAllocationFailedError,
  PageNotFoundError,
  PublicPageReadUnavailableError,
  TemplateRequirementError,
  SlugAlreadyTakenError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './page.service';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage, PublicPage } from '../domain/page.types';
import {
  chooseYourHeartDefaultGraph,
  chooseYourHeartTemplate,
  secretLetterTemplate,
  type TemplateAudioCapability,
} from '@letterly/templates';
import type { PageJourneyMetrics } from './page-journey-metrics';
import { PageJourneyValidationError } from './page-journeys.service';

const creatorId = 'creator-123';
const templateVersionId = 'b7e4b986-2b45-40bb-a13b-51357ac4816e';

const ownerPage: OwnerPage = {
  id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
  creatorId,
  slug: 'letter42',
  displaySlug: 'letter42',
  status: 'DRAFT',
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
    responsesEnabled: false,
  },
  template: {
    id: '0cf6b27e-7d7d-40e8-bc18-ef1cdff1cb16',
    key: 'secret-letter',
    name: 'Secret Letter',
    templateVersionId,
    version: 1,
    registryKey: 'confession.secret-letter',
  },
  createdAt: new Date('2026-08-09T00:00:00.000Z'),
  updatedAt: new Date('2026-08-09T00:00:00.000Z'),
};

describe('PageService', () => {
  let pagesRepository: jest.Mocked<PagesRepository>;
  let templateVersionReader: jest.Mocked<TemplateVersionReader>;
  let journeyMetrics: jest.Mocked<PageJourneyMetrics>;
  let service: PageService;
  let readFailureLogger: jest.Mocked<PublicPageReadFailureLogger>;

  beforeEach(() => {
    pagesRepository = {
      createDraft: jest.fn(),
      listPages: jest.fn(),
      findOwnedPage: jest.fn(),
      updateDraft: jest.fn(),
      deleteOwnedPage: jest.fn(),
      publishPage: jest.fn(),
      unpublishPage: jest.fn(),
      archivePage: jest.fn(),
      restorePage: jest.fn(),
      changePublishedSlug: jest.fn(),
      findPublicPageBySlug: jest.fn(),
    };

    templateVersionReader = {
      findActiveById: jest.fn(),
      findById: jest.fn(),
    };
    journeyMetrics = {
      record: jest.fn(),
    };

    readFailureLogger = { warn: jest.fn() };
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
    );
  });

  function chooseYourHeartPage(): OwnerPage {
    return {
      ...ownerPage,
      template: {
        ...ownerPage.template,
        key: 'choose-your-heart',
        registryKey: 'confession.choose-your-heart',
      },
    };
  }

  it('AC-1 creates a draft with trusted Secret Letter defaults', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
    });
    pagesRepository.createDraft.mockResolvedValue(ownerPage);

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).resolves.toEqual(ownerPage);

    expect(pagesRepository.createDraft.mock.calls).toEqual([
      [
        {
          template: { registryKey: 'confession.secret-letter', version: 1 },
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
          },
        },
      ],
    ]);
  });

  it('AC-1 applies optional recipient and message values to the defaults', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.secret-letter',
    });
    pagesRepository.createDraft.mockResolvedValue(ownerPage);

    await service.createDraft({
      creatorId,
      templateVersionId,
      recipientName: 'Juliet',
      mainMessage: 'You make ordinary days feel like poetry.',
    });

    expect(pagesRepository.createDraft.mock.calls).toEqual([
      [
        {
          template: { registryKey: 'confession.secret-letter', version: 1 },
          creatorId,
          templateVersionId,
          content: {
            recipientName: 'Juliet',
            mainMessage: 'You make ordinary days feel like poetry.',
            sections: [],
          },
          settings: {
            theme: 'romantic',
            fontStyle: 'handwritten',
            autoPlayMusic: false,
            music: null,
          },
        },
      ],
    ]);
  });

  it('creates the Choose Your Heart starter graph in the draft command', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 1,
      registryKey: 'confession.choose-your-heart',
    });
    pagesRepository.createDraft.mockResolvedValue(ownerPage);

    await service.createDraft({
      creatorId,
      templateVersionId,
    });

    const createInput = pagesRepository.createDraft.mock.calls.at(0)?.[0];
    expect(createInput?.template).toEqual({
      registryKey: 'confession.choose-your-heart',
      version: 1,
    });
    expect(createInput?.journey).toEqual({
      graph: chooseYourHeartDefaultGraph,
      maxDepth: 1,
    });
  });

  it('AC-10 rejects an inactive or missing template before creating a page', async () => {
    templateVersionReader.findActiveById.mockResolvedValue(null);

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).rejects.toBeInstanceOf(TemplateUnavailableError);

    expect(pagesRepository.createDraft.mock.calls).toHaveLength(0);
  });

  it('AC-10 rejects a database template version without a trusted definition', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      version: 999,
      registryKey: 'confession.secret-letter',
    });

    await expect(
      service.createDraft({
        creatorId,
        templateVersionId,
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);

    expect(pagesRepository.createDraft.mock.calls).toHaveLength(0);
  });

  it('rejects invalid registered journey defaults before writing and records bounded validation metrics', async () => {
    templateVersionReader.findActiveById.mockResolvedValue({
      id: templateVersionId,
      registryKey: chooseYourHeartTemplate.registryKey,
      version: 1,
    });
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      undefined,
      undefined,
      journeyMetrics,
    );
    const graph = chooseYourHeartTemplate.journey.defaultGraph;
    const originalRoot = graph.rootQuestionKey;
    try {
      graph.rootQuestionKey = 'missing-root';
      await expect(
        service.createDraft({ creatorId, templateVersionId }),
      ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
      expect(pagesRepository.createDraft.mock.calls).toHaveLength(0);
      expect(journeyMetrics.record.mock.calls).toEqual([
        [
          expect.objectContaining({
            event: 'journey_graph_validation',
            templateKey: 'choose-your-heart',
            outcome: 'invalid',
          }),
        ],
      ]);
    } finally {
      graph.rootQuestionKey = originalRoot;
    }
  });

  it('AC-3 updates only the editable fields for the owned draft', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue(ownerPage);
    pagesRepository.updateDraft.mockResolvedValue({
      type: 'updated',
      page: ownerPage,
    });

    await expect(
      service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: 'Juliet',
        mainMessage: 'A saved private letter.',
        expectedContentVersion: 0,
      }),
    ).resolves.toEqual(ownerPage);

    expect(pagesRepository.updateDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
          updateContent: expect.any(Function) as unknown,
          expectedContentVersion: 0,
        },
      ],
    ]);
  });

  it('AC-8 rejects a missing or non owned draft before updating', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue(null);

    await expect(
      service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: '',
        mainMessage: '',
        expectedContentVersion: 0,
      }),
    ).rejects.toBeInstanceOf(PageNotFoundError);

    expect(pagesRepository.updateDraft.mock.calls).toHaveLength(0);
  });

  it.each([secretLetterTemplate, chooseYourHeartTemplate])(
    'passes a pure updater and image inputs for $registryKey',
    async (definition) => {
      pagesRepository.findOwnedPage.mockResolvedValue({
        ...ownerPage,
        template: {
          ...ownerPage.template,
          registryKey: definition.registryKey,
          version: definition.version,
        },
      });
      pagesRepository.updateDraft.mockResolvedValue({
        type: 'updated',
        page: ownerPage,
      });
      const images = [{ imageId: 'image-1', sortOrder: 0, caption: '' }];
      await service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: 'Updated recipient',
        mainMessage: 'Updated message',
        title: '',
        creatorName: '',
        expectedContentVersion: 0,
        images,
      });
      const input = pagesRepository.updateDraft.mock.calls[0][0];
      expect(input).toEqual({
        creatorId,
        pageId: ownerPage.id,
        expectedContentVersion: 0,
        images,
        updateContent: expect.any(Function) as unknown,
      });
      const current = {
        recipientName: 'Current recipient',
        mainMessage: 'Current message',
        title: 'Current title',
        creatorName: 'Current creator',
        sections: [{ id: 'current', type: 'message' as const, order: 0 }],
      };
      expect(input.updateContent(current)).toEqual({
        ...current,
        recipientName: 'Updated recipient',
        mainMessage: 'Updated message',
        title: '',
        creatorName: '',
      });
    },
  );

  it('allows content updates while the page is published', async () => {
    const publishedPage = {
      ...ownerPage,
      status: 'PUBLISHED' as const,
    };
    pagesRepository.findOwnedPage.mockResolvedValue(publishedPage);
    pagesRepository.updateDraft.mockResolvedValue({
      type: 'updated',
      page: publishedPage,
    });

    await expect(
      service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: 'Juliet',
        mainMessage: 'A revised letter.',
        expectedContentVersion: publishedPage.contentVersion,
      }),
    ).resolves.toEqual(publishedPage);

    expect(pagesRepository.updateDraft.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: publishedPage.id,
          updateContent: expect.any(Function) as unknown,
          expectedContentVersion: publishedPage.contentVersion,
        },
      ],
    ]);
  });

  it('AC-4 exposes repository concurrency metadata for a stale save', async () => {
    const currentUpdatedAt = new Date('2026-08-09T03:00:00.000Z');
    pagesRepository.findOwnedPage.mockResolvedValue(ownerPage);
    pagesRepository.updateDraft.mockResolvedValue({
      type: 'stale',
      currentContentVersion: 3,
      currentUpdatedAt,
    });

    let error: unknown;

    try {
      await service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: 'Juliet',
        mainMessage: 'An older browser attempt.',
        expectedContentVersion: 2,
      });
    } catch (caught: unknown) {
      error = caught;
    }

    expect(error).toBeInstanceOf(StalePageVersionError);

    if (error instanceof StalePageVersionError) {
      expect(error.currentContentVersion).toBe(3);
      expect(error.currentUpdatedAt).toBe(currentUpdatedAt);
    }
  });

  it('AC-10 refuses to save when the trusted template definition is missing', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue({
      ...ownerPage,
      template: {
        ...ownerPage.template,
        registryKey: 'confession.missing',
      },
    });

    await expect(
      service.updateDraft({
        creatorId,
        pageId: ownerPage.id,
        recipientName: '',
        mainMessage: '',
        expectedContentVersion: 0,
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);

    expect(pagesRepository.updateDraft.mock.calls).toHaveLength(0);
  });

  it('AC-6 returns the owner projection for an existing trusted draft', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue(ownerPage);

    await expect(
      service.getOwnedPage({
        creatorId,
        pageId: ownerPage.id,
      }),
    ).resolves.toEqual(ownerPage);
  });

  it('AC-7 deletes an owned draft through the repository', async () => {
    pagesRepository.deleteOwnedPage.mockResolvedValue('deleted');

    await expect(
      service.deleteDraft({ creatorId, pageId: ownerPage.id }),
    ).resolves.toBeUndefined();

    expect(pagesRepository.deleteOwnedPage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
        },
      ],
    ]);
  });

  it('AC-7 maps an absent draft deletion to page not found', async () => {
    pagesRepository.deleteOwnedPage.mockResolvedValue('not_found');

    await expect(
      service.deleteDraft({ creatorId, pageId: ownerPage.id }),
    ).rejects.toBeInstanceOf(PageNotFoundError);
  });

  it('AC-8 rejects an absent owner page read', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue(null);

    await expect(
      service.getOwnedPage({
        creatorId,
        pageId: ownerPage.id,
      }),
    ).rejects.toBeInstanceOf(PageNotFoundError);
  });

  it('AC-1 publishes a complete saved letter with a normalized custom slug', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue({
      ...ownerPage,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
    });
    pagesRepository.publishPage.mockResolvedValue({
      type: 'updated',
      page: {
        ...ownerPage,
        status: 'PUBLISHED',
        slug: 'my-letter',
        displaySlug: 'my-letter',
      },
      publishedAt: new Date('2026-08-09T04:00:00.000Z'),
      unpublishedAt: null,
    });

    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        customSlug: '  My-Letter  ',
        confirmReady: true,
      }),
    ).resolves.toMatchObject({
      page: { status: 'PUBLISHED' },
    });

    expect(pagesRepository.publishPage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
          expectedContentVersion: ownerPage.contentVersion,
          customSlug: 'my-letter',
        },
      ],
    ]);
  });

  it('AC-17 records a bounded publish success metric for Choose Your Heart', async () => {
    const page = chooseYourHeartPage();
    const getOwned = jest.fn().mockResolvedValue({});
    const pageJourneyService = {
      getOwned,
    } as unknown as import('./page-journeys.service').PageJourneyService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      undefined,
      pageJourneyService,
      journeyMetrics,
    );
    pagesRepository.findOwnedPage.mockResolvedValue(page);
    pagesRepository.publishPage.mockResolvedValue({
      type: 'updated',
      page: { ...page, status: 'PUBLISHED' },
      publishedAt: new Date('2026-08-09T04:00:00.000Z'),
      unpublishedAt: null,
    });

    await service.publishPage({
      creatorId,
      pageId: page.id,
      customSlug: null,
      confirmReady: true,
    });

    expect(getOwned.mock.calls).toEqual([[{ creatorId, pageId: page.id }]]);
    expect(pagesRepository.publishPage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: page.id,
          expectedContentVersion: page.contentVersion,
          customSlug: null,
        },
      ],
    ]);

    expect(journeyMetrics.record.mock.calls).toContainEqual([
      {
        event: 'journey_publish',
        templateKey: 'choose-your-heart',
        outcome: 'published',
      },
    ]);
  });

  it('AC-17 records a rejected publish metric when journey validation fails', async () => {
    const page = chooseYourHeartPage();
    const pageJourneyService = {
      getOwned: jest.fn().mockRejectedValue(new PageJourneyValidationError([])),
    } as unknown as import('./page-journeys.service').PageJourneyService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      undefined,
      pageJourneyService,
      journeyMetrics,
    );
    pagesRepository.findOwnedPage.mockResolvedValue(page);

    await expect(
      service.publishPage({
        creatorId,
        pageId: page.id,
        customSlug: null,
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(PageJourneyValidationError);

    expect(journeyMetrics.record.mock.calls).toContainEqual([
      {
        event: 'journey_publish',
        templateKey: 'choose-your-heart',
        outcome: 'rejected',
      },
    ]);
    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
  });

  it.each([
    { registryKey: 'unknown', version: 1 },
    { registryKey: 'confession.secret-letter', version: 999 },
    { registryKey: 'confession.choose-your-heart', version: 999 },
  ])(
    'rejects unsupported publication identity %j before a write',
    async (identity) => {
      pagesRepository.findOwnedPage.mockResolvedValue({
        ...ownerPage,
        template: { ...ownerPage.template, ...identity },
      });
      await expect(
        service.publishPage({
          creatorId,
          pageId: ownerPage.id,
          confirmReady: true,
        }),
      ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
      expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
    },
  );

  it('rejects an unavailable journey service with a bounded unavailable metric', async () => {
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      undefined,
      undefined,
      journeyMetrics,
    );
    pagesRepository.findOwnedPage.mockResolvedValue(chooseYourHeartPage());
    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
    expect(journeyMetrics.record.mock.calls).toEqual([
      [
        {
          event: 'journey_publish',
          templateKey: 'choose-your-heart',
          outcome: 'unavailable',
        },
      ],
    ]);
  });

  it('requires confirmation before an owner read and never writes a missing owner page', async () => {
    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        confirmReady: false,
      }),
    ).rejects.toBeInstanceOf(ConfirmationRequiredError);
    expect(pagesRepository.findOwnedPage.mock.calls).toHaveLength(0);
    pagesRepository.findOwnedPage.mockResolvedValue(null);
    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(PageNotFoundError);
    expect(pagesRepository.findOwnedPage.mock.calls).toEqual([
      [{ creatorId, pageId: ownerPage.id }],
    ]);
    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
  });

  it('publishes a ready letter without reading a journey or emitting journey metrics', async () => {
    const getOwned = jest.fn();
    const pageJourneyService = {
      getOwned,
    } as unknown as import('./page-journeys.service').PageJourneyService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      undefined,
      pageJourneyService,
      journeyMetrics,
    );
    const page = {
      ...ownerPage,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A message.',
        sections: [],
      },
    };
    pagesRepository.findOwnedPage.mockResolvedValue(page);
    pagesRepository.publishPage.mockResolvedValue({
      type: 'updated',
      page: { ...page, status: 'PUBLISHED' },
      publishedAt: page.updatedAt,
      unpublishedAt: null,
    });
    await expect(
      service.publishPage({ creatorId, pageId: page.id, confirmReady: true }),
    ).resolves.toMatchObject({ page: { status: 'PUBLISHED' } });
    expect(getOwned.mock.calls).toHaveLength(0);
    expect(journeyMetrics.record.mock.calls).toHaveLength(0);
  });

  it.each([
    ['not_found', PageNotFoundError, 'not_found'],
    ['invalid_state', InvalidPageStateError, 'conflict'],
    ['template_requirement', TemplateRequirementError, 'rejected'],
    ['slug_already_taken', SlugAlreadyTakenError, 'conflict'],
    ['slug_allocation_failed', SlugAllocationFailedError, 'error'],
  ] as const)(
    'maps journey transaction result %s and preserves its metric outcome',
    async (type, expectedError, outcome) => {
      const getOwned = jest.fn().mockResolvedValue({});
      const pageJourneyService = {
        getOwned,
      } as unknown as import('./page-journeys.service').PageJourneyService;
      service = new PageService(
        pagesRepository,
        templateVersionReader,
        readFailureLogger,
        'http://localhost:3000',
        undefined,
        pageJourneyService,
        journeyMetrics,
      );
      pagesRepository.findOwnedPage.mockResolvedValue(chooseYourHeartPage());
      pagesRepository.publishPage.mockResolvedValue({ type });
      await expect(
        service.publishPage({
          creatorId,
          pageId: ownerPage.id,
          confirmReady: true,
        }),
      ).rejects.toBeInstanceOf(expectedError);
      expect(journeyMetrics.record.mock.calls).toEqual([
        [
          {
            event: 'journey_publish',
            templateKey: 'choose-your-heart',
            outcome,
          },
        ],
      ]);
    },
  );

  it('AC-1 rejects incomplete content before publishing', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue(ownerPage);

    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        customSlug: null,
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(TemplateRequirementError);

    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
  });

  it('AC-12 rejects publication when the trusted template requires audio', async () => {
    const template = secretLetterTemplate as unknown as {
      audioCapability: TemplateAudioCapability;
    };
    const previousCapability = template.audioCapability;
    template.audioCapability = 'required';
    pagesRepository.findOwnedPage.mockResolvedValue({
      ...ownerPage,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
    });

    try {
      await expect(
        service.publishPage({
          creatorId,
          pageId: ownerPage.id,
          customSlug: null,
          confirmReady: true,
        }),
      ).rejects.toBeInstanceOf(TemplateRequirementError);
    } finally {
      template.audioCapability = previousCapability;
    }

    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
  });

  it('AC-5 archives and restores a page through the repository state machine', async () => {
    pagesRepository.archivePage.mockResolvedValue({
      type: 'updated',
      page: { ...ownerPage, status: 'ARCHIVED' },
      publishedAt: null,
      unpublishedAt: null,
    });
    pagesRepository.restorePage.mockResolvedValue({
      type: 'updated',
      page: { ...ownerPage, status: 'DRAFT' },
      publishedAt: null,
      unpublishedAt: null,
    });

    await expect(
      service.archivePage({ creatorId, pageId: ownerPage.id }),
    ).resolves.toMatchObject({ page: { status: 'ARCHIVED' } });
    await expect(
      service.restorePage({ creatorId, pageId: ownerPage.id }),
    ).resolves.toMatchObject({ page: { status: 'DRAFT' } });

    expect(pagesRepository.archivePage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
        },
      ],
    ]);
    expect(pagesRepository.restorePage.mock.calls).toEqual([
      [
        {
          creatorId,
          pageId: ownerPage.id,
        },
      ],
    ]);
  });

  it('AC-2 rejects invalid and reserved custom slugs before mutation', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue({
      ...ownerPage,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
    });

    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        customSlug: 'not valid',
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(InvalidSlugError);

    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        customSlug: 'dashboard',
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(InvalidSlugError);

    expect(pagesRepository.publishPage.mock.calls).toHaveLength(0);
  });

  it('AC-6 maps the safe public page projection and hides internal fields', async () => {
    pagesRepository.findPublicPageBySlug.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalSlug: 'my-letter',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      audioLink: {
        id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        provider: 'YOUTUBE',
        videoId: 'dQw4w9WgXcQ',
        displayTitle: 'YouTube song',
        durationSeconds: null,
        metadataExpiresAt: null,
      },
    });

    await expect(service.getPublicPage(' My-Letter ')).resolves.toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
      audioLink: {
        id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        provider: 'YOUTUBE',
        videoId: 'dQw4w9WgXcQ',
        displayTitle: 'YouTube song',
        durationSeconds: null,
        metadataExpiresAt: null,
      },
    });
  });

  it('retries a transient database failure while reading a public page', async () => {
    const page = {
      displaySlug: 'my-letter',
      canonicalSlug: 'my-letter',
      template: { key: 'secret-letter' as const, version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
    };
    pagesRepository.findPublicPageBySlug
      .mockRejectedValueOnce(
        new TransientPublicReadError(
          Object.assign(new Error('connection pool timeout'), {
            code: 'P2024',
          }),
        ),
      )
      .mockResolvedValueOnce(page);

    await expect(service.getPublicPage('my-letter')).resolves.toMatchObject({
      displaySlug: page.displaySlug,
      template: page.template,
      recipientName: page.recipientName,
      mainMessage: page.mainMessage,
    });
    expect(pagesRepository.findPublicPageBySlug.mock.calls).toHaveLength(2);
  });

  it('returns a locked projection without content until the page proof is valid', async () => {
    pagesRepository.findPublicPageBySlug.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalSlug: 'my-letter',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
      recipientName: 'Juliet',
      mainMessage: '',
    });
    const passwordService = {
      findPublicProtection: jest.fn().mockResolvedValue({
        pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        passwordVersion: 'password-1',
      }),
      verifyUnlockToken: jest.fn().mockResolvedValue(false),
    } as unknown as import('./page-password.service').PagePasswordService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      passwordService,
    );

    await expect(
      service.getPublicPage('my-letter', () => null),
    ).resolves.toEqual({
      state: 'LOCKED',
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      recipientName: 'Juliet',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
    });
  });

  it('AC-6 returns the full projection only after the page-scoped proof validates', async () => {
    const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';
    const passwordVersion = 'password-1';
    const readUnlockToken = jest.fn().mockReturnValue('valid-token');
    pagesRepository.findPublicPageBySlug.mockResolvedValue({
      displaySlug: 'my-letter',
      canonicalSlug: 'my-letter',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
      recipientName: 'Juliet',
      mainMessage: 'A private message.',
    });
    const findPublicProtection = jest.fn().mockResolvedValue({
      pageId,
      passwordVersion,
    });
    const verifyUnlockToken = jest.fn().mockResolvedValue(true);
    const passwordService = {
      findPublicProtection,
      verifyUnlockToken,
    } as unknown as import('./page-password.service').PagePasswordService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      passwordService,
    );

    await expect(
      service.getPublicPage(' MY-LETTER ', readUnlockToken),
    ).resolves.toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: {
        registryKey: 'confession.secret-letter',
        key: 'secret-letter',
        version: 1,
      },
      recipientName: 'Juliet',
      mainMessage: 'A private message.',
      sections: [],
      images: [],
    });
    expect(findPublicProtection).toHaveBeenCalledWith('my-letter');
    expect(readUnlockToken).toHaveBeenCalledTimes(1);
    expect(readUnlockToken).toHaveBeenCalledWith(pageId);
    expect(verifyUnlockToken).toHaveBeenCalledWith(
      pageId,
      passwordVersion,
      'valid-token',
    );
  });

  it('AC-7 revokes page-scoped proofs when a page is unpublished or archived', async () => {
    const invalidatePageProofs = jest.fn().mockResolvedValue(undefined);
    const passwordService = {
      invalidatePageProofs,
    } as unknown as import('./page-password.service').PagePasswordService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      readFailureLogger,
      'http://localhost:3000',
      passwordService,
    );
    pagesRepository.unpublishPage.mockResolvedValue({
      type: 'updated',
      page: { ...ownerPage, status: 'UNPUBLISHED' },
      publishedAt: ownerPage.updatedAt,
      unpublishedAt: new Date('2026-08-09T05:00:00.000Z'),
    });
    pagesRepository.archivePage.mockResolvedValue({
      type: 'updated',
      page: { ...ownerPage, status: 'ARCHIVED' },
      publishedAt: null,
      unpublishedAt: null,
    });

    await service.unpublishPage({
      creatorId,
      pageId: ownerPage.id,
      confirm: true,
    });
    await service.archivePage({ creatorId, pageId: ownerPage.id });

    expect(invalidatePageProofs.mock.calls).toEqual([
      [ownerPage.id],
      [ownerPage.id],
    ]);
  });

  it('AC-13 maps a repository slug collision to a safe service error', async () => {
    pagesRepository.findOwnedPage.mockResolvedValue({
      ...ownerPage,
      content: {
        recipientName: 'Juliet',
        mainMessage: 'A public message.',
        sections: [],
      },
    });
    pagesRepository.publishPage.mockResolvedValue({
      type: 'slug_already_taken',
    });

    await expect(
      service.publishPage({
        creatorId,
        pageId: ownerPage.id,
        customSlug: 'taken-letter',
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(SlugAlreadyTakenError);
  });
  it.each(['unknown', 'confession.choose-your-heart', undefined])(
    'rejects a supplied public registry identity %s without renderer fallback',
    async (registryKey) => {
      pagesRepository.findPublicPageBySlug.mockResolvedValue({
        displaySlug: 'my-letter',
        canonicalSlug: 'my-letter',
        template: { key: 'secret-letter', version: 1, registryKey },
        recipientName: 'Juliet',
        mainMessage: 'A message.',
      });
      await expect(service.getPublicPage('my-letter')).rejects.toBeInstanceOf(
        TemplateDefinitionUnavailableError,
      );
    },
  );
  it('emits canonical registry identity from a uniquely resolvable legacy public journey', async () => {
    pagesRepository.findPublicPageBySlug.mockResolvedValue({
      displaySlug: 'my-journey',
      canonicalSlug: 'my-journey',
      template: { key: 'choose-your-heart', version: 1 },
      publishedGraphVersion: 1,
      rootQuestionKey: chooseYourHeartDefaultGraph.rootQuestionKey,
      maxDepth: 1,
      questions: chooseYourHeartDefaultGraph.questions.map((question) => ({
        ...question,
        choices: question.choices.map((choice) => ({
          ...choice,
          nextQuestionKey: choice.nextQuestionKey ?? null,
          outcomeKey: choice.outcomeKey ?? null,
        })),
      })),
      outcomes: chooseYourHeartDefaultGraph.outcomes,
    });
    await expect(service.getPublicPage('my-journey')).resolves.toMatchObject({
      template: {
        key: 'choose-your-heart',
        version: 1,
        registryKey: 'confession.choose-your-heart',
      },
    });
  });
  it.each([
    { mainMessage: '' },
    {
      audioLink: {
        id: 'invalid-media-id',
        provider: 'YOUTUBE',
        videoId: 'dQw4w9WgXcQ',
        displayTitle: 'Song',
        durationSeconds: null,
        metadataExpiresAt: null,
      },
    },
    { template: { key: 'choose-your-heart' as const, version: 1 } },
  ])(
    'maps malformed legacy public content to a safe unavailable error',
    async (overrides) => {
      pagesRepository.findPublicPageBySlug.mockResolvedValue({
        displaySlug: 'my-letter',
        canonicalSlug: 'my-letter',
        template: { key: 'secret-letter', version: 1 },
        recipientName: 'Juliet',
        mainMessage: 'A private message.',
        ...overrides,
      } as unknown as PublicPage);
      await expect(service.getPublicPage('my-letter')).rejects.toBeInstanceOf(
        PublicPageReadUnavailableError,
      );
    },
  );
  it.each(['page_repository', 'password_repository'] as const)(
    'bounds transient %s retries and logs only original error metadata',
    async (stage) => {
      jest.useFakeTimers();
      const timeout = jest.spyOn(global, 'setTimeout');
      const warn = readFailureLogger.warn;
      try {
        const original = Object.assign(
          new Error('Private message and password'),
          { code: 'P2024' },
        );
        const failure = new TransientPublicReadError(original);
        const read = jest.fn().mockRejectedValue(failure);
        pagesRepository.findPublicPageBySlug.mockResolvedValue({
          displaySlug: 'my-letter',
          canonicalSlug: 'my-letter',
          template: { key: 'secret-letter', version: 1 },
          recipientName: 'Juliet',
          mainMessage: 'A private message.',
        });
        if (stage === 'page_repository') {
          pagesRepository.findPublicPageBySlug.mockRejectedValue(failure);
        } else {
          service = new PageService(
            pagesRepository,
            templateVersionReader,
            readFailureLogger,
            'http://localhost:3000',
            {
              findPublicProtection: read,
            } as unknown as import('./page-password.service').PagePasswordService,
          );
        }
        const result = expect(
          service.getPublicPage('my-letter'),
        ).rejects.toBeInstanceOf(PublicPageReadUnavailableError);
        await jest.runAllTimersAsync();
        await result;
        const calls =
          stage === 'page_repository'
            ? pagesRepository.findPublicPageBySlug.mock.calls
            : read.mock.calls;
        expect(calls).toHaveLength(3);
        expect(timeout.mock.calls.map((call) => call[1])).toEqual([100, 200]);
        expect(warn.mock.calls).toEqual([
          [
            {
              event: 'public_page_read_failed',
              stage,
              errorName: 'Error',
              errorCode: 'P2024',
            },
          ],
        ]);
      } finally {
        timeout.mockRestore();
        warn.mockRestore();
        jest.useRealTimers();
      }
    },
  );

  it('does not interpret raw provider codes as an application retry decision', async () => {
    const warn = readFailureLogger.warn;
    try {
      pagesRepository.findPublicPageBySlug.mockRejectedValue(
        Object.assign(new Error('Untranslated provider failure'), {
          code: 'P2024',
        }),
      );
      await expect(service.getPublicPage('my-letter')).rejects.toBeInstanceOf(
        PublicPageReadUnavailableError,
      );
      expect(pagesRepository.findPublicPageBySlug.mock.calls).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
  });
});
