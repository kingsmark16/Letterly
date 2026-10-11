import type { PrismaClient } from '@letterly/database';
import { pageJourneySnapshotSchema } from '@letterly/templates';

export const journeyCountBackfillBatchSize = 100;

export async function backfillJourneyAnswerCounts(prisma: PrismaClient) {
  return prisma.$transaction(
    async (transaction) => {
      const rows = await transaction.visitorSubmission.findMany({
        where: { journeyAnswerCount: null, deletedAt: null },
        orderBy: { id: 'asc' },
        take: journeyCountBackfillBatchSize,
        select: { id: true, journeySnapshot: true },
      });
      let updated = 0;
      for (const row of rows) {
        const snapshot = pageJourneySnapshotSchema.safeParse(
          row.journeySnapshot,
        );
        const result = await transaction.visitorSubmission.updateMany({
          where: { id: row.id, journeyAnswerCount: null, deletedAt: null },
          data: {
            journeyAnswerCount: snapshot.success
              ? snapshot.data.answers.length
              : 0,
          },
        });
        updated += result.count;
      }
      return { selected: rows.length, updated };
    },
    { timeout: 30_000 },
  );
}
