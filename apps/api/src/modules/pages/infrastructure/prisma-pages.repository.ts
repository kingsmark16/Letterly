import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CreateDraftInput,
  ListDraftsInput,
  ListDraftsResult,
  PagesRepository,
  UpdateDraftInput,
  UpdateDraftResult,
} from '../application/pages.repository';
import type { OwnerPage } from '../domain/page.types';

const slugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

const ownerPageSelect = {
  id: true,
  creatorId: true,
  slug: true,
  displaySlug: true,
  status: true,
  contentVersion: true,
  content: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  templateVersion: {
    select: {
      id: true,
      version: true,
      registryKey: true,
      template: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
  },
} as const;

const draftSummarySelect = {
  id: true,
  content: true,
  status: true,
  contentVersion: true,
  createdAt: true,
  updatedAt: true,
  templateVersion: {
    select: {
      id: true,
      version: true,
      registryKey: true,
      template: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
    },
  },
} as const;

function generateSlug(): string {
  return Array.from(
    { length: 8 },
    () => slugAlphabet[randomInt(slugAlphabet.length)],
  ).join('');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function mapOwnerPage(page: {
  id: string;
  creatorId: string;
  slug: string;
  displaySlug: string;
  status: OwnerPage['status'];
  contentVersion: number;
  content: unknown;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
  templateVersion: {
    id: string;
    version: number;
    registryKey: string;
    template: {
      id: string;
      key: string;
      name: string;
    };
  };
}): OwnerPage {
  return {
    id: page.id,
    creatorId: page.creatorId,
    slug: page.slug,
    displaySlug: page.displaySlug,
    status: page.status,
    contentVersion: page.contentVersion,
    content: secretLetterContentSchema.parse(page.content),
    settings: secretLetterSettingsSchema.parse(page.settings),
    template: {
      id: page.templateVersion.template.id,
      key: page.templateVersion.template.key,
      name: page.templateVersion.template.name,
      templateVersionId: page.templateVersion.id,
      version: page.templateVersion.version,
      registryKey: page.templateVersion.registryKey,
    },
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

@Injectable()
export class PrismaPagesRepository implements PagesRepository {
  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async createDraft(input: CreateDraftInput): Promise<OwnerPage> {
    const content = secretLetterContentSchema.parse(input.content);
    const settings = secretLetterSettingsSchema.parse(input.settings);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = generateSlug();

      try {
        const page = await this.prisma.page.create({
          data: {
            creatorId: input.creatorId,
            templateVersionId: input.templateVersionId,
            slug,
            displaySlug: slug,
            status: 'DRAFT',
            contentVersion: 0,
            content,
            settings,
            slugReservations: {
              create: {
                normalizedSlug: slug,
                isCurrent: true,
              },
            },
          },
          select: ownerPageSelect,
        });

        return mapOwnerPage(page);
      } catch (error: unknown) {
        if (!isUniqueViolation(error) || attempt === 4) {
          throw error;
        }
      }
    }

    throw new Error('Slug allocation failed');
  }

  async listDrafts(input: ListDraftsInput): Promise<ListDraftsResult> {
    const rows = await this.prisma.page.findMany({
      where: {
        creatorId: input.creatorId,
        status: 'DRAFT',
        ...(input.cursor
          ? {
              OR: [
                { updatedAt: { lt: input.cursor.updatedAt } },
                {
                  updatedAt: input.cursor.updatedAt,
                  id: { lt: input.cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: input.size + 1,
      select: draftSummarySelect,
    });

    const hasMore = rows.length > input.size;
    const items = hasMore ? rows.slice(0, input.size) : rows;
    const lastItem = items.at(-1);

    return {
      items: items.map((page) => {
        const content = secretLetterContentSchema.parse(page.content);

        return {
          id: page.id,
          recipientLabel: content.recipientName.trim() || 'Untitled letter',
          status: 'DRAFT' as const,
          contentVersion: page.contentVersion,
          template: {
            id: page.templateVersion.template.id,
            key: page.templateVersion.template.key,
            name: page.templateVersion.template.name,
            templateVersionId: page.templateVersion.id,
            version: page.templateVersion.version,
            registryKey: page.templateVersion.registryKey,
          },
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      }),
      nextCursor:
        hasMore && lastItem
          ? { updatedAt: lastItem.updatedAt, id: lastItem.id }
          : null,
    };
  }

  async findOwnedPage(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerPage | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        id: input.pageId,
        creatorId: input.creatorId,
      },
      select: ownerPageSelect,
    });

    return page ? mapOwnerPage(page) : null;
  }

  async updateDraft(input: UpdateDraftInput): Promise<UpdateDraftResult> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.page.findFirst({
        where: {
          id: input.pageId,
          creatorId: input.creatorId,
          status: 'DRAFT',
        },
        select: {
          content: true,
          contentVersion: true,
          updatedAt: true,
        },
      });

      if (!current) {
        return { type: 'not_found' };
      }

      if (current.contentVersion !== input.expectedContentVersion) {
        return {
          type: 'stale',
          currentContentVersion: current.contentVersion,
          currentUpdatedAt: current.updatedAt,
        };
      }

      const currentContent = secretLetterContentSchema.parse(current.content);

      const updated = await transaction.page.updateMany({
        where: {
          id: input.pageId,
          creatorId: input.creatorId,
          status: 'DRAFT',
          contentVersion: input.expectedContentVersion,
        },
        data: {
          content: {
            ...currentContent,
            recipientName: input.recipientName,
            mainMessage: input.mainMessage,
          },
          contentVersion: {
            increment: 1,
          },
        },
      });

      if (updated.count === 0) {
        const latest = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            status: 'DRAFT',
          },
          select: {
            contentVersion: true,
            updatedAt: true,
          },
        });

        return latest
          ? {
              type: 'stale' as const,
              currentContentVersion: latest.contentVersion,
              currentUpdatedAt: latest.updatedAt,
            }
          : { type: 'not_found' as const };
      }

      const page = await transaction.page.findFirst({
        where: {
          id: input.pageId,
          creatorId: input.creatorId,
        },
        select: ownerPageSelect,
      });

      return page
        ? { type: 'updated' as const, page: mapOwnerPage(page) }
        : { type: 'not_found' as const };
    });
  }

  async deleteOwnedPage(input: {
    creatorId: string;
    pageId: string;
  }): Promise<'deleted' | 'not_found'> {
    return this.prisma.$transaction(async (transaction) => {
      const page = await transaction.page.findFirst({
        where: {
          id: input.pageId,
          creatorId: input.creatorId,
        },
        select: { id: true },
      });

      if (!page) {
        return 'not_found';
      }

      await transaction.pageSlugReservation.updateMany({
        where: { pageId: page.id },
        data: {
          pageId: null,
          isCurrent: false,
        },
      });

      await transaction.page.delete({
        where: { id: page.id },
      });

      return 'deleted';
    });
  }
}
