import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@letterly/database';
import {
  templateRegistry,
  type TemplateAudioCapability,
} from '@letterly/templates';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma.provider';
import type {
  ClaimAudioResult,
  PageAudioRecord,
  PageAudioRepository,
  PrepareAudioResult,
  RetryAudioResult,
} from '../application/page-audio.repository';
import { publicPageAvailabilityWhere } from '../application/public-availability';

export const PAGE_AUDIO_TRANSACTION_TIMEOUT_MS = 30_000;

const recordSelect = {
  id: true,
  pageId: true,
  state: true,
  sourceStorageKey: true,
  sourceMimeType: true,
  displayTitle: true,
  sourceByteSize: true,
  sourceSha256: true,
  durationMilliseconds: true,
  rightsConfirmedAt: true,
  rightsStatementVersion: true,
  failureCode: true,
  processingLeaseExpiresAt: true,
  uploadExpiresAt: true,
  expiresAt: true,
} as const;

async function lockOwnedPage(
  transaction: Pick<Prisma.TransactionClient, '$queryRaw'>,
  pageId: string,
  creatorId: string,
): Promise<boolean> {
  const pages = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Page"
    WHERE "id" = CAST(${pageId} AS uuid)
      AND "creatorId" = ${creatorId}
    FOR UPDATE
  `;
  return pages.length > 0;
}

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

async function findOwnedPageTemplate(
  transaction: Pick<Prisma.TransactionClient, 'page'>,
  pageId: string,
  creatorId: string,
) {
  return transaction.page.findFirst({
    where: { id: pageId, creatorId },
    select: {
      currentAudioId: true,
      currentAudioLinkId: true,
      templateVersion: {
        select: { registryKey: true, version: true },
      },
    },
  });
}

@Injectable()
export class PrismaPageAudioRepository implements PageAudioRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async prepareAudio(
    input: Parameters<PageAudioRepository['prepareAudio']>[0],
  ): Promise<PrepareAudioResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        if (
          !(await lockOwnedPage(transaction, input.pageId, input.creatorId))
        ) {
          return { type: 'not_found' };
        }

        const page = await findOwnedPageTemplate(
          transaction,
          input.pageId,
          input.creatorId,
        );
        if (!page) return { type: 'not_found' };
        if (
          resolveAudioCapability(
            page.templateVersion.registryKey,
            page.templateVersion.version,
          ) === 'hidden'
        ) {
          return { type: 'unsupported_capability' };
        }
        if (page.currentAudioId || page.currentAudioLinkId) {
          return { type: 'occupied' };
        }

        const active = await transaction.pageAudio.findFirst({
          where: {
            pageId: input.pageId,
            OR: [
              { state: 'UPLOADING', uploadExpiresAt: { gt: new Date() } },
              {
                state: 'VERIFYING',
                processingLeaseExpiresAt: { gt: new Date() },
              },
            ],
          },
          select: { id: true },
        });
        if (active) return { type: 'active_upload' };

        const audio = await transaction.pageAudio.create({
          data: {
            id: input.audioId,
            pageId: input.pageId,
            sourceStorageKey: input.sourceStorageKey,
            sourceMimeType: input.sourceMimeType,
            displayTitle: input.displayTitle,
            sourceByteSize: input.sourceByteSize,
            sourceSha256: input.sourceSha256,
            durationMilliseconds: input.durationMilliseconds,
            rightsConfirmedAt: new Date(),
            rightsStatementVersion: input.rightsStatementVersion,
            uploadExpiresAt: input.uploadExpiresAt,
            expiresAt: input.expiresAt,
          },
          select: recordSelect,
        });
        return { type: 'created', audio };
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async claimAudio(
    input: Parameters<PageAudioRepository['claimAudio']>[0],
  ): Promise<ClaimAudioResult> {
    return this.prisma.$transaction(async (transaction) => {
      if (!(await lockOwnedPage(transaction, input.pageId, input.creatorId))) {
        return { type: 'not_found' };
      }
      const audio = await transaction.pageAudio.findFirst({
        where: {
          id: input.audioId,
          pageId: input.pageId,
          page: { creatorId: input.creatorId },
        },
        select: recordSelect,
      });
      if (!audio) return { type: 'not_found' };

      const page = await findOwnedPageTemplate(
        transaction,
        input.pageId,
        input.creatorId,
      );
      if (!page) return { type: 'not_found' };
      if (
        resolveAudioCapability(
          page.templateVersion.registryKey,
          page.templateVersion.version,
        ) === 'hidden'
      ) {
        return { type: 'unsupported_capability' };
      }

      if (audio.state === 'READY') return { type: 'ready', audio };

      const canClaimUpload =
        audio.state === 'UPLOADING' && audio.uploadExpiresAt > input.now;
      const canReclaimVerification =
        audio.state === 'VERIFYING' &&
        audio.processingLeaseExpiresAt !== null &&
        audio.processingLeaseExpiresAt <= input.now;
      if (!canClaimUpload && !canReclaimVerification)
        return { type: 'not_ready' };
      if (
        (page.currentAudioId && page.currentAudioId !== audio.id) ||
        page.currentAudioLinkId
      ) {
        return { type: 'not_ready' };
      }

      const claimState = canClaimUpload ? 'UPLOADING' : 'VERIFYING';
      const claimed = await transaction.pageAudio.updateMany({
        where: {
          id: input.audioId,
          pageId: input.pageId,
          state: claimState,
          ...(canClaimUpload
            ? { uploadExpiresAt: { gt: input.now } }
            : { processingLeaseExpiresAt: { lte: input.now } }),
        },
        data: {
          state: 'VERIFYING',
          processingLeaseExpiresAt: input.leaseExpiresAt,
        },
      });
      if (claimed.count === 0) return { type: 'processing' };
      return {
        type: 'claimed',
        audio: {
          ...audio,
          state: 'VERIFYING',
          processingLeaseExpiresAt: input.leaseExpiresAt,
        },
      };
    });
  }

  async retryAudio(
    input: Parameters<PageAudioRepository['retryAudio']>[0],
  ): Promise<RetryAudioResult> {
    return this.prisma.$transaction(
      async (transaction) => {
        if (
          !(await lockOwnedPage(transaction, input.pageId, input.creatorId))
        ) {
          return { type: 'not_found' as const };
        }

        const page = await findOwnedPageTemplate(
          transaction,
          input.pageId,
          input.creatorId,
        );
        if (!page) return { type: 'not_found' as const };
        if (
          resolveAudioCapability(
            page.templateVersion.registryKey,
            page.templateVersion.version,
          ) === 'hidden'
        ) {
          return { type: 'unsupported_capability' as const };
        }

        if (page.currentAudioId || page.currentAudioLinkId) {
          return { type: 'occupied' as const };
        }

        const active = await transaction.pageAudio.findFirst({
          where: {
            pageId: input.pageId,
            OR: [
              { state: 'UPLOADING', uploadExpiresAt: { gt: new Date() } },
              {
                state: 'VERIFYING',
                processingLeaseExpiresAt: { gt: new Date() },
              },
            ],
          },
          select: { id: true },
        });
        if (active) return { type: 'active_upload' as const };

        const failed = await transaction.pageAudio.findFirst({
          where: {
            id: input.audioId,
            pageId: input.pageId,
            state: { in: ['FAILED', 'EXPIRED'] },
            page: { creatorId: input.creatorId },
          },
          select: recordSelect,
        });
        if (!failed) return { type: 'unavailable' as const };

        if (failed.sourceStorageKey) {
          await transaction.mediaCleanup.upsert({
            where: { objectKey: failed.sourceStorageKey },
            create: {
              objectKey: failed.sourceStorageKey,
              nextRetryAt: new Date(),
            },
            update: {},
          });
        }

        const audio = await transaction.pageAudio.create({
          data: {
            id: input.newAudioId,
            pageId: input.pageId,
            state: 'UPLOADING',
            sourceStorageKey: input.sourceStorageKey,
            sourceMimeType: input.sourceMimeType,
            displayTitle: input.displayTitle,
            sourceByteSize: input.sourceByteSize,
            sourceSha256: input.sourceSha256,
            durationMilliseconds: input.durationMilliseconds,
            rightsConfirmedAt: new Date(),
            rightsStatementVersion: input.rightsStatementVersion,
            uploadExpiresAt: input.uploadExpiresAt,
            expiresAt: input.expiresAt,
          },
          select: recordSelect,
        });

        return { type: 'created' as const, audio };
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async markAudioReady(
    input: Parameters<PageAudioRepository['markAudioReady']>[0],
  ): Promise<PageAudioRecord | null> {
    return this.prisma.$transaction(
      async (transaction) => {
        if (
          !(await lockOwnedPage(transaction, input.pageId, input.creatorId))
        ) {
          return null;
        }
        const audio = await transaction.pageAudio.findFirst({
          where: {
            id: input.audioId,
            pageId: input.pageId,
            state: 'VERIFYING',
            sourceStorageKey: input.expectedSourceStorageKey,
            page: { creatorId: input.creatorId },
          },
          select: recordSelect,
        });
        if (!audio) return null;
        const page = await transaction.page.findFirst({
          where: { id: input.pageId, creatorId: input.creatorId },
          select: { currentAudioId: true, currentAudioLinkId: true },
        });
        if (!page) return null;
        if (page.currentAudioId || page.currentAudioLinkId) return null;
        await transaction.pageAudio.update({
          where: { id: audio.id },
          data: {
            state: 'READY',
            processingLeaseExpiresAt: null,
            expiresAt: null,
          },
        });
        await transaction.page.update({
          where: { id: input.pageId },
          data: { currentAudioId: audio.id },
        });
        return {
          ...audio,
          state: 'READY',
          processingLeaseExpiresAt: null,
          expiresAt: null,
        };
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async markAudioFailed(
    input: Parameters<PageAudioRepository['markAudioFailed']>[0],
  ): Promise<void> {
    await this.prisma.pageAudio.updateMany({
      where: {
        id: input.audioId,
        pageId: input.pageId,
        page: { creatorId: input.creatorId },
        state: { in: ['UPLOADING', 'VERIFYING'] },
        ...(input.expectedSourceStorageKey
          ? { sourceStorageKey: input.expectedSourceStorageKey }
          : {}),
      },
      data: {
        state: 'FAILED',
        failureCode: input.failureCode,
        processingLeaseExpiresAt: null,
      },
    });
  }

  async removeCurrentAudio(
    input: Parameters<PageAudioRepository['removeCurrentAudio']>[0],
  ) {
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
            templateVersion: {
              select: { registryKey: true, version: true },
            },
            currentAudio: { select: recordSelect },
            currentAudioLink: { select: { id: true } },
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
        const pendingUploads = await transaction.pageAudio.findMany({
          where: {
            pageId: input.pageId,
            state: { in: ['UPLOADING', 'VERIFYING'] },
          },
          select: { id: true, sourceStorageKey: true },
        });
        if (
          !page.currentAudio &&
          !page.currentAudioLink &&
          pendingUploads.length === 0
        ) {
          return { type: 'none' as const };
        }

        await transaction.page.update({
          where: { id: input.pageId },
          data: { currentAudioId: null, currentAudioLinkId: null },
        });
        if (page.currentAudio) {
          await transaction.pageAudio.update({
            where: { id: page.currentAudio.id },
            data: { state: 'EXPIRED', expiresAt: new Date() },
          });
        }
        if (pendingUploads.length > 0) {
          await transaction.pageAudio.updateMany({
            where: {
              id: { in: pendingUploads.map((audio) => audio.id) },
              state: { in: ['UPLOADING', 'VERIFYING'] },
            },
            data: { state: 'EXPIRED', expiresAt: new Date() },
          });
        }
        if (page.currentAudioLink) {
          await transaction.pageAudioLink.delete({
            where: { id: page.currentAudioLink.id },
          });
        }

        const storageKeys = new Set(
          [
            page.currentAudio?.sourceStorageKey,
            ...pendingUploads.map((audio) => audio.sourceStorageKey),
          ].filter(
            (key): key is string => typeof key === 'string' && key.length > 0,
          ),
        );
        for (const objectKey of storageKeys) {
          await transaction.mediaCleanup.upsert({
            where: { objectKey },
            create: { objectKey },
            update: {},
          });
        }
        return {
          type: 'removed' as const,
          ...(page.currentAudio ? { audio: page.currentAudio } : {}),
        };
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async expireAudio(input: { now: Date }): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const expired = await transaction.pageAudio.findMany({
          where: {
            OR: [
              {
                state: { in: ['UPLOADING', 'FAILED'] },
                expiresAt: { lte: input.now },
              },
              {
                state: 'VERIFYING',
                processingLeaseExpiresAt: { lte: input.now },
              },
            ],
          },
          select: { id: true, sourceStorageKey: true },
        });
        if (expired.length === 0) return;
        await transaction.pageAudio.updateMany({
          where: { id: { in: expired.map((audio) => audio.id) } },
          data: { state: 'EXPIRED' },
        });
        await transaction.mediaCleanup.createMany({
          data: expired.flatMap((audio) =>
            audio.sourceStorageKey
              ? [{ objectKey: audio.sourceStorageKey }]
              : [],
          ),
          skipDuplicates: true,
        });
      },
      {
        maxWait: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
        timeout: PAGE_AUDIO_TRANSACTION_TIMEOUT_MS,
      },
    );
  }

  async getPublicAudio(input: {
    slug: string;
  }): Promise<PageAudioRecord | null> {
    const page = await this.prisma.page.findFirst({
      where: {
        ...publicPageAvailabilityWhere(input.slug),
        currentAudioId: { not: null },
      },
      select: {
        templateVersion: {
          select: { registryKey: true, version: true },
        },
        currentAudio: { select: recordSelect },
      },
    });
    if (
      !page ||
      resolveAudioCapability(
        page.templateVersion.registryKey,
        page.templateVersion.version,
      ) === 'hidden' ||
      !page.currentAudio ||
      page.currentAudio.state !== 'READY'
    ) {
      return null;
    }
    return page.currentAudio;
  }

  async getOwnerAudio(input: {
    creatorId: string;
    pageId: string;
  }): Promise<PageAudioRecord | null> {
    const page = await this.prisma.page.findFirst({
      where: { id: input.pageId, creatorId: input.creatorId },
      select: {
        templateVersion: {
          select: { registryKey: true, version: true },
        },
        currentAudio: { select: recordSelect },
      },
    });
    if (
      !page ||
      resolveAudioCapability(
        page.templateVersion.registryKey,
        page.templateVersion.version,
      ) === 'hidden'
    ) {
      return null;
    }
    return page.currentAudio?.state === 'READY' ? page.currentAudio : null;
  }
}
