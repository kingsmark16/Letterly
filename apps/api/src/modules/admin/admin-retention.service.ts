import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { loadConfig } from '@letterly/config';
import {
  SAFE_MONITORING,
  type SafeMonitoringPort,
} from '../../infrastructure/monitoring/safe-monitoring';
import {
  ADMIN_RETENTION_REPOSITORY,
  type AdminRetentionRepository,
} from './admin-retention.repository';

@Injectable()
export class AdminRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminRetentionService.name);
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(ADMIN_RETENTION_REPOSITORY)
    private readonly repository: AdminRetentionRepository,
    @Optional()
    @Inject(SAFE_MONITORING)
    private readonly monitoring?: SafeMonitoringPort,
  ) {}

  onModuleInit(): void {
    const config = loadConfig();
    this.interval = setInterval(() => {
      void this.runOnce().catch(() => undefined);
    }, config.MODERATION_PURGE_INTERVAL_SECONDS * 1_000);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  async runOnce(now = new Date()): Promise<void> {
    const config = loadConfig();
    let purgeCompleted = false;
    try {
      const result = await this.repository.run({
        now,
        retentionDays: config.MODERATION_RETENTION_DAYS,
        batchSize: Math.min(config.MODERATION_PURGE_BATCH_SIZE, 100),
      });
      if (!result.acquired) return;
      purgeCompleted = true;
      await this.repository.recordSuccess({
        now,
        claimed: result.claimed,
        deleted: result.deleted,
      });
      this.monitoring?.recordMetric('moderation_purge_total', result.deleted, {
        operation: 'moderation_retention',
        outcome: 'success',
      });
      this.logger.log({
        operation: 'moderation_retention',
        outcome: 'success',
        claimed: result.claimed,
        deleted: result.deleted,
      });
    } catch (error: unknown) {
      if (purgeCompleted) {
        await this.repository
          .recordFailure({ now, failureCode: 'UNKNOWN' })
          .catch(() => undefined);
      }
      this.monitoring?.recordMetric('moderation_purge_total', 1, {
        operation: 'moderation_retention',
        outcome: 'failure',
      });
      this.logger.error({
        operation: 'moderation_retention',
        outcome: 'failure',
        error: error instanceof Error ? error.name : 'UNKNOWN',
      });
    }
  }
}
