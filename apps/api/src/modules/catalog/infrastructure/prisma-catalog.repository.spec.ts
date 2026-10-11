jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaCatalogRepository } from './prisma-catalog.repository';

describe('PrismaCatalogRepository', () => {
  const prisma = {
    category: { findMany: jest.fn(), findUnique: jest.fn() },
    template: {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
    },
  };
  const repository = new PrismaCatalogRepository(
    prisma as unknown as PrismaClient,
  );

  beforeEach(() => jest.resetAllMocks());

  it('AC-2 and AC-9 loads a stable overview with at most four current family previews per category', async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        key: 'confession',
        name: 'Confession',
        description: null,
        displayOrder: 1,
        templates: [
          {
            id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
            key: 'secret-letter',
            name: 'Secret Letter',
            description: null,
            displayOrder: 1,
            category: { key: 'confession' },
            versions: [
              {
                id: 'b7e4b986-2b45-40bb-a13b-51357ac4816e',
                version: 2,
                registryKey: 'confession.secret-letter.v2',
              },
            ],
          },
        ],
      },
    ]);

    const result = await repository.listOverview(4);

    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      select: {
        key: true,
        name: true,
        description: true,
        displayOrder: true,
        templates: {
          where: {
            status: 'ACTIVE',
            versions: { some: { status: 'ACTIVE' } },
          },
          orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
          take: 4,
          select: {
            id: true,
            key: true,
            name: true,
            description: true,
            displayOrder: true,
            versions: {
              where: { status: 'ACTIVE' },
              orderBy: { version: 'desc' },
              take: 1,
              select: { id: true, version: true, registryKey: true },
            },
          },
        },
      },
    });
    expect(result[0]?.templates[0]?.currentVersion?.version).toBe(2);
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

  it('AC-3 and AC-9 filters before paging and selects one highest active version', async () => {
    prisma.template.findMany.mockResolvedValue([
      {
        id: '9de65e32-53db-4a66-95d7-6ecaa98d2f7b',
        key: 'secret-letter',
        name: 'Secret Letter',
        description: null,
        displayOrder: 1,
        category: { key: 'confession' },
        versions: [
          {
            id: 'b7e4b986-2b45-40bb-a13b-51357ac4816e',
            version: 2,
            registryKey: 'confession.secret-letter.v2',
          },
        ],
      },
    ]);

    const result = await repository.listTemplatePage({
      categoryId: 'category-id',
      query: 'love',
      size: 2,
      direction: 'after',
      position: {
        displayOrder: 1,
        id: '11111111-1111-4111-8111-111111111111',
      },
    });

    expect(prisma.template.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        versions: { some: { status: 'ACTIVE' } },
        category: { is: { status: 'ACTIVE', id: 'category-id' } },
        AND: [
          {
            OR: [
              { name: { contains: 'love', mode: 'insensitive' } },
              { description: { contains: 'love', mode: 'insensitive' } },
              {
                category: {
                  is: { name: { contains: 'love', mode: 'insensitive' } },
                },
              },
            ],
          },
          {
            OR: [
              { displayOrder: { gt: 1 } },
              {
                displayOrder: 1,
                id: { gt: '11111111-1111-4111-8111-111111111111' },
              },
            ],
          },
        ],
      },
      orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
      take: 3,
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        displayOrder: true,
        category: { select: { key: true } },
        versions: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, registryKey: true },
        },
      },
    });
    expect(result[0]?.currentVersion?.version).toBe(2);
    expect(result[0]?.category.key).toBe('confession');
  });

  it('AC-4 queries before a stable anchor in descending order and reads size plus one', async () => {
    prisma.template.findMany.mockResolvedValue([]);
    await repository.listTemplatePage({
      size: 10,
      direction: 'before',
      position: {
        displayOrder: 12,
        id: '11111111-1111-4111-8111-111111111111',
      },
    });

    const query: unknown = prisma.template.findMany.mock.calls[0]?.[0];
    expect(query).toMatchObject({
      where: {
        AND: [
          {
            OR: [
              { displayOrder: { lt: 12 } },
              {
                displayOrder: 12,
                id: { lt: '11111111-1111-4111-8111-111111111111' },
              },
            ],
          },
        ],
      },
      orderBy: [{ displayOrder: 'desc' }, { id: 'desc' }],
      take: 11,
    });
  });

  it.each([
    { key: 'secret-letter' },
    { key: 'secret-letter', categoryKey: 'confession', version: 2 },
  ])(
    'AC-5 and AC-9 looks up at most two active families and one requested active version: %p',
    async (input) => {
      prisma.template.findMany.mockResolvedValue([]);
      await repository.findTemplateLookup(input);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: {
          key: 'secret-letter',
          status: 'ACTIVE',
          category: {
            is: {
              status: 'ACTIVE',
              ...(input.categoryKey ? { key: input.categoryKey } : {}),
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }],
        take: 2,
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          displayOrder: true,
          category: { select: { key: true } },
          versions: {
            where: {
              status: 'ACTIVE',
              ...(input.version === undefined
                ? {}
                : { version: input.version }),
            },
            orderBy: { version: 'desc' },
            take: 1,
            select: { id: true, version: true, registryKey: true },
          },
        },
      });
    },
  );

  it('preserves database errors for the shared error boundary', async () => {
    const failure = new Error('database unavailable');
    prisma.template.findMany.mockRejectedValue(failure);
    await expect(repository.listTemplates()).rejects.toBe(failure);
  });
});
