import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import { DeletionWorker } from '../application/deletion-worker';
import { MediaCleanupService } from '../../pages/application/media-cleanup.service';

@Injectable()
export class DeletionScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly logger = new Logger(DeletionScheduler.name);
  constructor(
    @Inject(DeletionWorker) private readonly worker: DeletionWorker,
    @Inject(MediaCleanupService) private readonly cleanup: MediaCleanupService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.runOnce().catch(() =>
        this.logger.error({
          event: 'deletion_scheduler_failed',
          code: 'UNKNOWN',
        }),
      );
    }, 30_000);
    this.timer.unref?.();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      await this.worker.runOnce();
      if (
        await this.prisma.deletionJob.findFirst({
          where: { state: { not: 'COMPLETED' } },
          select: { id: true },
        })
      )
        await this.cleanup.runOnce();
    } finally {
      this.running = false;
    }
  }
}
