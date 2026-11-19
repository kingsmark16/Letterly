import type { PrismaClient } from '@letterly/database';

export async function activateAdminAnalytics(
  prisma: PrismaClient,
): Promise<Date> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET LOCAL lock_timeout = '10s'`;
      await tx.$executeRaw`LOCK TABLE "user" IN SHARE ROW EXCLUSIVE MODE`;
      await tx.$executeRaw`LOCK TABLE "Page" IN SHARE ROW EXCLUSIVE MODE`;
      await tx.$executeRaw`LOCK TABLE "PageVisit" IN SHARE ROW EXCLUSIVE MODE`;

      const [installed] = await tx.$queryRaw<{ count: number }[]>`
      SELECT count(*)::integer AS count FROM pg_catalog.pg_trigger
      WHERE (tgrelid, tgname) IN (
        ('"user"'::regclass, 'letterly_analytics_user'),
        ('"Page"'::regclass, 'letterly_analytics_page'),
        ('"PageVisit"'::regclass, 'letterly_analytics_visit')
      )
      AND tgfoid = 'letterly_capture_admin_analytics()'::regprocedure
      AND tgenabled IN ('O', 'A')`;
      if (installed?.count !== 3)
        throw new Error('Analytics capture is incomplete');

      await tx.$executeRaw`
      INSERT INTO "AnalyticsCoverage" ("id", "startedAt")
      VALUES ('platform', clock_timestamp()) ON CONFLICT ("id") DO NOTHING`;
      const coverage = await tx.analyticsCoverage.findUniqueOrThrow({
        where: { id: 'platform' },
        select: { startedAt: true },
      });
      return coverage.startedAt;
    },
    { isolationLevel: 'ReadCommitted', maxWait: 10_000, timeout: 40_000 },
  );
}
