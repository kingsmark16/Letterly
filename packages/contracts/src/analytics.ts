import { z } from "zod";

export const pageAnalyticsPeriodSchema = z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);

export const pageAnalyticsQuerySchema = z.object({
  days: z.coerce.number().pipe(pageAnalyticsPeriodSchema).default(30),
});

export const pageViewStartResponseSchema = z.object({
  viewId: z.uuid(),
});

export const pageViewDurationRequestSchema = z.object({
  viewId: z.uuid(),
  activeSeconds: z.number().int().min(1).max(1800),
});

export const pageActivityDaySchema = z.object({
  date: z.iso.date(),
  views: z.number().int().nonnegative(),
  visitors: z.number().int().nonnegative(),
  responses: z.number().int().nonnegative(),
  averageActiveSeconds: z.number().int().nonnegative().nullable(),
  measuredViews: z.number().int().nonnegative(),
});

export const pageAnalyticsSchema = z.object({
  visitorDays: z.number().int().positive(),
  views: z.number().int().nonnegative(),
  visitors: z.number().int().nonnegative(),
  totalResponses: z.number().int().nonnegative(),
  unreadResponses: z.number().int().nonnegative(),
  averageActiveSeconds: z.number().int().nonnegative().nullable(),
  measuredViews: z.number().int().nonnegative(),
  activity: z.array(pageActivityDaySchema),
});

export type PageAnalytics = z.infer<typeof pageAnalyticsSchema>;
export type PageAnalyticsPeriod = z.infer<typeof pageAnalyticsPeriodSchema>;
export type PageAnalyticsQuery = z.infer<typeof pageAnalyticsQuerySchema>;
export type PageViewDurationRequest = z.infer<
  typeof pageViewDurationRequestSchema
>;
