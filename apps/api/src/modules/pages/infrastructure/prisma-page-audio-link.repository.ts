import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@letterly/database';
import {
  templateRegistry,
  type TemplateAudioCapability,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import { publicPageAvailabilityWhere } from '../application/public-availability';
import {
  type AttachAudioLinkResult,
  type OwnerAudioSlotResult,
  type PageAudioLinkRecord,
  type PageAudioLinkRepository,
} from '../application/page-audio-link.repository';
import { PAGE_AUDIO_TRANSACTION_TIMEOUT_MS } from './prisma-page-audio.repository';

function resolveAudioCapability(
  registryKey: string | null | undefined,
  version: number | null | undefined,
): TemplateAudioCapability {
  const template = Object.values(templateRegistry).find(
    (candidate) =>
      candidate.registryKey === registryKey && candidate.version === version,
  );
  return template?.audioCapability ?? 'hidden';
}

async function lockOwnedPage(
  transaction: Pick<Prisma.TransactionClient, '$queryRaw'>,
  pageId: string,
  creatorId: string,
): Promise<boolean> {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Page"
    WHERE "id" = CAST(${pageId} AS uuid)
      AND "creatorId" = ${creatorId}
    FOR UPDATE
  `;
  return rows.length > 0;
}

const linkSelect = {
  id: true,
  pageId: true,
  provider: true,
  videoId: true,
} as const;

@Injectable()
export class PrismaPageAudioLinkRepository implements PageAudioLinkRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getOwnerAudioSlot(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerAudioSlotResult> {
    const page = await this.prisma.page.findFirst({
      where: { id: input.pageId, creatorId: input.creatorId },
      select: {
        id: true,
        currentAudioId: true,
        currentAudioLink: { select: linkSelect },
        templateVersion: {
          select: { registryKey: true, version: true },
        },
        audioUploads: {
          where: {
            OR: [
              { state: 'UPLOADING', uploadExpiresAt: { gt: new Date() } },
              {
                state: 'VERIFYING',
                processingLeaseExpiresAt: { gt: new Date() },
              },
            ],
          },
          select: { id: true },
          take: 1,
        },
      },
    });
    if (!page) return { type: 'not_found' };
    const link = page.currentAudioLink;
    return {
      type: 'found',
      slot: {
        audioCapability: resolveAudioCapability(
          page.templateVersion.registryKey,
          page.templateVersion.version,
        ),
        currentAudioId: page.currentAudioId,
        currentAudioLink: link?.pageId === page.id ? link : null,
        hasActiveUpload: page.audioUploads.length > 0,
      },
    };
  }

  async attachAudioLink(input: {
    creatorId: string;
    pageId: string;
    linkId: string;
    videoId: string;
  }): Promise<AttachAudioLinkResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        if (
          !(await lockOwnedPage(transaction, input.pageId, input.creatorId))
        ) {
          return { type: 'not_found' as const };
        }
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: {
            id: true,
            currentAudioId: true,
            currentAudioLinkId: true,
            currentAudioLink: { select: linkSelect },
            templateVersion: {
              select: { registryKey: true, version: true },
            },
          },
        });
        if (!page) return { type: 'not_found' as const };
        if (
          resolveAudioCapability(
            page.templateVersion.registryKey,
            page.templateVersion.version,
          ) === 'hidden'
        ) {
          return { type: 'unsupported_capability' as const };
        }

        if (page.currentAudioLinkId) {
          const current = page.currentAudioLink;
          if (
            current?.pageId === page.id &&
            current.videoId === input.videoId
          ) {
            return {
              type: 'existing' as const,
              link: current,
            };
          }
          return { type: 'occupied' as const };
        }
        if (page.currentAudioId) return { type: 'occupied' as const };

        const now = new Date();
        const activeUpload = await transaction.pageAudio.findFirst({
          where: {
            pageId: input.pageId,
            OR: [
              { state: 'UPLOADING', uploadExpiresAt: { gt: now } },
              {
                state: 'VERIFYING',
                processingLeaseExpiresAt: { gt: now },
              },
            ],
          },
          select: { id: true },
        });
        if (activeUpload) return { type: 'active_upload' as const };

        const prior = await transaction.pageAudioLink.findUnique({
          where: { pageId: input.pageId },
          select: { id: true },
        });
        if (prior) return { type: 'occupied' as const };

        const link = await transaction.pageAudioLink.create({
          data: {
            id: input.linkId,
            pageId: input.pageId,
            videoId: input.videoId,
          },
          select: linkSelect,
        });
        await transaction.page.update({
          where: { id: input.pageId },
          data: { currentAudioLinkId: link.id },
        });
        return { type: 'created' as const, link };
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async getPublicAudioLink(input: {
    slug: string;
  }): Promise<PageAudioLinkRecord | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        ...publicPageAvailabilityWhere(input.slug),
        currentAudioLinkId: { not: null },
      },
      select: {
        id: true,
        currentAudioLink: { select: linkSelect },
        templateVersion: {
          select: { registryKey: true, version: true },
        },
      },
    });
    if (
      !page ||
      !page.currentAudioLink ||
      page.currentAudioLink.pageId !== page.id
    ) {
      return null;
    }
    if (
      resolveAudioCapability(
        page.templateVersion.registryKey,
        page.templateVersion.version,
      ) === 'hidden'
    ) {
      return null;
    }
    return page.currentAudioLink;
  }
}
