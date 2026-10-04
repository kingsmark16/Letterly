jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));
import type { PrismaClient } from '@letterly/database';
import { requiredTestValue } from '../../../../test/support/required-test-value';
import { PrismaCatalogRepository } from './prisma-catalog.repository';

describe('PrismaCatalogRepository', () => {
  const prisma = {
    category: { findMany: jest.fn(), findUnique: jest.fn() },
    template: { findMany: jest.fn<Promise<unknown[]>, [unknown]>() },
    $queryRawUnsafe: jest.fn<Promise<unknown[]>, [string, ...unknown[]]>(),
  };
  const repository = new PrismaCatalogRepository(
    prisma as unknown as PrismaClient,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$queryRawUnsafe.mockResolvedValue([]);
  });

  it.each([true, false])(
    'selects ordered public categories with active filter %s',
    async (activeOnly) => {
      prisma.category.findMany.mockResolvedValue([]);
      await repository.listCategories(activeOnly);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: activeOnly ? { status: 'ACTIVE' } : undefined,
        orderBy: { displayOrder: 'asc' },
        select: {
          key: true,
          name: true,
          description: true,
          displayOrder: true,
        },
      });
    },
  );

  it('selects only category lookup identity and status', async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(repository.findCategory('confession')).resolves.toBeNull();
    expect(prisma.category.findUnique).toHaveBeenCalledWith({
      where: { key: 'confession' },
      select: { id: true, status: true },
    });
  });

  it.each([undefined, 'category-id'])(
    'selects active templates and active ordered versions with category %s',
    async (categoryId) => {
      prisma.template.findMany.mockResolvedValue([]);
      await repository.listTemplates(categoryId);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          ...(categoryId === undefined ? {} : { categoryId }),
        },
        orderBy: { displayOrder: 'asc' },
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          displayOrder: true,
          category: { select: { key: true } },
          versions: {
            where: { status: 'ACTIVE' },
            orderBy: { version: 'asc' },
            select: { id: true, version: true, registryKey: true },
          },
        },
      });
    },
  );

  it('reads bounded overview relations in one query and retains empty category projections', async () => {
    const rows = [
      {
        key: 'empty',
        name: 'Empty',
        description: null,
        displayOrder: 1,
        templates: [],
      },
    ];
    prisma.$queryRawUnsafe.mockResolvedValue(rows);
    expect(await repository.listOverview(4)).toEqual(rows);
    const [sql, limit] = requiredTestValue(
      prisma.$queryRawUnsafe.mock.calls[0],
      'Expected overview SQL',
    );
    expect(sql).toContain('CROSS JOIN LATERAL');
    expect(sql).toContain('LIMIT $1::integer');
    expect(sql).toContain('LIMIT 1');
    expect(limit).toBe(4);
    expect(prisma.$queryRawUnsafe.mock.calls).toHaveLength(1);
    expect(prisma.category.findMany.mock.calls).toHaveLength(0);
  });

  it.each(['after', 'before'] as const)(
    'binds category, search, tuple position and lookahead for %s',
    async (direction) => {
      const search = "love' OR TRUE --";
      const id = '11111111-1111-4111-8111-111111111111';
      await repository.listTemplatePage({
        categoryId: id,
        query: search,
        size: 20,
        direction,
        position: { displayOrder: 12, id },
      });
      const [sql, ...values] = requiredTestValue(
        prisma.$queryRawUnsafe.mock.calls[0],
        'Expected page SQL',
      );
      expect(sql).not.toContain(search);
      expect(values).toEqual([id, '%' + search + '%', 12, id, 21]);
      expect(sql).toContain(
        '(t."displayOrder", t."id") ' + (direction === 'after' ? '>' : '<'),
      );
      expect(sql).toContain(
        'ORDER BY t."displayOrder" ' + (direction === 'after' ? 'ASC' : 'DESC'),
      );
      expect(sql).toContain('LIMIT 1');
      expect(sql).toContain('LIMIT $5::integer');
      expect(prisma.template.findMany.mock.calls).toHaveLength(0);
    },
  );

  it('keeps first page conditions independent of a missing cursor', async () => {
    await repository.listTemplatePage({ size: 50, direction: 'after' });
    const [sql, ...values] = requiredTestValue(
      prisma.$queryRawUnsafe.mock.calls[0],
      'Expected first page SQL',
    );
    expect(values).toEqual([51]);
    expect(sql).not.toContain('(t."displayOrder", t."id") >');
    expect(sql).toContain('LIMIT $1::integer');
  });

  it('binds focused identity and exact active version while retaining null version rows', async () => {
    const row = { id: 'fixture', selectedVersion: null };
    prisma.$queryRawUnsafe.mockResolvedValue([row]);
    expect(
      await repository.findTemplateLookup({
        key: 'secret-letter',
        categoryKey: 'confession',
        version: 2,
      }),
    ).toEqual([row]);
    const [sql, ...values] = requiredTestValue(
      prisma.$queryRawUnsafe.mock.calls[0],
      'Expected lookup SQL',
    );
    expect(values).toEqual(['secret-letter', 'confession', 2]);
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain('version."version" = $3::integer');
    expect(sql).toContain('LIMIT 2');
  });

  it('lets focused lookup select the highest active version when omitted', async () => {
    await repository.findTemplateLookup({ key: 'secret-letter' });
    const [sql, ...values] = requiredTestValue(
      prisma.$queryRawUnsafe.mock.calls[0],
      'Expected lookup SQL',
    );
    expect(values).toEqual(['secret-letter']);
    expect(sql).not.toContain('version."version" =');
    expect(sql).toContain('ORDER BY version."version" DESC LIMIT 1');
  });

  it('preserves database errors for the shared boundary', async () => {
    const error = new Error('database unavailable');
    prisma.$queryRawUnsafe.mockRejectedValue(error);
    await expect(
      repository.listTemplatePage({ size: 20, direction: 'after' }),
    ).rejects.toBe(error);
    prisma.template.findMany.mockRejectedValue(error);
    await expect(repository.listTemplates()).rejects.toBe(error);
  });
});
