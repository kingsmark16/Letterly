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

const transientDatabaseErrorMessages = new Set([
  'connection terminated due to connection timeout',
  'connection terminated unexpectedly',
  'timeout exceeded when trying to connect',
]);

const databaseAuthenticationErrorCodes = new Set(['P1000', '28P01']);

export function isDatabaseAuthenticationError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    (typeof candidate.code === 'string' &&
      databaseAuthenticationErrorCodes.has(candidate.code)) ||
    (candidate.cause !== undefined &&
      isDatabaseAuthenticationError(candidate.cause))
  );
}

export function isTransientDatabaseError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as {
    code?: unknown;
    cause?: unknown;
    message?: unknown;
  };

  const message =
    typeof candidate.message === 'string'
      ? candidate.message.trim().toLowerCase()
      : undefined;

  return (
    (typeof candidate.code === 'string' &&
      transientDatabaseErrorCodes.has(candidate.code)) ||
    (message !== undefined && transientDatabaseErrorMessages.has(message)) ||
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
