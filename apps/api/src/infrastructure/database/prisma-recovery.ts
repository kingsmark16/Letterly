import type { PrismaClient } from '@letterly/database';

const transientDatabaseErrorCodes = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'P1001',
  'P1002',
  'P2024',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '57P01',
  '57P02',
  '57P03',
]);

export function isTransientDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; cause?: unknown };

  return (
    (typeof candidate.code === 'string' &&
      transientDatabaseErrorCodes.has(candidate.code)) ||
    (candidate.cause !== undefined && isTransientDatabaseError(candidate.cause))
  );
}

export async function resetPrismaAfterTransientError(
  prisma: PrismaClient,
  error: unknown,
): Promise<void> {
  if (!isTransientDatabaseError(error)) return;

  await prisma.$disconnect().catch(() => undefined);
  await prisma.$connect().catch(() => undefined);
}
