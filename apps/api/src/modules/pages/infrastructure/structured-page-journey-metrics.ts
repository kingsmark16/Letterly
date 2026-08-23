import { Injectable, Logger } from '@nestjs/common';
import {
  pageJourneyMetricEventSchema,
  type PageJourneyMetricEvent,
} from '@letterly/contracts/metrics';
import type { PageJourneyMetrics } from '../application/page-journey-metrics';

@Injectable()
export class StructuredPageJourneyMetrics implements PageJourneyMetrics {
  private readonly logger = new Logger(StructuredPageJourneyMetrics.name);

  record(event: PageJourneyMetricEvent): void {
    const safeEvent = pageJourneyMetricEventSchema.parse(event);
    this.logger.log(safeEvent);
  }
}
