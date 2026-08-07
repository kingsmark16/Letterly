import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

type PrismaGlobal = typeof globalThis & {
  letterlyPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required before the database client can be created.',
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient();
  }

  globalForPrisma.letterlyPrisma ??= createPrismaClient();
  return globalForPrisma.letterlyPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  await globalForPrisma.letterlyPrisma?.$disconnect();
  globalForPrisma.letterlyPrisma = undefined;
}
