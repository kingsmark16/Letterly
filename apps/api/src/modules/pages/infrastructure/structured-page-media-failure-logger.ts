import { Injectable, Logger } from '@nestjs/common';
import { PageMediaService } from '../application/page-media.service';
import type {
  PageMediaFailureEvent,
  PageMediaFailureLogger,
} from '../application/page-media-failure-logger';

@Injectable()
export class StructuredPageMediaFailureLogger implements PageMediaFailureLogger {
  private readonly logger = new Logger(PageMediaService.name);

  error(event: PageMediaFailureEvent): void {
    this.logger.error(event);
  }
}
