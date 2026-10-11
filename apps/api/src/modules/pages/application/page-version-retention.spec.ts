import type { PagesRepository } from './pages.repository';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage } from '../domain/page.types';
import {
  PageService,
  TemplateUnavailableError,
  TemplateDefinitionUnavailableError,
  TemplateRequirementError,
} from './page.service';

jest.mock('@letterly/templates', () => ({
  ...jest.requireActual<typeof import('@letterly/templates')>(
    '@letterly/templates',
  ),
  resolveTemplate: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixtureTemplate,
}));
jest.mock('./templates/draft-policies', () => ({
  resolveDraftPolicy: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixtureDraftPolicy,
}));
jest.mock('./templates/publish-policies', () => ({
  resolvePublishPolicy: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixturePublishPolicy,
}));
jest.mock('./projections/public-projection-adapters', () => ({
  resolvePublicProjectionAdapter: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixturePublicAdapter,
}));

function savedPage(version: number): OwnerPage {
  return {
    id: `page-v${version}`,
    creatorId: 'owner',
    slug: `version${version}`,
    displaySlug: `version${version}`,
    status: 'DRAFT',
    contentVersion: 0,
    content: {
      recipientName: 'Recipient',
      mainMessage: `Ready for v${version}`,
      sections: [],
    },
    settings: {
      theme: 'romantic',
      fontStyle: 'handwritten',
      autoPlayMusic: false,
      music: null,
    },
    template: {
      id: 'shared-family',
      key: 'secret-letter',
      name: `Fixture v${version}`,
      templateVersionId: `version-id-${version}`,
      version,
      registryKey: `fixture.secret-letter.v${version}`,
    },
    createdAt: new Date('2026-10-03T00:00:00Z'),
    updatedAt: new Date('2026-10-03T00:00:00Z'),
  };
}

describe('PageService retained versions with coexisting registrations', () => {
  const repository: jest.Mocked<PagesRepository> = {
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
  const reader: jest.Mocked<TemplateVersionReader> = {
    findActiveById: jest.fn(),
    findById: jest.fn(),
  };
  const service = new PageService(repository, reader, { warn: jest.fn() });

  beforeEach(() => jest.resetAllMocks());

  it.each([1, 2])(
    'initializes version %i with its own defaults and saved version ID',
    async (version) => {
      const page = savedPage(version);
      reader.findActiveById.mockResolvedValue({
        id: page.template.templateVersionId,
        registryKey: page.template.registryKey,
        version,
      });
      repository.createDraft.mockResolvedValue(page);
      await service.createDraft({
        creatorId: 'owner',
        templateVersionId: page.template.templateVersionId,
      });
      expect(repository.createDraft.mock.calls[0]?.[0]).toMatchObject({
        template: { registryKey: page.template.registryKey, version },
        templateVersionId: page.template.templateVersionId,
        content: {
          recipientName: `Recipient v${version}`,
          mainMessage: `Default v${version}`,
        },
      });
    },
  );

  it.each([1, 2])(
    'updates saved version %i through its policy even when new draft eligibility is absent',
    async (version) => {
      const page = savedPage(version);
      repository.findOwnedPage.mockResolvedValue(page);
      repository.updateDraft.mockImplementation(
        (input: Parameters<PagesRepository['updateDraft']>[0]) =>
          Promise.resolve({
            type: 'updated',
            page: { ...page, content: input.updateContent(page.content) },
          }),
      );
      const updated = await service.updateDraft({
        creatorId: 'owner',
        pageId: page.id,
        expectedContentVersion: 0,
        recipientName: 'Edited recipient',
        mainMessage: 'Edited message',
      });
      expect(updated.content).toMatchObject({
        title: `Updated by v${version}`,
        mainMessage: 'Edited message',
      });
      expect(updated.template).toEqual(page.template);
      expect(reader.findActiveById.mock.calls).toEqual([]);
    },
  );

  it.each([1, 2])(
    'publishes saved version %i using its readiness rule',
    async (version) => {
      const page = savedPage(version);
      repository.findOwnedPage.mockResolvedValue(page);
      repository.publishPage.mockResolvedValue({
        type: 'updated',
        page: { ...page, status: 'PUBLISHED' },
        publishedAt: page.updatedAt,
        unpublishedAt: null,
      });
      await service.publishPage({
        creatorId: 'owner',
        pageId: page.id,
        confirmReady: true,
      });
      expect(repository.publishPage.mock.calls).toHaveLength(1);
      expect(reader.findActiveById.mock.calls).toEqual([]);
      page.content.mainMessage = `Ready for v${version === 1 ? 2 : 1}`;
      await expect(
        service.publishPage({
          creatorId: 'owner',
          pageId: page.id,
          confirmReady: true,
        }),
      ).rejects.toBeInstanceOf(TemplateRequirementError);
      expect(repository.publishPage.mock.calls).toHaveLength(1);
    },
  );

  it.each([1, 2])(
    'returns saved owner and public version %i through exact identities',
    async (version) => {
      const page = savedPage(version);
      repository.findOwnedPage.mockResolvedValue(page);
      expect(
        await service.getOwnedPage({ creatorId: 'owner', pageId: page.id }),
      ).toEqual(page);
      repository.findPublicPageBySlug.mockResolvedValue({
        displaySlug: page.displaySlug,
        canonicalSlug: page.slug,
        template: {
          registryKey: page.template.registryKey,
          key: 'secret-letter',
          version,
        },
        recipientName: page.content.recipientName,
        mainMessage: page.content.mainMessage,
      });
      expect(await service.getPublicPage(page.slug)).toMatchObject({
        title: `Public v${version}`,
        template: { registryKey: page.template.registryKey, version },
        canonicalUrl: `http://localhost:3000/p/${page.slug}`,
      });
    },
  );

  it('rejects unavailable new drafts before writing', async () => {
    reader.findActiveById.mockResolvedValue(null);
    await expect(
      service.createDraft({
        creatorId: 'owner',
        templateVersionId: 'retired-v1',
      }),
    ).rejects.toBeInstanceOf(TemplateUnavailableError);
    expect(repository.createDraft.mock.calls).toEqual([]);
  });

  it('rejects a mismatched saved version before updating or publishing', async () => {
    const page = savedPage(1);
    page.template.version = 2;
    repository.findOwnedPage.mockResolvedValue(page);
    await expect(
      service.updateDraft({
        creatorId: 'owner',
        pageId: page.id,
        expectedContentVersion: 0,
        recipientName: 'Recipient',
        mainMessage: 'Message',
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    await expect(
      service.publishPage({
        creatorId: 'owner',
        pageId: page.id,
        confirmReady: true,
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    expect(repository.updateDraft.mock.calls).toEqual([]);
    expect(repository.publishPage.mock.calls).toEqual([]);
  });

  it('rejects an active database identity absent from trusted registrations before creation', async () => {
    reader.findActiveById.mockResolvedValue({
      id: 'unknown-version',
      registryKey: 'fixture.secret-letter.v3',
      version: 3,
    });
    await expect(
      service.createDraft({
        creatorId: 'owner',
        templateVersionId: 'unknown-version',
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    expect(repository.createDraft.mock.calls).toEqual([]);
  });

  it('rejects conflicting public identities instead of substituting the newer adapter', async () => {
    repository.findPublicPageBySlug.mockResolvedValue({
      displaySlug: 'version1',
      canonicalSlug: 'version1',
      template: {
        registryKey: 'fixture.secret-letter.v1',
        key: 'secret-letter',
        version: 2,
      },
      recipientName: 'Recipient',
      mainMessage: 'Private fixture message',
    });
    await expect(service.getPublicPage('version1')).rejects.toBeInstanceOf(
      TemplateDefinitionUnavailableError,
    );
  });
});
