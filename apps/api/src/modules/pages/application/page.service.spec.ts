import type { PagesRepository } from './pages.repository';
import {
  PageService,
  InvalidSlugError,
  PageNotFoundError,
  TemplateRequirementError,
  SlugAlreadyTakenError,
  StalePageVersionError,
  TemplateDefinitionUnavailableError,
  TemplateUnavailableError,
} from './page.service';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage } from '../domain/page.types';
import { chooseYourHeartDefaultGraph } from '@letterly/templates';
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

    service = new PageService(pagesRepository, templateVersionReader);
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
            responsesEnabled: false,
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
          recipientName: 'Juliet',
          mainMessage: 'A saved private letter.',
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

  it('AC-5 lists only the authenticated creator drafts', async () => {
    const result = {
      items: [],
      nextCursor: null,
    };
    pagesRepository.listPages.mockResolvedValue(result);

    await expect(
      service.listPages({
        creatorId,
        size: 20,
        cursor: null,
      }),
    ).resolves.toEqual(result);

    expect(pagesRepository.listPages.mock.calls).toEqual([
      [
        {
          creatorId,
          size: 20,
          cursor: null,
        },
      ],
    ]);
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
    const pageJourneyService = {
      getOwned: jest.fn().mockResolvedValue({}),
    } as unknown as import('./page-journeys.service').PageJourneyService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
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
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
    });

    await expect(service.getPublicPage(' My-Letter ')).resolves.toEqual({
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A public message.',
      sections: [],
      images: [],
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
        Object.assign(new Error('connection pool timeout'), {
          code: 'P2024',
        }),
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
      template: { key: 'secret-letter', version: 1 },
      recipientName: 'Juliet',
      mainMessage: 'A private message.',
    });
    const passwordService = {
      findPublicProtection: jest.fn().mockResolvedValue({
        pageId: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        passwordVersion: 'password-1',
      }),
      verifyRequestCookie: jest.fn().mockResolvedValue(false),
    } as unknown as import('./page-password.service').PagePasswordService;
    service = new PageService(
      pagesRepository,
      templateVersionReader,
      'http://localhost:3000',
      passwordService,
    );

    await expect(
      service.getPublicPage('my-letter', 'letterly_unlock_invalid=value'),
    ).resolves.toEqual({
      state: 'LOCKED',
      displaySlug: 'my-letter',
      canonicalUrl: 'http://localhost:3000/p/my-letter',
      template: { key: 'secret-letter', version: 1 },
    });
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
});
