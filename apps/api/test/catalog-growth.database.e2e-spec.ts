import { randomUUID } from 'node:crypto';
import { DbNull } from '@letterly/database/json';
import { jest } from '@jest/globals';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import { PrismaCatalogRepository } from '../src/modules/catalog/infrastructure/prisma-catalog.repository';
import { PrismaPageSubmissionsRepository } from '../src/modules/pages/infrastructure/prisma-page-submissions.repository';
import { backfillJourneyAnswerCounts } from '../src/modules/pages/infrastructure/backfill-journey-answer-counts';

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
  const unrelatedPageId = randomUUID();
  const submissionIds: string[] = Array.from({ length: 2000 }, () =>
    randomUUID(),
  );
  const questionIds = Array.from({ length: 5 }, () => randomUUID());
  const journeySnapshot = {
    revisionNumber: 1,
    answers: Array.from({ length: 4 }, (_, index) => ({
      questionKey: `question-${index}`,
      prompt: 'p'.repeat(200),
      choiceKey: `choice-${index}`,
      choiceLabel: 'c'.repeat(80),
    })),
    outcomeKey: 'result',
    outcomeTitle: 't'.repeat(120),
    outcomeMessage: 'm'.repeat(2000),
  };

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
        id: submissionIds[index],
        pageId,
        browserTokenHash: `browser-${index}`,
        idempotencyKey: `key-${index}`,
        idempotencyPayloadHash: `hash-${index}`,
        readState: index % 2 === 0 ? ('UNREAD' as const) : ('READ' as const),
        submittedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
        ...(index % 3 === 1 ? { journeySnapshot } : {}),
        journeyAnswerCount: index % 3 === 1 ? 4 : 0,
      })),
    });
    await prisma.pageQuestion.createMany({
      data: questionIds.map((id, index) => ({
        id,
        pageId,
        key: `question-${index}`,
        type: 'PLAIN_MESSAGE' as const,
        prompt: `Fixture prompt ${index}`,
        displayOrder: index,
      })),
    });
    await prisma.visitorAnswer.createMany({
      data: submissionIds.flatMap((submissionId, index) =>
        index % 3 === 0
          ? questionIds.map((questionId, answerOrder) => ({
              submissionId,
              questionId,
              promptSnapshot: 'p'.repeat(200),
              textAnswer: 'a'.repeat(1000),
              answerOrder,
            }))
          : [],
      ),
    });
    await prisma.visitorMessage.createMany({
      data: submissionIds.flatMap((submissionId, index) =>
        index % 2 === 0
          ? [
              {
                submissionId,
                promptSnapshot: 'Fixture message',
                message: 'm'.repeat(2000),
              },
            ]
          : [],
      ),
    });
    await prisma.page.create({
      data: {
        id: unrelatedPageId,
        creatorId,
        templateVersionId: template.id,
        slug: `${fixtureKey}-unrelated`,
        displaySlug: `${fixtureKey}-unrelated`,
        content: {},
        settings: {},
      },
    });
    const unrelatedQuestionId = randomUUID();
    await prisma.pageQuestion.create({
      data: {
        id: unrelatedQuestionId,
        pageId: unrelatedPageId,
        key: 'unrelated',
        type: 'PLAIN_MESSAGE',
        prompt: 'Unrelated fixture',
        displayOrder: 0,
      },
    });
    const unrelatedIds = Array.from({ length: 2000 }, () => randomUUID());
    await prisma.visitorSubmission.createMany({
      data: unrelatedIds.map((id, index) => ({
        id,
        pageId: unrelatedPageId,
        browserTokenHash: `unrelated-${index}`,
        idempotencyKey: `unrelated-${index}`,
        idempotencyPayloadHash: `unrelated-${index}`,
        journeyAnswerCount: 0,
      })),
    });
    await prisma.visitorAnswer.createMany({
      data: unrelatedIds.map((submissionId) => ({
        submissionId,
        questionId: unrelatedQuestionId,
        promptSnapshot: 'Unrelated fixture',
        textAnswer: 'a'.repeat(1000),
        answerOrder: 0,
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
      await prisma.visitorSubmission.deleteMany({
        where: { pageId: { in: [pageId, unrelatedPageId] } },
      });
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
    for (const item of first.items) {
      const index = submissionIds.indexOf(item.id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(item.answerCount).toBe(
        index % 3 === 0 ? 5 : index % 3 === 1 ? 4 : 0,
      );
      expect(item.hasVisitorMessage).toBe(index % 2 === 0);
      expect(item).not.toHaveProperty('journeySnapshot');
      expect(item).not.toHaveProperty('answers');
      expect(item).not.toHaveProperty('visitorMessage');
    }
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

  it('retains empty active categories and excludes inactive categories and versionless families', async () => {
    const repository = new PrismaCatalogRepository(prisma);
    const emptyId = randomUUID();
    categoryIds.push(emptyId);
    await prisma.category.create({
      data: {
        id: emptyId,
        key: `${fixtureKey}-empty`,
        name: 'Empty fixture',
        displayOrder: 999,
      },
    });
    const versionless = {
      id: randomUUID(),
      categoryId: emptyId,
      key: 'no-version',
      name: 'No active version',
      displayOrder: 0,
    };
    families.push(versionless);
    await prisma.template.create({ data: versionless });
    expect(
      (await repository.listOverview(4)).find(
        ({ key }) => key === `${fixtureKey}-empty`,
      )?.templates,
    ).toEqual([]);
    expect(
      await repository.listTemplatePage({
        categoryId: emptyId,
        size: 20,
        direction: 'after',
      }),
    ).toEqual([]);
    await prisma.category.update({
      where: { id: emptyId },
      data: { status: 'INACTIVE' },
    });
    expect(
      (await repository.listOverview(4)).some(
        ({ key }) => key === `${fixtureKey}-empty`,
      ),
    ).toBe(false);
    expect(
      await repository.findTemplateLookup({
        key: 'no-version',
        categoryKey: `${fixtureKey}-empty`,
      }),
    ).toEqual([]);
  });

  it('selects the highest active version and preserves exact lookup misses and ambiguity bounds', async () => {
    const family = families[0];
    if (!family) throw new Error('Missing version fixture');
    const repository = new PrismaCatalogRepository(prisma);
    await prisma.templateVersion.updateMany({
      where: { templateId: family.id, version: 3 },
      data: { status: 'INACTIVE' },
    });
    try {
      const current = await repository.findTemplateLookup({
        key: family.key,
        categoryKey: `${fixtureKey}-0`,
      });
      expect(current[0]?.selectedVersion?.version).toBe(2);
      const missing = await repository.findTemplateLookup({
        key: family.key,
        categoryKey: `${fixtureKey}-0`,
        version: 3,
      });
      expect(missing[0]?.selectedVersion).toBeNull();
      expect(
        await repository.findTemplateLookup({ key: family.key }),
      ).toHaveLength(2);
    } finally {
      await prisma.templateVersion.updateMany({
        where: { templateId: family.id, version: 3 },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it('uses a removed anchor position and maintains tuple ordering across tied family orders', async () => {
    const repository = new PrismaCatalogRepository(prisma);
    const rows = await repository.listTemplatePage({
      size: 50,
      direction: 'after',
    });
    const anchor = rows[19];
    if (!anchor) throw new Error('Missing tied ordering anchor');
    await prisma.template.update({
      where: { id: anchor.id },
      data: { status: 'INACTIVE' },
    });
    try {
      const position = { displayOrder: anchor.displayOrder, id: anchor.id };
      const after = await repository.listTemplatePage({
        size: 20,
        direction: 'after',
        position,
      });
      expect(after.map(({ id }) => id)).toEqual(
        rows.slice(20, 41).map(({ id }) => id),
      );
      const before = await repository.listTemplatePage({
        size: 20,
        direction: 'before',
        position,
      });
      expect(before.map(({ id }) => id)).toEqual(
        rows
          .slice(0, 19)
          .reverse()
          .map(({ id }) => id),
      );
    } finally {
      await prisma.template.update({
        where: { id: anchor.id },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it('keeps case insensitive category search and treats adversarial text as a bound value', async () => {
    const repository = new PrismaCatalogRepository(prisma);
    const categoryMatches = await repository.listTemplatePage({
      size: 50,
      direction: 'after',
      query: 'GROWTH CATEGORY 0',
    });
    expect(categoryMatches).toHaveLength(25);
    expect(
      categoryMatches.every(
        ({ category }) => category.key === `${fixtureKey}-0`,
      ),
    ).toBe(true);
    expect(
      await repository.listTemplatePage({
        size: 50,
        direction: 'after',
        query: "' OR TRUE; DROP TABLE Template; --",
      }),
    ).toEqual([]);
    expect(
      await prisma.template.count({
        where: { id: { in: families.map(({ id }) => id) } },
      }),
    ).toBe(601);
  });

  it('backfills legacy counts in bounded batches without changing malformed or deleted response behavior', async () => {
    const ids: string[] = Array.from({ length: 205 }, () => randomUUID());
    const deletedId = randomUUID();
    try {
      await prisma.visitorSubmission.createMany({
        data: [...ids, deletedId].map((id, index) => ({
          id,
          pageId,
          browserTokenHash: id,
          idempotencyKey: id,
          idempotencyPayloadHash: id,
          submittedAt: new Date(Date.UTC(2027, 0, 1, 0, 0, index)),
          journeySnapshot: index % 2 === 0 ? journeySnapshot : { answers: [] },
          ...(id === deletedId ? { deletedAt: new Date() } : {}),
        })),
      });
      const repository = new PrismaPageSubmissionsRepository(prisma);
      const input = {
        creatorId,
        pageId,
        size: 50,
        filter: 'all' as const,
        cursor: null,
      };
      const before = await repository.listOwned(input);
      if ('type' in before) throw new Error('Missing legacy fixture');
      expect(before.items).toHaveLength(50);
      expect(before.items.map((item) => item.answerCount)).toEqual(
        before.items.map((item) => (ids.indexOf(item.id) % 2 === 0 ? 4 : 0)),
      );
      for (const size of [100, 100, 5]) {
        await expect(backfillJourneyAnswerCounts(prisma)).resolves.toEqual({
          selected: size,
          updated: size,
        });
      }
      await expect(backfillJourneyAnswerCounts(prisma)).resolves.toEqual({
        selected: 0,
        updated: 0,
      });
      const after = await repository.listOwned(input);
      expect(after).toEqual(before);
      const deleted = await prisma.visitorSubmission.findUniqueOrThrow({
        where: { id: deletedId },
      });
      expect(deleted.journeyAnswerCount).toBeNull();
      const stored = await prisma.visitorSubmission.findMany({
        where: { id: { in: ids } },
        select: { id: true, journeyAnswerCount: true },
      });
      expect(
        stored.every(
          (row) =>
            row.journeyAnswerCount === (ids.indexOf(row.id) % 2 === 0 ? 4 : 0),
        ),
      ).toBe(true);
      const firstId = ids[0];
      if (!firstId) throw new Error('Missing backfill constraint fixture');
      await expect(
        prisma.visitorSubmission.update({
          where: { id: firstId },
          data: { journeyAnswerCount: -1 },
        }),
      ).rejects.toThrow();
    } finally {
      await prisma.visitorSubmission.deleteMany({
        where: { id: { in: [...ids, deletedId] } },
      });
    }
  });

  it('keeps tuple paging through tied dates and excludes deleted, unrelated, and unauthorized records', async () => {
    const ids = Array.from({ length: 6 }, () => randomUUID()).sort();
    const date = new Date('2027-02-01T00:00:00.000Z');
    try {
      await prisma.visitorSubmission.createMany({
        data: ids.map((id, index) => ({
          id,
          pageId,
          browserTokenHash: id,
          idempotencyKey: id,
          idempotencyPayloadHash: id,
          submittedAt: date,
          journeyAnswerCount: 0,
          ...(index === 0 ? { deletedAt: new Date() } : {}),
        })),
      });
      const repository = new PrismaPageSubmissionsRepository(prisma);
      const first = await repository.listOwned({
        creatorId,
        pageId,
        filter: 'all',
        size: 2,
        cursor: null,
      });
      if ('type' in first || !first.nextCursor)
        throw new Error('Missing tied cursor');
      expect(first.items.map((item) => item.id)).toEqual([ids[5], ids[4]]);
      await prisma.visitorSubmission.delete({
        where: { id: first.nextCursor.id },
      });
      const next = await repository.listOwned({
        creatorId,
        pageId,
        filter: 'all',
        size: 2,
        cursor: first.nextCursor,
      });
      if ('type' in next) throw new Error('Missing next tied page');
      expect(next.items.map((item) => item.id)).toEqual([ids[3], ids[2]]);
      await expect(
        repository.listOwned({
          creatorId: 'another-owner',
          pageId,
          filter: 'all',
          size: 50,
          cursor: null,
        }),
      ).resolves.toEqual({ type: 'not_found' });
      await expect(
        repository.listOwned({
          creatorId,
          pageId: randomUUID(),
          filter: 'all',
          size: 50,
          cursor: null,
        }),
      ).resolves.toEqual({ type: 'not_found' });
      const empty = await repository.listOwned({
        creatorId,
        pageId,
        filter: 'all',
        size: 50,
        cursor: { submittedAt: new Date('2025-01-01'), id: pageId },
      });
      if ('type' in empty) throw new Error('Missing empty page');
      expect(empty.items).toEqual([]);
      expect(empty.nextCursor).toBeNull();
      expect(empty.unreadCount).toBe(1004);
    } finally {
      await prisma.visitorSubmission.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it.each(['count', 'delete'] as const)(
    'does not overwrite a concurrent %s while backfill waits for a row lock',
    async (change) => {
      const id = randomUUID();
      let pending: ReturnType<typeof backfillJourneyAnswerCounts> | undefined;
      await prisma.visitorSubmission.create({
        data: {
          id,
          pageId,
          browserTokenHash: id,
          idempotencyKey: id,
          idempotencyPayloadHash: id,
          journeySnapshot,
        },
      });
      try {
        await prisma.$transaction(
          async (transaction) => {
            await transaction.$queryRaw`SELECT "id" FROM "VisitorSubmission" WHERE "id" = ${id}::uuid FOR UPDATE`;
            pending = backfillJourneyAnswerCounts(prisma);
            const deadline = Date.now() + 5000;
            let waiting = false;
            while (Date.now() < deadline) {
              await transaction.$executeRaw`SELECT pg_stat_clear_snapshot()`;
              const rows = await transaction.$queryRaw<
                Array<{ waiting: boolean }>
              >`
            SELECT EXISTS(SELECT 1 FROM pg_stat_activity
              WHERE datname = current_database() AND wait_event_type = 'Lock'
                AND query LIKE 'UPDATE%VisitorSubmission%journeyAnswerCount%') AS waiting
          `;
              if (rows[0]?.waiting) {
                waiting = true;
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 20));
            }
            if (!waiting)
              throw new Error('Backfill did not reach the controlled row lock');
            await transaction.visitorSubmission.update({
              where: { id },
              data:
                change === 'count'
                  ? { journeyAnswerCount: 4 }
                  : { deletedAt: new Date(), journeySnapshot: DbNull },
            });
          },
          { timeout: 10_000 },
        );
        if (!pending) throw new Error('Missing backfill operation');
        await expect(pending).resolves.toEqual({ selected: 1, updated: 0 });
        const row = await prisma.visitorSubmission.findUniqueOrThrow({
          where: { id },
        });
        expect(row.journeyAnswerCount).toBe(change === 'count' ? 4 : null);
        if (change === 'delete') {
          expect(row.deletedAt).not.toBeNull();
          expect(row.journeySnapshot).toBeNull();
        }
      } finally {
        await pending?.catch(() => undefined);
        await prisma.visitorSubmission.deleteMany({ where: { id } });
      }
    },
  );
});
