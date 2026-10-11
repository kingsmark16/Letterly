import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import type {
  MediaCleanupRepository,
  MediaCleanupTask,
} from '../application/media-cleanup.repository';
import { MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS } from './media-cleanup-persistence';

const CLEANUP_MAX_ATTEMPTS = 5;
const CLEANUP_BACKOFF_MS = 60_000;

@Injectable()
export class PrismaMediaCleanupRepository implements MediaCleanupRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async claimCleanupTasks(input: {
    now: Date;
    workerId: string;
    leaseExpiresAt: Date;
    limit: number;
  }): Promise<MediaCleanupTask[]> {
    const candidates = await this.prisma.mediaCleanup.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: input.now } }],
        AND: [
          {
            OR: [
              { leaseExpiresAt: null },
              { leaseExpiresAt: { lte: input.now } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: input.limit,
      select: {
        id: true,
        objectKey: true,
        status: true,
        attempts: true,
        nextRetryAt: true,
        lastFailureCode: true,
        leaseOwner: true,
        leaseExpiresAt: true,
      },
    });
    const claimed: MediaCleanupTask[] = [];

    for (const candidate of candidates) {
      const updated = await this.prisma.mediaCleanup.updateMany({
        where: {
          id: candidate.id,
          status: 'PENDING',
          OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: input.now } }],
          AND: [
            {
              OR: [
                { leaseExpiresAt: null },
                { leaseExpiresAt: { lte: input.now } },
              ],
            },
          ],
        },
        data: {
          leaseOwner: input.workerId,
          leaseExpiresAt: input.leaseExpiresAt,
        },
      });

      if (updated.count > 0) {
        claimed.push({
          ...candidate,
          leaseOwner: input.workerId,
          leaseExpiresAt: input.leaseExpiresAt,
        });
      }
    }

    return claimed;
  }

  async markCleanupSucceeded(input: {
    taskId: string;
    workerId: string;
  }): Promise<void> {
    await this.prisma.mediaCleanup.deleteMany({
      where: {
        id: input.taskId,
        status: 'PENDING',
        leaseOwner: input.workerId,
      },
    });
  }

  async markCleanupFailed(input: {
    taskId: string;
    workerId: string;
    now: Date;
    failureCode: string;
  }): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const task = await transaction.mediaCleanup.findFirst({
          where: {
            id: input.taskId,
            status: 'PENDING',
            leaseOwner: input.workerId,
          },
          select: { attempts: true },
        });

        if (!task) return;

        const attempts = task.attempts + 1;
        const review = attempts >= CLEANUP_MAX_ATTEMPTS;

        await transaction.mediaCleanup.updateMany({
          where: {
            id: input.taskId,
            status: 'PENDING',
            leaseOwner: input.workerId,
          },
          data: {
            status: review ? 'REVIEW' : 'PENDING',
            attempts,
            nextRetryAt: review
              ? null
              : new Date(
                  input.now.getTime() +
                    CLEANUP_BACKOFF_MS * 2 ** (attempts - 1),
                ),
            lastFailureCode: input.failureCode,
            leaseOwner: null,
            leaseExpiresAt: null,
          },
        });
      },
      {
        maxWait: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
        timeout: MEDIA_CLEANUP_TRANSACTION_TIMEOUT_MS,
      },
    );
  }
}
