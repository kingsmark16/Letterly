import {
  categoryCatalogResponseSchema,
  templateCatalogResponseSchema,
} from '@letterly/contracts/catalog';
import type { PrismaClient } from '@letterly/database';
import { templateRegistry } from '@letterly/templates';
import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PRISMA_CLIENT } from '../../infrastructure/database/prisma.provider';

function resolveRegistryEntry(registryKey: string, version: number) {
  const entry = Object.values(templateRegistry).find(
    (candidate) =>
      candidate.registryKey === registryKey && candidate.version === version,
  );

  if (!entry) {
    throw new ServiceUnavailableException('Catalog unavailable');
  }

  return entry;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async listCategories(activeOnly: boolean) {
    const categories = await this.prisma.category.findMany({
      where: activeOnly ? { status: 'ACTIVE' } : undefined,
      orderBy: { displayOrder: 'asc' },
      select: {
        key: true,
        name: true,
        description: true,
        displayOrder: true,
      },
    });

    return categoryCatalogResponseSchema.parse(categories);
  }

  async listTemplates(categoryKey?: string) {
    const category = categoryKey
      ? await this.prisma.category.findUnique({
          where: { key: categoryKey },
          select: { id: true, status: true },
        })
      : undefined;

    if (categoryKey && (!category || category.status !== 'ACTIVE')) {
      throw new NotFoundException('Category not found');
    }

    const templates = await this.prisma.template.findMany({
      where: {
        status: 'ACTIVE',
        ...(category ? { categoryId: category.id } : {}),
      },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        displayOrder: true,
        category: {
          select: { key: true },
        },
        versions: {
          where: { status: 'ACTIVE' },
          orderBy: { version: 'asc' },
          select: {
            id: true,
            version: true,
            registryKey: true,
          },
        },
      },
    });

    const response = templates.map((template) => ({
      id: template.id,
      categoryKey: template.category.key,
      key: template.key,
      name: template.name,
      description: template.description,
      displayOrder: template.displayOrder,
      versions: template.versions.map((version) => {
        const registryEntry = resolveRegistryEntry(
          version.registryKey,
          version.version,
        );

        return {
          id: version.id,
          version: version.version,
          capabilities: [...registryEntry.capabilities],
        };
      }),
    }));

    return templateCatalogResponseSchema.parse(response);
  }
}
