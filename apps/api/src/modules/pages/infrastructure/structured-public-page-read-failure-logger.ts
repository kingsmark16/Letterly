import { Injectable, Logger } from '@nestjs/common';
import { PageService } from '../application/page.service';
import type {
  PublicPageReadFailureEvent,
  PublicPageReadFailureLogger,
} from '../application/public-page-read-failure-logger';

@Injectable()
export class StructuredPublicPageReadFailureLogger implements PublicPageReadFailureLogger {
  private readonly logger = new Logger(PageService.name);

  warn(event: PublicPageReadFailureEvent): void {
    this.logger.warn(event);
  }
}
