import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import {
  secretLetterContentSchema,
  secretLetterPrivateSettingsSchema,
  secretLetterSettingsSchema,
  templateRegistry,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  CreateDraftInput,
  ChangePublishedSlugInput,
  ArchivePageInput,
  ListDraftsInput,
  ListDraftsResult,
  PagesRepository,
  PageLifecycleMutationResult,
  PublishPageInput,
  RestorePageInput,
  UnpublishPageInput,
  UpdateDraftInput,
  UpdateDraftResult,
} from '../application/pages.repository';
import type {
  OwnerPage,
  PageImageState,
  PublicPage,
} from '../domain/page.types';

const slugAlphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
const MAX_PAGE_IMAGES = 10;
const MAX_PAGE_SOURCE_BYTES = 104_857_600;
const MAX_PAGE_OUTPUT_BYTES = 62_914_560;

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
  publishedAt: true,
  unpublishedAt: true,
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
  images: {
    select: {
      id: true,
      state: true,
      attachedAt: true,
      sortOrder: true,
      caption: true,
      failureCode: true,
      expiresAt: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
} as const;

const lifecyclePageSelect = {
  ...ownerPageSelect,
  publishedAt: true,
  unpublishedAt: true,
} as const;

const publicPageSelect = {
  slug: true,
  displaySlug: true,
  content: true,
  settings: true,
  templateVersion: {
    select: {
      version: true,
      template: {
        select: {
          key: true,
        },
      },
    },
  },
  images: {
    where: {
      state: 'READY',
      attachedAt: { not: null },
    },
    select: {
      id: true,
      caption: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  questions: {
    select: {
      id: true,
      type: true,
      prompt: true,
      displayOrder: true,
      nextQuestionId: true,
      choices: {
        select: {
          id: true,
          label: true,
          displayOrder: true,
          nextQuestionId: true,
        },
        orderBy: { displayOrder: 'asc' },
      },
    },
    orderBy: { displayOrder: 'asc' },
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

class LifecycleStateChangedError extends Error {
  constructor() {
    super('Page lifecycle state changed during the transaction');
    this.name = 'LifecycleStateChangedError';
  }
}

class PageImageStateChangedError extends Error {
  constructor() {
    super('A requested page image changed during the transaction');
    this.name = 'PageImageStateChangedError';
  }
}

function mapOwnerPage(page: {
  id: string;
  creatorId: string;
  slug: string;
  displaySlug: string;
  status: OwnerPage['status'];
  contentVersion: number;
  content: unknown;
  settings?: unknown;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
  unpublishedAt?: Date | null;
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
  images?: Array<{
    id: string;
    state: PageImageState;
    attachedAt: Date | null;
    sortOrder: number | null;
    caption: string | null;
    failureCode: string | null;
    expiresAt: Date | null;
  }>;
}): OwnerPage {
  const now = Date.now();

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
    images: (page.images ?? [])
      .filter(
        (image) => image.expiresAt === null || image.expiresAt.getTime() > now,
      )
      .map((image) => ({
        imageId: image.id,
        state: image.state,
        attached: image.attachedAt !== null,
        sortOrder: image.sortOrder,
        mediaUrl:
          image.state === 'READY'
            ? `/api/v1/pages/${page.id}/images/${image.id}`
            : null,
        caption: image.caption,
        failureCode: image.failureCode,
        expiresAt: image.expiresAt,
      })),
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
  };
}

function mapPublicPage(page: {
  slug: string;
  displaySlug: string;
  content: unknown;
  settings: unknown;
  templateVersion: {
    version: number;
    template: { key: string };
  };
  images?: Array<{
    id: string;
    caption: string | null;
  }>;
  questions?: Array<{
    id: string;
    type: 'CHOICE' | 'PLAIN_MESSAGE';
    prompt: string;
    displayOrder: number;
    nextQuestionId: string | null;
    choices: Array<{
      id: string;
      label: string;
      displayOrder: number;
      nextQuestionId: string | null;
    }>;
  }>;
}): PublicPage {
  const content = secretLetterContentSchema.parse(page.content);
  const settings = page.settings
    ? secretLetterSettingsSchema.parse(page.settings)
    : null;
  const trustedTemplate = Object.values(templateRegistry).find(
    (candidate) =>
      candidate.renderer.key === page.templateVersion.template.key &&
      candidate.version === page.templateVersion.version,
  );
  const responseEnabled =
    settings?.responsesEnabled === true &&
    trustedTemplate?.capabilities.includes('questions') === true;
  const sortedQuestions = [...(page.questions ?? [])].sort(
    (left, right) =>
      left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
  const incomingQuestionIds = new Set<string>();

  for (const question of sortedQuestions) {
    if (question.nextQuestionId)
      incomingQuestionIds.add(question.nextQuestionId);
    for (const choice of question.choices) {
      if (choice.nextQuestionId) incomingQuestionIds.add(choice.nextQuestionId);
    }
  }

  const response =
    responseEnabled && trustedTemplate
      ? {
          enabled: true as const,
          requiredAnswers: trustedTemplate.questionRules?.required ?? false,
          visitorMessageEnabled:
            trustedTemplate.capabilities.includes('visitorMessage'),
          visitorMessagePrompt: trustedTemplate.response.visitorMessagePrompt,
          visitorMessagePrivacyText:
            trustedTemplate.response.visitorMessagePrivacyText,
          visitorMessageMaxLength:
            trustedTemplate.response.visitorMessageMaxLength,
          textAnswerMaxLength: trustedTemplate.response.textAnswerMaxLength,
          rootQuestionIds: sortedQuestions
            .filter((question) => !incomingQuestionIds.has(question.id))
            .map((question) => question.id),
          questions: sortedQuestions
            .map((question) => ({
              ...question,
              choices: [...question.choices].sort(
                (left, right) =>
                  left.displayOrder - right.displayOrder ||
                  left.id.localeCompare(right.id),
              ),
            }))
            .sort(
              (left, right) =>
                left.displayOrder - right.displayOrder ||
                left.id.localeCompare(right.id),
            ),
        }
      : { enabled: false as const };

  return {
    displaySlug: page.displaySlug,
    canonicalSlug: page.slug,
    template: {
      key: page.templateVersion.template.key as 'secret-letter',
      version: page.templateVersion.version,
    },
    recipientName: content.recipientName,
    mainMessage: content.mainMessage,
    images: (page.images ?? []).map((image) => ({
      imageId: image.id,
      mediaUrl: `/p/${encodeURIComponent(page.displaySlug)}/media/${image.id}`,
      caption: image.caption,
    })),
    ...(settings ? { response } : {}),
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
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
          },
          select: {
            content: true,
            settings: true,
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

        if (input.images) {
          const imageIds = input.images.map((image) => image.imageId);
          const sortOrders = input.images.map((image) => image.sortOrder);

          if (
            new Set(imageIds).size !== imageIds.length ||
            new Set(sortOrders).size !== sortOrders.length ||
            input.images.length > MAX_PAGE_IMAGES
          ) {
            return { type: 'image_limit' as const };
          }
        }

        const currentContent = secretLetterContentSchema.parse(current.content);
        const currentSettings =
          input.responsesEnabled === undefined || current.settings === undefined
            ? undefined
            : secretLetterPrivateSettingsSchema.parse(current.settings);

        if (input.images) {
          const requestedImages = await transaction.pageImage.findMany({
            where: {
              pageId: input.pageId,
              id: { in: input.images.map((image) => image.imageId) },
              state: 'READY',
              storageKey: { not: null },
              outputByteSize: { not: null },
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              sourceByteSize: true,
              outputByteSize: true,
              storageKey: true,
              sourceStorageKey: true,
            },
          });

          if (requestedImages.length !== input.images.length) {
            return { type: 'invalid_image' as const };
          }

          const sourceBytes = requestedImages.reduce(
            (total, image) => total + image.sourceByteSize,
            0,
          );
          const outputBytes = requestedImages.reduce(
            (total, image) => total + (image.outputByteSize ?? 0),
            0,
          );

          if (
            sourceBytes > MAX_PAGE_SOURCE_BYTES ||
            outputBytes > MAX_PAGE_OUTPUT_BYTES
          ) {
            return { type: 'image_limit' as const };
          }
        }

        const updated = await transaction.page.updateMany({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
            status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
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
            ...(input.responsesEnabled === undefined
              ? {}
              : {
                  settings: {
                    ...currentSettings,
                    responsesEnabled: input.responsesEnabled,
                  },
                }),
          },
        });

        if (updated.count === 0) {
          const latest = await transaction.page.findFirst({
            where: {
              id: input.pageId,
              creatorId: input.creatorId,
              status: { in: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
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

        if (input.images) {
          const currentAttached = await transaction.pageImage.findMany({
            where: {
              pageId: input.pageId,
              attachedAt: { not: null },
            },
            select: {
              id: true,
              storageKey: true,
              sourceStorageKey: true,
            },
          });
          const requestedIds = new Set(
            input.images.map((image) => image.imageId),
          );
          const removedImages = currentAttached.filter(
            (image) => !requestedIds.has(image.id),
          );
          const cleanupKeys = new Set<string>();

          for (const image of removedImages) {
            if (image.storageKey) cleanupKeys.add(image.storageKey);
            if (image.sourceStorageKey) cleanupKeys.add(image.sourceStorageKey);
          }

          if (cleanupKeys.size > 0) {
            await transaction.mediaCleanup.createMany({
              data: Array.from(cleanupKeys, (objectKey) => ({
                objectKey,
                nextRetryAt: new Date(),
              })),
              skipDuplicates: true,
            });
          }

          if (removedImages.length > 0) {
            await transaction.pageImage.deleteMany({
              where: {
                id: { in: removedImages.map((image) => image.id) },
                pageId: input.pageId,
              },
            });
          }

          if (input.images.length > 0) {
            await transaction.pageImage.updateMany({
              where: {
                pageId: input.pageId,
                id: { in: input.images.map((image) => image.imageId) },
              },
              data: { sortOrder: null },
            });
          }

          for (const image of input.images) {
            const attached = await transaction.pageImage.updateMany({
              where: {
                id: image.imageId,
                pageId: input.pageId,
                state: 'READY',
                storageKey: { not: null },
                outputByteSize: { not: null },
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
              },
              data: {
                attachedAt: new Date(),
                sortOrder: image.sortOrder,
                caption: image.caption ?? null,
                expiresAt: null,
              },
            });

            if (attached.count !== 1) {
              throw new PageImageStateChangedError();
            }
          }
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
    } catch (error: unknown) {
      if (error instanceof PageImageStateChangedError) {
        return { type: 'invalid_image' };
      }

      throw error;
    }
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
        select: { id: true, archivedAt: true },
      });

      if (!page) {
        return 'not_found';
      }

      const pageLock = await transaction.page.updateMany({
        where: {
          id: page.id,
          creatorId: input.creatorId,
        },
        data: {
          archivedAt: page.archivedAt,
        },
      });

      if (pageLock.count === 0) {
        return 'not_found';
      }

      const images = await transaction.pageImage.findMany({
        where: { pageId: page.id },
        select: { storageKey: true, sourceStorageKey: true },
      });
      const cleanupKeys = new Set<string>();

      for (const image of images) {
        if (image.storageKey) cleanupKeys.add(image.storageKey);
        if (image.sourceStorageKey) cleanupKeys.add(image.sourceStorageKey);
      }

      if (cleanupKeys.size > 0) {
        await transaction.mediaCleanup.createMany({
          data: Array.from(cleanupKeys, (objectKey) => ({
            objectKey,
            nextRetryAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }

      const reservations = await transaction.pageSlugReservation.findMany({
        where: { pageId: page.id },
        select: { id: true },
      });

      await transaction.page.delete({
        where: { id: page.id },
      });

      if (reservations.length === 0) {
        return 'deleted';
      }

      await transaction.pageSlugReservation.updateMany({
        where: {
          id: { in: reservations.map((reservation) => reservation.id) },
        },
        data: {
          pageId: null,
          isCurrent: false,
        },
      });

      return 'deleted';
    });
  }

  async publishPage(
    input: PublishPageInput,
  ): Promise<PageLifecycleMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: {
            id: true,
            slug: true,
            status: true,
            contentVersion: true,
            publishedAt: true,
          },
        });

        if (!current) {
          return { type: 'not_found' as const };
        }

        if (current.status !== 'DRAFT' && current.status !== 'UNPUBLISHED') {
          return { type: 'invalid_state' as const };
        }

        if (current.contentVersion !== input.expectedContentVersion) {
          return { type: 'invalid_state' as const };
        }

        if (
          (current.status === 'UNPUBLISHED' ||
            (current.publishedAt !== null &&
              current.publishedAt !== undefined)) &&
          input.customSlug !== null &&
          input.customSlug !== current.slug
        ) {
          return { type: 'invalid_state' as const };
        }

        const currentReservation =
          await transaction.pageSlugReservation.findFirst({
            where: {
              pageId: current.id,
              isCurrent: true,
            },
            select: {
              id: true,
              normalizedSlug: true,
            },
          });

        if (
          !currentReservation ||
          currentReservation.normalizedSlug !== current.slug
        ) {
          return { type: 'slug_allocation_failed' as const };
        }

        const nextSlug = input.customSlug ?? current.slug;

        if (nextSlug !== current.slug) {
          const taken = await transaction.pageSlugReservation.findUnique({
            where: { normalizedSlug: nextSlug },
            select: { id: true },
          });

          if (taken) {
            return { type: 'slug_already_taken' as const };
          }
        }

        const updatedCount = await transaction.page.updateMany({
          where: {
            id: current.id,
            creatorId: input.creatorId,
            status: current.status,
            slug: current.slug,
            contentVersion: input.expectedContentVersion,
          },
          data: {
            slug: nextSlug,
            displaySlug: nextSlug,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            unpublishedAt: null,
          },
        });

        if (updatedCount.count === 0) {
          return { type: 'invalid_state' as const };
        }

        if (nextSlug !== current.slug) {
          const reservationUpdate =
            await transaction.pageSlugReservation.updateMany({
              where: {
                id: currentReservation.id,
                pageId: current.id,
                normalizedSlug: current.slug,
                isCurrent: true,
              },
              data: { isCurrent: false },
            });

          if (reservationUpdate.count === 0) {
            throw new LifecycleStateChangedError();
          }

          await transaction.pageSlugReservation.create({
            data: {
              normalizedSlug: nextSlug,
              pageId: current.id,
              isCurrent: true,
            },
          });
        }

        const updated = await transaction.page.findFirst({
          where: {
            id: current.id,
            creatorId: input.creatorId,
          },
          select: lifecyclePageSelect,
        });

        if (!updated) {
          throw new LifecycleStateChangedError();
        }

        return {
          type: 'updated' as const,
          page: mapOwnerPage(updated),
          publishedAt: updated.publishedAt,
          unpublishedAt: updated.unpublishedAt,
        };
      });
    } catch (error: unknown) {
      if (error instanceof LifecycleStateChangedError) {
        return { type: 'invalid_state' };
      }

      if (isUniqueViolation(error)) {
        return { type: 'slug_already_taken' };
      }

      throw error;
    }
  }

  async unpublishPage(
    input: UnpublishPageInput,
  ): Promise<PageLifecycleMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: { id: true, status: true },
        });

        if (!current) {
          return { type: 'not_found' as const };
        }

        if (current.status !== 'PUBLISHED') {
          return { type: 'invalid_state' as const };
        }

        const updatedCount = await transaction.page.updateMany({
          where: {
            id: current.id,
            creatorId: input.creatorId,
            status: 'PUBLISHED',
          },
          data: {
            status: 'UNPUBLISHED',
            unpublishedAt: new Date(),
          },
        });

        if (updatedCount.count === 0) {
          return { type: 'invalid_state' as const };
        }

        const updated = await transaction.page.findFirst({
          where: {
            id: current.id,
            creatorId: input.creatorId,
          },
          select: lifecyclePageSelect,
        });

        if (!updated) {
          throw new LifecycleStateChangedError();
        }

        return {
          type: 'updated' as const,
          page: mapOwnerPage(updated),
          publishedAt: updated.publishedAt,
          unpublishedAt: updated.unpublishedAt,
        };
      });
    } catch (error: unknown) {
      if (error instanceof LifecycleStateChangedError) {
        return { type: 'invalid_state' };
      }

      throw error;
    }
  }

  async archivePage(
    input: ArchivePageInput,
  ): Promise<PageLifecycleMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: { id: true, status: true },
        });

        if (!current) {
          return { type: 'not_found' as const };
        }

        if (
          current.status !== 'DRAFT' &&
          current.status !== 'PUBLISHED' &&
          current.status !== 'UNPUBLISHED'
        ) {
          return { type: 'invalid_state' as const };
        }

        const updatedCount = await transaction.page.updateMany({
          where: {
            id: current.id,
            creatorId: input.creatorId,
            status: current.status,
          },
          data: {
            status: 'ARCHIVED',
            archivedAt: new Date(),
          },
        });

        if (updatedCount.count === 0) {
          return { type: 'invalid_state' as const };
        }

        const updated = await transaction.page.findFirst({
          where: {
            id: current.id,
            creatorId: input.creatorId,
          },
          select: lifecyclePageSelect,
        });

        if (!updated) {
          throw new LifecycleStateChangedError();
        }

        return {
          type: 'updated' as const,
          page: mapOwnerPage(updated),
          publishedAt: updated.publishedAt,
          unpublishedAt: updated.unpublishedAt,
        };
      });
    } catch (error: unknown) {
      if (error instanceof LifecycleStateChangedError) {
        return { type: 'invalid_state' };
      }

      throw error;
    }
  }

  async restorePage(
    input: RestorePageInput,
  ): Promise<PageLifecycleMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: { id: true, status: true, publishedAt: true },
        });

        if (!current) {
          return { type: 'not_found' as const };
        }

        if (current.status !== 'ARCHIVED') {
          return { type: 'invalid_state' as const };
        }

        const updatedCount = await transaction.page.updateMany({
          where: {
            id: current.id,
            creatorId: input.creatorId,
            status: 'ARCHIVED',
          },
          data:
            current.publishedAt !== null && current.publishedAt !== undefined
              ? { status: 'UNPUBLISHED', unpublishedAt: new Date() }
              : { status: 'DRAFT' },
        });

        if (updatedCount.count === 0) {
          return { type: 'invalid_state' as const };
        }

        const updated = await transaction.page.findFirst({
          where: {
            id: current.id,
            creatorId: input.creatorId,
          },
          select: lifecyclePageSelect,
        });

        if (!updated) {
          throw new LifecycleStateChangedError();
        }

        return {
          type: 'updated' as const,
          page: mapOwnerPage(updated),
          publishedAt: updated.publishedAt,
          unpublishedAt: updated.unpublishedAt,
        };
      });
    } catch (error: unknown) {
      if (error instanceof LifecycleStateChangedError) {
        return { type: 'invalid_state' };
      }

      throw error;
    }
  }

  async changePublishedSlug(
    input: ChangePublishedSlugInput,
  ): Promise<PageLifecycleMutationResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const current = await transaction.page.findFirst({
          where: {
            id: input.pageId,
            creatorId: input.creatorId,
          },
          select: {
            id: true,
            slug: true,
            status: true,
            publishedAt: true,
          },
        });

        if (!current) {
          return { type: 'not_found' as const };
        }

        if (
          current.status !== 'DRAFT' ||
          (current.publishedAt !== null && current.publishedAt !== undefined)
        ) {
          return { type: 'invalid_state' as const };
        }

        const currentReservation =
          await transaction.pageSlugReservation.findFirst({
            where: {
              pageId: current.id,
              isCurrent: true,
            },
            select: {
              id: true,
              normalizedSlug: true,
            },
          });

        if (
          !currentReservation ||
          currentReservation.normalizedSlug !== current.slug
        ) {
          return { type: 'slug_allocation_failed' as const };
        }

        if (input.customSlug === current.slug) {
          const page = await transaction.page.findFirst({
            where: {
              id: current.id,
              creatorId: input.creatorId,
              status: 'DRAFT',
            },
            select: lifecyclePageSelect,
          });

          return page
            ? {
                type: 'updated' as const,
                page: mapOwnerPage(page),
                publishedAt: page.publishedAt,
                unpublishedAt: page.unpublishedAt,
              }
            : { type: 'not_found' as const };
        }

        const taken = await transaction.pageSlugReservation.findUnique({
          where: { normalizedSlug: input.customSlug },
          select: { id: true },
        });

        if (taken) {
          return { type: 'slug_already_taken' as const };
        }

        const updatedCount = await transaction.page.updateMany({
          where: {
            id: current.id,
            creatorId: input.creatorId,
            status: 'DRAFT',
            slug: current.slug,
          },
          data: {
            slug: input.customSlug,
            displaySlug: input.customSlug,
          },
        });

        if (updatedCount.count === 0) {
          return { type: 'invalid_state' as const };
        }

        const reservationUpdate =
          await transaction.pageSlugReservation.updateMany({
            where: {
              id: currentReservation.id,
              pageId: current.id,
              normalizedSlug: current.slug,
              isCurrent: true,
            },
            data: { isCurrent: false },
          });

        if (reservationUpdate.count === 0) {
          throw new LifecycleStateChangedError();
        }

        await transaction.pageSlugReservation.create({
          data: {
            normalizedSlug: input.customSlug,
            pageId: current.id,
            isCurrent: true,
          },
        });

        const updated = await transaction.page.findFirst({
          where: {
            id: current.id,
            creatorId: input.creatorId,
          },
          select: lifecyclePageSelect,
        });

        if (!updated) {
          throw new LifecycleStateChangedError();
        }

        return {
          type: 'updated' as const,
          page: mapOwnerPage(updated),
          publishedAt: updated.publishedAt,
          unpublishedAt: updated.unpublishedAt,
        };
      });
    } catch (error: unknown) {
      if (error instanceof LifecycleStateChangedError) {
        return { type: 'invalid_state' };
      }

      if (isUniqueViolation(error)) {
        return { type: 'slug_already_taken' };
      }

      throw error;
    }
  }

  async findPublicPageBySlug(
    normalizedSlug: string,
  ): Promise<PublicPage | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        slug: normalizedSlug,
        status: 'PUBLISHED',
        slugReservations: {
          some: {
            normalizedSlug,
            isCurrent: true,
          },
        },
      },
      select: publicPageSelect,
    });

    return page ? mapPublicPage(page) : null;
  }
}
