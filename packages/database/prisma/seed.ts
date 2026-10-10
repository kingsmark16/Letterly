import { disconnectPrisma, getPrismaClient } from "../src/index.js";
import { seedCatalog } from "../src/seed-catalog.js";

async function main(): Promise<void> {
  await seedCatalog(getPrismaClient());
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
