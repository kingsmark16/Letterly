import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type { CatalogRepository } from '../application/catalog.repository';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  listCategories(activeOnly: boolean) {
    return this.prisma.category.findMany({
      where: activeOnly ? { status: 'ACTIVE' } : undefined,
      orderBy: { displayOrder: 'asc' },
      select: { key: true, name: true, description: true, displayOrder: true },
    });
  }

  findCategory(key: string) {
    return this.prisma.category.findUnique({
      where: { key },
      select: { id: true, status: true },
    });
  }

  listTemplates(categoryId?: string) {
    return this.prisma.template.findMany({
      where: {
        status: 'ACTIVE',
        ...(categoryId !== undefined ? { categoryId } : {}),
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
  }
}
