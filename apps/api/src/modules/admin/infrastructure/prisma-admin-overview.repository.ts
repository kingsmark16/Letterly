import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@letterly/database';
import {
  adminOverviewResponseSchema,
  type AdminOverviewPeriod,
} from '@letterly/contracts';
import { PRISMA_CLIENT } from '../../../infrastructure/database/prisma-token';

@Injectable()
export class PrismaAdminOverviewRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async read(period: AdminOverviewPeriod) {
    const [row] = await this.prisma.$queryRaw<
      {
        asOf: Date;
        coverage: Date | null;
        today: string;
        first: string;
        last: string;
        workload: unknown;
        creators: unknown;
        activePages: string;
        disabledPages: string;
        totalPages: string;
        byPublication: unknown;
        buckets: unknown;
      }[]
    >`
      WITH moment AS MATERIALIZED (SELECT clock_timestamp() AS now),
      coverage_window AS (
        SELECT moment.now, (moment.now AT TIME ZONE 'UTC')::date AS today, coverage."startedAt" AS coverage
        FROM moment LEFT JOIN "AnalyticsCoverage" coverage ON coverage."id"='platform'
      ),
      page_groups AS (
        SELECT page."status", count(*) FILTER (WHERE page."moderationStatus"='ACTIVE') AS active,
          count(*) FILTER (WHERE page."moderationStatus"='DISABLED') AS disabled,
          count(*) AS total
        FROM "Page" page JOIN "user" creator ON creator."id"=page."creatorId"
        WHERE page."deletionRequestedAt" IS NULL AND creator."deletionRequestedAt" IS NULL
        GROUP BY page."status"
      ),
      page_totals AS (
        SELECT COALESCE(sum(active),0)::text AS "activePages",
          COALESCE(sum(disabled),0)::text AS "disabledPages", COALESCE(sum(total),0)::text AS "totalPages",
          jsonb_object_agg(status::text, jsonb_build_object(
            'active',COALESCE(active,0)::text,'disabled',COALESCE(disabled,0)::text,'total',COALESCE(total,0)::text
          )) AS "byPublication"
        FROM unnest(enum_range(NULL::"PageStatus")) statuses(status)
        LEFT JOIN page_groups USING (status)
      )
      SELECT w.now AS "asOf", w.coverage, w.today::text AS today,
        (w.today - (${period}::int - 1))::text AS first, (w.today + 1)::text AS last,
        jsonb_build_object(
          'openReports', (SELECT count(*) FROM "PageReport" WHERE "status"='OPEN')::text,
          'requestedAppeals', (SELECT count(*) FROM "Appeal" WHERE "status"='REQUESTED')::text,
          'unfinishedDeletions', (SELECT count(*) FROM "DeletionJob" WHERE "state"<>'COMPLETED')::text,
          'deletionsNeedingAttention', (SELECT count(*) FROM "DeletionJob" WHERE "state"='NEEDS_ATTENTION')::text
        ) AS workload,
        (SELECT jsonb_build_object(
          'active',(count(*) FILTER (WHERE "moderationStatus"='ACTIVE'))::text,
          'disabled',(count(*) FILTER (WHERE "moderationStatus"='DISABLED'))::text,'total',count(*)::text
        ) FROM "user" WHERE "role"='CREATOR' AND "deletionRequestedAt" IS NULL) AS creators,
        page_totals.*,
        (SELECT jsonb_agg(jsonb_build_object(
          'date', bucket.day::text, 'available', bucket.available,
          'partial', bucket.available AND (bucket.day=w.today OR bucket.day=(w.coverage AT TIME ZONE 'UTC')::date),
          'creatorSignups',CASE WHEN bucket.available THEN COALESCE(metrics."creatorSignups",0)::text END,
          'pagesCreated',CASE WHEN bucket.available THEN COALESCE(metrics."pagesCreated",0)::text END,
          'publishActions',CASE WHEN bucket.available THEN COALESCE(metrics."publishActions",0)::text END,
          'pageViews',CASE WHEN bucket.available THEN COALESCE(metrics."pageViews",0)::text END,
          'dailyPageVisits',CASE WHEN bucket.available THEN COALESCE(metrics."dailyPageVisits",0)::text END
        ) ORDER BY bucket.day)
        FROM (
          SELECT w.today-offsets.n AS day,
            COALESCE(w.today-offsets.n >= (w.coverage AT TIME ZONE 'UTC')::date, false) AS available
          FROM generate_series(0,${period}::int - 1) offsets(n)
        ) bucket LEFT JOIN "DailyAdminMetrics" metrics ON metrics."day"=bucket.day) AS buckets
      FROM coverage_window w CROSS JOIN page_totals`;
    if (!row) throw new Error('Overview snapshot unavailable');
    return adminOverviewResponseSchema.parse({
      period,
      asOf: row.asOf.toISOString(),
      periodStart: `${row.first}T00:00:00.000Z`,
      periodEndExclusive: `${row.last}T00:00:00.000Z`,
      coverageStartedAt: row.coverage?.toISOString() ?? null,
      workload: row.workload,
      creators: row.creators,
      pages: {
        total: row.totalPages,
        active: row.activePages,
        disabled: row.disabledPages,
        byPublication: row.byPublication,
      },
      buckets: row.buckets,
    });
  }
}
