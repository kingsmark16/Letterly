import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import { lockPageBarrier } from '../../../infrastructure/database/page-barrier';
import {
  ProcessingUnavailableError,
  type MediaProcessingControl,
  type ProcessingAttempt,
} from '../application/media-processing-control';
import { processingInstanceId } from './media-processing-identity';

@Injectable()
export class PrismaMediaProcessingControl implements MediaProcessingControl {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}
  async recordGrant(
    input: Parameters<MediaProcessingControl['recordGrant']>[0],
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (
        !(await lockPageBarrier(tx, input.pageId, {
          creatorId: input.creatorId,
        }))
      )
        throw new ProcessingUnavailableError();
      const where = {
        id: input.mediaId,
        pageId: input.pageId,
        sourceStorageKey: input.objectKey,
        state: 'UPLOADING' as const,
      };
      const updated =
        input.kind === 'IMAGE'
          ? await tx.pageImage.updateMany({
              where,
              data: { uploadExpiresAt: input.expiresAt },
            })
          : await tx.pageAudio.updateMany({
              where,
              data: { uploadExpiresAt: input.expiresAt },
            });
      if (updated.count !== 1) throw new ProcessingUnavailableError();
      await tx.pageUploadGrant.create({
        data: {
          pageId: input.pageId,
          mediaType: input.kind,
          mediaId: input.mediaId,
          objectKey: input.objectKey,
          issuedAt: input.issuedAt,
          expiresAt: input.expiresAt,
        },
      });
    });
  }
  async beforeWrite(input: ProcessingAttempt & { objectKey: string }) {
    await this.withAttempt(input, false, async (tx, row, now) => {
      if (
        row.processingState !== 'RUNNING' ||
        !row.processingLeaseExpiresAt ||
        row.processingLeaseExpiresAt <= now ||
        !Array.isArray(row.outputManifest) ||
        !row.outputManifest.includes(input.objectKey) ||
        ['IN_FLIGHT', 'UNCERTAIN'].includes(row.storageWriteState)
      )
        throw new ProcessingUnavailableError();
      await this.update(tx, input, { storageWriteState: 'IN_FLIGHT' });
    });
  }
  async afterWrite(input: ProcessingAttempt, outcome: 'SETTLED' | 'UNCERTAIN') {
    await this.withAttempt(input, true, async (tx, row) => {
      if (row.storageWriteState !== 'IN_FLIGHT')
        throw new ProcessingUnavailableError();
      await this.update(tx, input, {
        storageWriteState: outcome,
        ...(outcome === 'UNCERTAIN' ? { processingState: 'UNCERTAIN' } : {}),
      });
    });
  }
  async settle(input: ProcessingAttempt) {
    await this.withAttempt(input, true, async (tx, row, now) => {
      if (
        row.processingState === 'UNCERTAIN' ||
        ['IN_FLIGHT', 'UNCERTAIN'].includes(row.storageWriteState)
      )
        return;
      await this.update(tx, input, {
        processingState: 'QUIESCED',
        settledAt: now,
        processingLeaseExpiresAt: null,
      });
    });
  }
  private async withAttempt(
    input: ProcessingAttempt,
    allowDeletion: boolean,
    operation: (
      tx: Prisma.TransactionClient,
      row:
        | Prisma.PageImageGetPayload<Record<string, never>>
        | Prisma.PageAudioGetPayload<Record<string, never>>,
      now: Date,
    ) => Promise<void>,
  ) {
    await this.prisma.$transaction(async (tx) => {
      if (
        !(await lockPageBarrier(tx, input.pageId, {
          creatorId: input.creatorId,
          allowDeletion,
        }))
      )
        throw new ProcessingUnavailableError();
      const row =
        input.kind === 'IMAGE'
          ? await tx.pageImage.findUnique({ where: { id: input.mediaId } })
          : await tx.pageAudio.findUnique({ where: { id: input.mediaId } });
      if (
        !row ||
        row.pageId !== input.pageId.toLowerCase() ||
        row.attemptToken !== input.attemptToken ||
        row.processingInstanceId !== processingInstanceId
      )
        throw new ProcessingUnavailableError();
      const now = (
        await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`
      )[0]!.now;
      await operation(tx, row, now);
    });
  }
  private async update(
    tx: Prisma.TransactionClient,
    input: ProcessingAttempt,
    data: Pick<
      Prisma.PageImageUpdateManyMutationInput,
      | 'storageWriteState'
      | 'processingState'
      | 'settledAt'
      | 'processingLeaseExpiresAt'
    >,
  ) {
    const where = {
      id: input.mediaId,
      attemptToken: input.attemptToken,
      processingInstanceId,
    };
    if (input.kind === 'IMAGE') await tx.pageImage.updateMany({ where, data });
    else await tx.pageAudio.updateMany({ where, data });
  }
}
