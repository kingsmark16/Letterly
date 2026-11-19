import { disconnectPrisma, getPrismaClient } from '@letterly/database';
import { activateAdminAnalytics } from '../infrastructure/admin-analytics-activation';

async function main() {
  if (
    process.argv.length !== 3 ||
    process.argv[2] !== '--confirm' ||
    !process.env.DATABASE_URL
  ) {
    process.stderr.write(
      'Select the database through DATABASE_URL and pass --confirm.\n',
    );
    process.exitCode = 1;
    return;
  }
  try {
    const startedAt = await activateAdminAnalytics(getPrismaClient());
    process.stdout.write(
      `${JSON.stringify({ coverageStartedAt: startedAt.toISOString() })}\n`,
    );
  } catch {
    process.stderr.write(
      'Analytics activation failed. No partial activation was committed.\n',
    );
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

void main();
