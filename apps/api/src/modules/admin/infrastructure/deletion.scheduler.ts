import {
  Inject,
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';
import { DeletionWorker } from '../application/deletion-worker';
import { MediaCleanupService } from '../../pages/application/media-cleanup.service';
import {
  SAFE_MONITORING,
  type SafeMonitoringPort,
} from '../../../infrastructure/monitoring/safe-monitoring';
import { databaseNow } from '../../../infrastructure/database/page-barrier';
import { deletionFailureCodeSchema } from '@letterly/contracts';
import { purgeDeletionJobs } from './deletion-retention';

@Injectable()
export class DeletionScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private oldestAlertRaised = false;
  private readonly logger = new Logger(DeletionScheduler.name);
  constructor(
    @Inject(DeletionWorker) private readonly worker: DeletionWorker,
    @Inject(MediaCleanupService) private readonly cleanup: MediaCleanupService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Optional()
    @Inject(SAFE_MONITORING)
    private readonly monitoring?: SafeMonitoringPort,
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
      await this.recordProgress().catch(() =>
        this.logger.warn({ event: 'deletion_metrics_unavailable' }),
      );
      await this.retention();
    } finally {
      this.running = false;
    }
  }
  private async retention() {
    try {
      const deleted = await purgeDeletionJobs(this.prisma, true);
      if (deleted)
        this.monitoring?.recordMetric('deletion_retention_total', deleted, {
          operation: 'deletion_retention',
        });
    } catch {
      this.logger.warn({ event: 'deletion_retention_failed', code: 'UNKNOWN' });
    }
  }
  private async recordProgress() {
    if (!this.monitoring) return;
    const now = await databaseNow(this.prisma);
    const [states, oldest, failures] = await Promise.all([
      this.prisma.deletionJob.groupBy({
        by: ['state'],
        _count: { _all: true },
      }),
      this.prisma.deletionJob.findFirst({
        where: { state: { not: 'COMPLETED' } },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.prisma.deletionJob.groupBy({
        by: ['lastFailureCode'],
        where: { lastFailureCode: { not: null } },
        _count: { _all: true },
      }),
    ]);
    for (const state of states)
      this.monitoring.recordMetric('deletion_jobs', state._count._all, {
        outcome: state.state,
      });
    for (const failure of failures) {
      const code = deletionFailureCodeSchema.safeParse(failure.lastFailureCode);
      this.monitoring.recordMetric('deletion_failures', failure._count._all, {
        errorCode: code.success ? code.data : 'UNKNOWN',
      });
    }
    const age = oldest
      ? Math.max(0, (now.getTime() - oldest.requestedAt.getTime()) / 1000)
      : 0;
    this.monitoring.recordMetric('deletion_oldest_unfinished_seconds', age);
    if (age > 86_400 && !this.oldestAlertRaised) {
      this.monitoring.captureException(
        new Error('Deletion job age threshold exceeded'),
        {
          operation: 'deletion_scheduler',
          errorCode: 'DELETION_AGE_THRESHOLD',
        },
      );
      this.oldestAlertRaised = true;
    } else if (age <= 86_400) this.oldestAlertRaised = false;
  }
}
