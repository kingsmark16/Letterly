import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

// Neon may need a few seconds to wake a suspended compute before accepting a
// connection. Keep enough room for that cold start without making a failed
// request wait indefinitely.
export const DATABASE_CONNECTION_TIMEOUT_MS = 30_000;

const legacySslModes = new Set(["prefer", "require", "verify-ca"]);

type PrismaGlobal = typeof globalThis & {
  letterlyPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

/**
 * pg now treats these modes as verify-full, but still emits a warning when
 * they are present in the connection string. Normalize them at the runtime
 * boundary so existing deployment secrets remain warning-free and keep full
 * certificate/hostname verification.
 */
function normalizeRuntimeConnectionString(connectionString: string): string {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get("sslmode");

    if (sslMode && legacySslModes.has(sslMode.toLowerCase())) {
      parsed.searchParams.set("sslmode", "verify-full");
      return parsed.toString();
    }
  } catch {
    // Fall back to a narrow replacement for non-standard but accepted URLs.
  }

  return connectionString.replace(
    /([?&]sslmode=)(prefer|require|verify-ca)(&|$)/i,
    "$1verify-full$3",
  );
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required before the database client can be created.",
    );
  }

  const adapter = new PrismaPg({
    connectionString: normalizeRuntimeConnectionString(connectionString),
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: 30_000,
    max: 10,
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  globalForPrisma.letterlyPrisma ??= createPrismaClient();
  return globalForPrisma.letterlyPrisma;
}

export async function disconnectPrisma(): Promise<void> {
  await globalForPrisma.letterlyPrisma?.$disconnect();
  globalForPrisma.letterlyPrisma = undefined;
}
