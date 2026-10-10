import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { MediaCleanupService } from '../application/media-cleanup.service';
import type { MediaCleanupRunner } from '../application/media-cleanup';

export const MEDIA_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class MediaCleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(MediaCleanupService) private readonly cleanup: MediaCleanupRunner,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.cleanup.runOnce().catch(() => undefined);
    }, MEDIA_CLEANUP_INTERVAL_MS);
    this.interval.unref?.();
  }

  onModuleDestroy(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
