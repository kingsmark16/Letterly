import { z } from "zod";

export const adminOverviewPeriodSchema = z.union([
  z.literal(7),
  z.literal(30),
  z.literal(90),
]);
export const adminOverviewQuerySchema = z.strictObject({
  period: z
    .union([
      adminOverviewPeriodSchema,
      z
        .enum(["7", "30", "90"])
        .transform(Number)
        .pipe(adminOverviewPeriodSchema),
    ])
    .default(30),
});
const count = z
  .string()
  .max(19)
  .regex(/^(0|[1-9][0-9]*)$/);
const metricFields = {
  creatorSignups: count,
  pagesCreated: count,
  publishActions: count,
  pageViews: count,
  dailyPageVisits: count,
};
const bucket = z.discriminatedUnion("available", [
  z.strictObject({
    date: z.iso.date(),
    available: z.literal(true),
    partial: z.boolean(),
    ...metricFields,
  }),
  z.strictObject({
    date: z.iso.date(),
    available: z.literal(false),
    partial: z.literal(false),
    creatorSignups: z.null(),
    pagesCreated: z.null(),
    publishActions: z.null(),
    pageViews: z.null(),
    dailyPageVisits: z.null(),
  }),
]);
const split = z.strictObject({ active: count, disabled: count, total: count });
export const adminOverviewResponseSchema = z.strictObject({
  period: adminOverviewPeriodSchema,
  asOf: z.iso.datetime(),
  periodStart: z.iso.datetime(),
  periodEndExclusive: z.iso.datetime(),
  coverageStartedAt: z.iso.datetime().nullable(),
  workload: z.strictObject({
    openReports: count,
    requestedAppeals: count,
    unfinishedDeletions: count,
    deletionsNeedingAttention: count,
  }),
  creators: split,
  pages: split.extend({
    byPublication: z.strictObject({
      DRAFT: split,
      PUBLISHED: split,
      UNPUBLISHED: split,
      ARCHIVED: split,
    }),
  }),
  buckets: z.array(bucket).min(7).max(90),
});
export type AdminOverviewPeriod = z.infer<typeof adminOverviewPeriodSchema>;
export type AdminOverview = z.infer<typeof adminOverviewResponseSchema>;
export type AdminOverviewBucket = AdminOverview["buckets"][number];
