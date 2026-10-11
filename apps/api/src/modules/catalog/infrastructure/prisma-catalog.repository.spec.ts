jest.mock('../../../infrastructure/database/prisma.provider', () => ({
  PRISMA_CLIENT: Symbol.for('letterly.test.prisma'),
}));

import type { PrismaClient } from '@letterly/database';
import { PrismaCatalogRepository } from './prisma-catalog.repository';

describe('PrismaCatalogRepository', () => {
  const prisma = {
    category: { findMany: jest.fn(), findUnique: jest.fn() },
    template: { findMany: jest.fn() },
  };
  const repository = new PrismaCatalogRepository(
    prisma as unknown as PrismaClient,
  );

  beforeEach(() => jest.resetAllMocks());

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

  it('preserves database errors for the shared error boundary', async () => {
    const failure = new Error('database unavailable');
    prisma.template.findMany.mockRejectedValue(failure);
    await expect(repository.listTemplates()).rejects.toBe(failure);
  });
});
