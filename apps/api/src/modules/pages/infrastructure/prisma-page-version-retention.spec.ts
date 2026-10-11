import type { PrismaClient } from '@letterly/database';
import { PrismaPagesRepository } from './prisma-pages.repository';
import { TemplateDefinitionUnavailableError } from '../application/template-definition-unavailable.error';
import { adapterEvents } from './testing/template-versions.fixture';
import { resolveFixtureDraftPolicy } from '../application/testing/template-versions.fixture';

jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));
jest.mock('@letterly/templates', () => ({
  ...jest.requireActual<typeof import('@letterly/templates')>(
    '@letterly/templates',
  ),
  resolveTemplate: jest.requireActual<
    typeof import('../application/testing/template-versions.fixture')
  >('../application/testing/template-versions.fixture').resolveFixtureTemplate,
}));
jest.mock('@letterly/templates/catalog-resolution', () => ({
  ...jest.requireActual<
    typeof import('@letterly/templates/catalog-resolution')
  >('@letterly/templates/catalog-resolution'),
  resolveCatalogTemplate: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixtureCatalog,
}));
jest.mock('./templates/draft-persistence-adapters', () => ({
  resolveDraftPersistenceAdapter: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixtureDraft,
}));
jest.mock('./templates/publication-adapters', () => ({
  resolvePublicationAdapter: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixturePublication,
}));
jest.mock('./templates/owner-projection-adapters', () => ({
  resolveOwnerProjectionAdapter: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixtureOwner,
}));
jest.mock('./templates/public-projection-adapters', () => ({
  resolvePublicProjectionAdapter: jest.requireActual<
    typeof import('./testing/template-versions.fixture')
  >('./testing/template-versions.fixture').resolveFixturePublic,
}));

function record(version: number) {
  return {
    id: `page-v${version}`,
    creatorId: 'owner',
    slug: 'retained1',
    displaySlug: 'retained1',
    status: 'DRAFT',
    contentVersion: 0,
    publishedAt: null,
    unpublishedAt: null,
    createdAt: new Date('2026-10-03T00:00:00Z'),
    updatedAt: new Date('2026-10-03T00:00:00Z'),
    content: {
      recipientName: 'Recipient',
      mainMessage: 'Saved message',
      sections: [],
    },
    settings: {
      theme: 'romantic',
      fontStyle: 'handwritten',
      autoPlayMusic: false,
      music: null,
    },
    templateVersion: {
      id: `version-id-${version}`,
      registryKey: `fixture.secret-letter.v${version}`,
      version,
      template: {
        id: 'family',
        key: 'secret-letter',
        name: 'Newer family name',
      },
    },
  };
}
function database() {
  const prisma = {
    page: {
      create: jest.fn<Promise<unknown>, [input: unknown]>(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [input: { data: Record<string, unknown> }]
      >(),
    },
    pageSlugReservation: { findFirst: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (operation: (transaction: typeof prisma) => Promise<unknown>) =>
      operation(prisma),
  );
  return prisma;
}

describe('PrismaPagesRepository coexisting version dispatch', () => {
  beforeEach(() => {
    adapterEvents.length = 0;
  });

  it.each([1, 2])(
    'creates version %i through its persistence adapter and preserves its ID',
    async (version) => {
      const prisma = database();
      const page = record(version);
      prisma.page.create.mockResolvedValue(page);
      const repository = new PrismaPagesRepository(
        prisma as unknown as PrismaClient,
      );
      const owner = await repository.createDraft({
        creatorId: 'owner',
        templateVersionId: page.templateVersion.id,
        template: { registryKey: page.templateVersion.registryKey, version },
        content: page.content,
        settings: {
          theme: 'romantic',
          fontStyle: 'handwritten',
          autoPlayMusic: false,
          music: null,
        },
      });
      expect(prisma.page.create.mock.calls[0]?.[0]).toMatchObject({
        data: {
          templateVersionId: page.templateVersion.id,
          content: { title: `Persisted v${version}` },
        },
      });
      expect(owner.template).toMatchObject({
        templateVersionId: page.templateVersion.id,
        registryKey: page.templateVersion.registryKey,
        version,
        name: `Retained v${version}`,
      });
      expect(owner.content.title).toBe(`Owner v${version}`);
      expect(adapterEvents).toEqual([
        { stage: 'before-page', version, transaction: prisma },
        { stage: 'after-page', version, transaction: prisma, pageId: page.id },
      ]);
    },
  );

  it.each([1, 2])(
    'projects owner, summary, and public records with saved version %i',
    async (version) => {
      const prisma = database();
      const page = record(version);
      prisma.page.findFirst.mockResolvedValue(page);
      prisma.page.findMany.mockResolvedValue([page]);
      const repository = new PrismaPagesRepository(
        prisma as unknown as PrismaClient,
      );
      const owner = await repository.findOwnedPage({
        creatorId: 'owner',
        pageId: page.id,
      });
      const summaries = await repository.listPages({
        creatorId: 'owner',
        size: 10,
        cursor: null,
      });
      const publicPage = await repository.findPublicPageBySlug(page.slug);
      expect(owner?.content.title).toBe(`Owner v${version}`);
      expect(summaries.items[0]?.preview?.title).toBe(`Summary v${version}`);
      expect(summaries.items[0]?.template.name).toBe(`Retained v${version}`);
      expect(publicPage).toMatchObject({
        title: `Public persistence v${version}`,
        template: { registryKey: page.templateVersion.registryKey, version },
      });
      expect(prisma.page.updateMany.mock.calls).toEqual([]);
    },
  );

  it.each([1, 2])(
    'publishes saved version %i with its own transaction operation',
    async (version) => {
      const prisma = database();
      const page = record(version);
      prisma.page.findFirst.mockResolvedValueOnce(page);
      prisma.page.findFirst.mockResolvedValueOnce({
        ...page,
        status: 'PUBLISHED',
        contentVersion: version === 2 ? 1 : 0,
        publishedAt: page.updatedAt,
      });
      prisma.pageSlugReservation.findFirst.mockResolvedValue({
        id: 'reservation',
        normalizedSlug: page.slug,
      });
      prisma.page.updateMany.mockImplementation(() => {
        expect(adapterEvents.map(({ stage }) => stage)).toEqual([
          'prepare-publication',
        ]);
        return Promise.resolve({ count: 1 });
      });
      const repository = new PrismaPagesRepository(
        prisma as unknown as PrismaClient,
      );
      const result = await repository.publishPage({
        creatorId: 'owner',
        pageId: page.id,
        expectedContentVersion: 0,
        customSlug: null,
      });
      expect(result).toMatchObject({
        type: 'updated',
        page: {
          template: { templateVersionId: page.templateVersion.id, version },
        },
      });
      const update = prisma.page.updateMany.mock.calls[0]?.[0];
      expect(update?.data).toMatchObject({ status: 'PUBLISHED' });
      expect(update?.data.contentVersion).toEqual(
        version === 2 ? { increment: 1 } : undefined,
      );
      expect(update?.data).not.toHaveProperty('templateVersionId');
      expect(adapterEvents).toEqual([
        {
          stage: 'prepare-publication',
          version,
          transaction: prisma,
          pageId: page.id,
        },
        {
          stage: 'commit-publication',
          version,
          transaction: prisma,
          pageId: page.id,
        },
      ]);
    },
  );

  it('does not commit version work after a failed conditional publication write', async () => {
    const prisma = database();
    const page = record(1);
    prisma.page.findFirst.mockResolvedValue(page);
    prisma.pageSlugReservation.findFirst.mockResolvedValue({
      id: 'reservation',
      normalizedSlug: page.slug,
    });
    prisma.page.updateMany.mockResolvedValue({ count: 0 });
    const repository = new PrismaPagesRepository(
      prisma as unknown as PrismaClient,
    );
    expect(
      await repository.publishPage({
        creatorId: 'owner',
        pageId: page.id,
        expectedContentVersion: 0,
        customSlug: null,
      }),
    ).toEqual({ type: 'invalid_state' });
    expect(adapterEvents.map(({ stage }) => stage)).toEqual([
      'prepare-publication',
    ]);
  });

  it.each([1, 2])(
    'persists the version %i updater result without changing saved identity',
    async (version) => {
      const prisma = database();
      const page = record(version);
      prisma.page.findFirst.mockResolvedValue(page);
      prisma.page.updateMany.mockResolvedValue({ count: 1 });
      const policy = resolveFixtureDraftPolicy({
        registryKey: page.templateVersion.registryKey,
        version,
      });
      if (!policy) throw new Error('Missing fixture draft policy');
      const repository = new PrismaPagesRepository(
        prisma as unknown as PrismaClient,
      );
      await repository.updateDraft({
        creatorId: 'owner',
        pageId: page.id,
        expectedContentVersion: 0,
        updateContent: (current) =>
          policy.update(current, {
            recipientName: 'Edited recipient',
            mainMessage: 'Edited message',
          }),
      });
      expect(prisma.page.updateMany.mock.calls[0]?.[0]).toMatchObject({
        data: {
          content: {
            title: `Updated by v${version}`,
            mainMessage: 'Edited message',
          },
          contentVersion: { increment: 1 },
        },
      });
      expect(prisma.page.updateMany.mock.calls[0]?.[0].data).not.toHaveProperty(
        'templateVersionId',
      );
    },
  );

  it('rejects a mismatched stored version before draft post creation work', async () => {
    const prisma = database();
    const page = record(2);
    prisma.page.create.mockResolvedValue(page);
    const repository = new PrismaPagesRepository(
      prisma as unknown as PrismaClient,
    );
    await expect(
      repository.createDraft({
        creatorId: 'owner',
        templateVersionId: page.templateVersion.id,
        template: { registryKey: 'fixture.secret-letter.v1', version: 1 },
        content: page.content,
        settings: {
          theme: 'romantic',
          fontStyle: 'handwritten',
          autoPlayMusic: false,
          music: null,
        },
      }),
    ).rejects.toBeInstanceOf(TemplateDefinitionUnavailableError);
    expect(adapterEvents.map(({ stage }) => stage)).toEqual(['before-page']);
  });
});
