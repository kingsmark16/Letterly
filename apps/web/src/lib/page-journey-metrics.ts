import {
  publicPageJourneyMetricEventSchema,
  type PublicPageJourneyMetricEvent,
} from "@letterly/contracts/metrics";

export function emitPageJourneyMetric(
  slug: string,
  event: PublicPageJourneyMetricEvent,
): void {
  const safeEvent = publicPageJourneyMetricEventSchema.parse(event);
  void fetch(`/api/v1/public/pages/${encodeURIComponent(slug)}/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeEvent),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}
