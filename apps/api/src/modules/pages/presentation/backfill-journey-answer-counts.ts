import { disconnectPrisma, getPrismaClient } from '@letterly/database';
import { backfillJourneyAnswerCounts } from '../infrastructure/backfill-journey-answer-counts';

async function main() {
  if (!process.env.DATABASE_URL || !process.argv.includes('--confirm')) {
    throw new Error(
      'Set DATABASE_URL for the intended environment and pass --confirm',
    );
  }
  try {
    const result = await backfillJourneyAnswerCounts(getPrismaClient());
    console.log(
      JSON.stringify({ operation: 'journey_count_backfill', ...result }),
    );
  } finally {
    await disconnectPrisma();
  }
}

main().catch(() => {
  console.error('Journey count backfill failed');
  process.exitCode = 1;
});
