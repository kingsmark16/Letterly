import type { PageJourneyMetricEvent } from '@letterly/contracts/metrics';

export const PAGE_JOURNEY_METRICS = Symbol('PAGE_JOURNEY_METRICS');

export interface PageJourneyMetrics {
  record(event: PageJourneyMetricEvent): void;
}
