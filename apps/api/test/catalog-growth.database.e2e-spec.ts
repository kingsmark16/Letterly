import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { PrismaCatalogRepository } from '../src/modules/catalog/infrastructure/prisma-catalog.repository';
import { PrismaPageSubmissionsRepository } from '../src/modules/pages/infrastructure/prisma-page-submissions.repository';

const describePlans =
  process.env.RUN_QUERY_PLAN_TESTS === '1' ? describe : describe.skip;

describePlans('Catalog and submission growth on disposable PostgreSQL', () => {
  jest.setTimeout(45_000);
  let prisma: PrismaClient;
  const fixtureKey = `query-plan-${randomUUID()}`;
  const categoryIds = Array.from({ length: 24 }, () => randomUUID());
  const families = categoryIds.flatMap((categoryId, categoryIndex) =>
    Array.from({ length: 25 }, (_, index) => ({
      id: randomUUID(),
      categoryId,
      key: `family-${index}`,
      name: `Growth fixture ${categoryIndex} ${index}`,
      displayOrder: index,
    })),
  );
  const creatorId = `plan-owner-${randomUUID()}`;
  const pageId = randomUUID();

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/letterly_query_plan_test'
    ) {
      throw new Error(
        'Query plan fixtures require the dedicated localhost letterly_query_plan_test database',
      );
    }
    prisma = getPrismaClient();
    await prisma.category.createMany({
      data: categoryIds.map((id, index) => ({
        id,
        key: `${fixtureKey}-${index}`,
        name: `Growth category ${index}`,
        displayOrder: index + 100,
      })),
    });
    await prisma.template.createMany({ data: families });
    await prisma.templateVersion.createMany({
      data: families.flatMap(({ id }) =>
        [1, 2, 3].map((version) => ({
          templateId: id,
          version,
          registryKey: `${fixtureKey}-${id}-v${version}`,
        })),
      ),
    });
    const template = await prisma.templateVersion.findFirstOrThrow({
      where: { registryKey: 'confession.secret-letter' },
      select: { id: true },
    });
    await prisma.user.create({
      data: {
        id: creatorId,
        name: 'Plan owner',
        email: `${creatorId}@letterly.test`,
      },
    });
    await prisma.page.create({
      data: {
        id: pageId,
        creatorId,
        templateVersionId: template.id,
        slug: fixtureKey,
        displaySlug: fixtureKey,
        content: {},
        settings: {},
      },
    });
    await prisma.visitorSubmission.createMany({
      data: Array.from({ length: 2000 }, (_, index) => ({
        pageId,
        browserTokenHash: `browser-${index}`,
        idempotencyKey: `key-${index}`,
        idempotencyPayloadHash: `hash-${index}`,
        readState: index % 2 === 0 ? ('UNREAD' as const) : ('READ' as const),
        submittedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
      })),
    });
    await prisma.$executeRawUnsafe('ANALYZE');
    await prisma.$executeRawUnsafe(
      "ALTER SYSTEM SET auto_explain.log_min_duration = '0'",
    );
    await prisma.$queryRaw`SELECT pg_reload_conf()`;
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      await prisma.$executeRawUnsafe(
        "ALTER SYSTEM SET auto_explain.log_min_duration = '100000000'",
      );
      await prisma.$queryRaw`SELECT pg_reload_conf()`;
      await prisma.user.deleteMany({ where: { id: creatorId } });
      await prisma.templateVersion.deleteMany({
        where: { templateId: { in: families.map(({ id }) => id) } },
      });
      await prisma.template.deleteMany({
        where: { categoryId: { in: categoryIds } },
      });
      await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    } finally {
      await disconnectPrisma();
    }
  });

  it('returns four previews per fixture category and one current version per family', async () => {
    const rows = await new PrismaCatalogRepository(prisma).listOverview(4);
    const fixtureRows = rows.filter(({ key }) => key.startsWith(fixtureKey));
    expect(fixtureRows).toHaveLength(24);
    for (const category of fixtureRows) {
      expect(category.templates).toHaveLength(4);
      expect(
        category.templates.every(
          ({ currentVersion }) => currentVersion?.version === 3,
        ),
      ).toBe(true);
    }
  });

  it('bounds first, deep, reverse, category, and search pages to size plus one', async () => {
    const repository = new PrismaCatalogRepository(prisma);
    const first = await repository.listTemplatePage({
      size: 20,
      direction: 'after',
    });
    expect(first).toHaveLength(21);
    const deepAnchor = families
      .filter(({ displayOrder }) => displayOrder === 20)
      .sort((a, b) => a.id.localeCompare(b.id))[12];
    if (!deepAnchor) throw new Error('Missing deep catalog fixture anchor');
    const position = {
      displayOrder: deepAnchor.displayOrder,
      id: deepAnchor.id,
    };
    for (const direction of ['after', 'before'] as const) {
      expect(
        await repository.listTemplatePage({ size: 20, direction, position }),
      ).toHaveLength(21);
    }
    const category = await repository.listTemplatePage({
      categoryId: categoryIds[0],
      size: 20,
      direction: 'after',
    });
    expect(category).toHaveLength(21);
    const search = await repository.listTemplatePage({
      query: 'Growth fixture',
      size: 20,
      direction: 'after',
    });
    expect(search).toHaveLength(21);
    expect(search.every(({ name }) => name.startsWith('Growth fixture'))).toBe(
      true,
    );
  });

  it('returns at most 50 submission summaries while retaining the exact unread total', async () => {
    const repository = new PrismaPageSubmissionsRepository(prisma);
    const first = await repository.listOwned({
      creatorId,
      pageId,
      size: 50,
      filter: 'all',
      cursor: null,
    });
    if ('type' in first) throw new Error('Missing owned submission fixture');
    expect(first.items).toHaveLength(50);
    expect(first.unreadCount).toBe(1000);
    expect(first.nextCursor).not.toBeNull();
    const next = await repository.listOwned({
      creatorId,
      pageId,
      size: 50,
      filter: 'unread',
      cursor: first.nextCursor,
    });
    if ('type' in next) throw new Error('Missing owned submission fixture');
    expect(next.items).toHaveLength(50);
    expect(next.items.every(({ readState }) => readState === 'UNREAD')).toBe(
      true,
    );
    expect(
      next.items.some(({ id }) => first.items.some((item) => item.id === id)),
    ).toBe(false);
    expect(next.unreadCount).toBe(1000);
  });
});
