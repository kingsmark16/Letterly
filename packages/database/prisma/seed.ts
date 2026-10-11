import { disconnectPrisma, getPrismaClient } from "../src/index.js";
import { seedCatalogInTransaction } from "../src/seed-catalog.js";

async function main(): Promise<void> {
  await seedCatalogInTransaction(getPrismaClient());
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
