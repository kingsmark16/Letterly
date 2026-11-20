import type { PrismaClient } from '@letterly/database';
import { databaseNow } from '../../../infrastructure/database/page-barrier';

const RETENTION_DAYS = 730;
const BATCH_SIZE = 100;

export async function purgeDeletionJobs(prisma: PrismaClient, daily = false) {
  return prisma.$transaction(
    async (tx) => {
      // Keep overlapping daily runs from choosing different slices of the same tree.
      const [lease] = await tx.$queryRaw<{ acquired: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(hashtext('letterly:deletion-retention')) AS acquired`;
      if (!lease?.acquired) return 0;
      const now = await databaseNow(tx);
      if (daily) {
        const due = await tx.$queryRaw<{ id: string }[]>`
          INSERT INTO "JobLease" ("id","jobName","leaseToken","leasedAt","leaseExpiresAt")
          VALUES (gen_random_uuid(),'deletion-retention',gen_random_uuid()::text,${now},
            ${new Date(now.getTime() + 86_400_000)})
          ON CONFLICT ("jobName") DO UPDATE SET "leasedAt"=EXCLUDED."leasedAt",
            "leaseToken"=EXCLUDED."leaseToken", "leaseExpiresAt"=EXCLUDED."leaseExpiresAt"
          WHERE "JobLease"."leaseExpiresAt"<=${now} RETURNING "id"`;
        if (!due.length) return 0;
      }
      const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000);
      const rows = await tx.$queryRaw<
        { id: string; parentJobId: string | null }[]
      >`
      SELECT job."id", job."parentJobId" FROM "DeletionJob" job
      LEFT JOIN "DeletionJob" parent ON parent."id"=job."parentJobId"
      WHERE job."state"='COMPLETED' AND job."completedAt"<=${cutoff}
        AND NOT EXISTS (SELECT 1 FROM "DeletionJob" child WHERE child."parentJobId"=job."id")
        AND (job."parentJobId" IS NULL OR (
          parent."state"='COMPLETED' AND parent."completedAt"<=${cutoff}
          AND NOT EXISTS (SELECT 1 FROM "DeletionJob" sibling WHERE sibling."parentJobId"=parent."id"
            AND sibling."state"<>'COMPLETED')
        ))
      ORDER BY job."completedAt", job."id" LIMIT ${BATCH_SIZE}`;
      const parents = [
        ...new Set(
          rows.flatMap((row) => (row.parentJobId ? [row.parentJobId] : [])),
        ),
      ].sort();
      const ids = rows.map((row) => row.id).sort();
      for (const id of [...parents, ...ids])
        await tx.$queryRaw`
      SELECT "id" FROM "DeletionJob" WHERE "id"=${id}::uuid FOR UPDATE`;
      const eligible = await tx.deletionJob.findMany({
        where: {
          id: { in: ids },
          state: 'COMPLETED',
          completedAt: { lte: cutoff },
          children: { none: {} },
          OR: [
            { parentJobId: null },
            {
              parentJob: {
                state: 'COMPLETED',
                completedAt: { lte: cutoff },
                children: { every: { state: 'COMPLETED' } },
              },
            },
          ],
        },
        select: { id: true },
      });
      if (!eligible.length) return 0;
      const jobId = { in: eligible.map((row) => row.id) };
      await tx.deletionJobMedia.deleteMany({ where: { jobId } });
      await tx.deletionAcceptanceReceipt.deleteMany({ where: { jobId } });
      await tx.mediaProcessingRecovery.deleteMany({ where: { jobId } });
      await tx.uploadGrantSettlement.deleteMany({ where: { jobId } });
      return (await tx.deletionJob.deleteMany({ where: { id: jobId } })).count;
    },
    { maxWait: 10_000, timeout: 10_000 },
  );
}
