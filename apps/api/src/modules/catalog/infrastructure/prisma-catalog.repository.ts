import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CatalogRepository,
  CatalogTemplateLookupRead,
  CatalogTemplatePageRead,
} from '../application/catalog.repository';

@Injectable()
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  listOverview(previewSize: number) {
    return this.prisma.category
      .findMany({
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
            take: previewSize,
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
      })
      .then((categories) =>
        categories.map((category) => ({
          key: category.key,
          name: category.name,
          description: category.description,
          displayOrder: category.displayOrder,
          templates: category.templates.map((template) => ({
            id: template.id,
            key: template.key,
            name: template.name,
            description: template.description,
            displayOrder: template.displayOrder,
            category: { key: category.key },
            currentVersion: template.versions[0] ?? null,
          })),
        })),
      );
  }

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

  async listTemplatePage(input: CatalogTemplatePageRead) {
    const conditions: Prisma.TemplateWhereInput[] = [];

    if (input.query) {
      conditions.push({
        OR: [
          { name: { contains: input.query, mode: 'insensitive' } },
          { description: { contains: input.query, mode: 'insensitive' } },
          {
            category: {
              is: { name: { contains: input.query, mode: 'insensitive' } },
            },
          },
        ],
      });
    }

    if (input.position) {
      const comparison = input.direction === 'after' ? 'gt' : 'lt';
      conditions.push({
        OR: [
          { displayOrder: { [comparison]: input.position.displayOrder } },
          {
            displayOrder: input.position.displayOrder,
            id: { [comparison]: input.position.id },
          },
        ],
      });
    }

    const where: Prisma.TemplateWhereInput = {
      status: 'ACTIVE',
      versions: { some: { status: 'ACTIVE' } },
      category: {
        is: {
          status: 'ACTIVE',
          ...(input.categoryId ? { id: input.categoryId } : {}),
        },
      },
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };
    const templates = await this.prisma.template.findMany({
      where,
      orderBy:
        input.direction === 'before'
          ? [{ displayOrder: 'desc' }, { id: 'desc' }]
          : [{ displayOrder: 'asc' }, { id: 'asc' }],
      take: input.size + 1,
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

    return templates.map((template) => ({
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      category: template.category,
      currentVersion: template.versions[0] ?? null,
    }));
  }

  async findTemplateLookup(input: CatalogTemplateLookupRead) {
    const templates = await this.prisma.template.findMany({
      where: {
        key: input.key,
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
            ...(input.version !== undefined ? { version: input.version } : {}),
          },
          orderBy: { version: 'desc' },
          take: 1,
          select: { id: true, version: true, registryKey: true },
        },
      },
    });

    return templates.map((template) => ({
      id: template.id,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      category: template.category,
      selectedVersion: template.versions[0] ?? null,
    }));
  }
}
