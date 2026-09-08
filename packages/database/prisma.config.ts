import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: new URL("../../.env.local", import.meta.url) });
config();

const placeholderDatabaseUrl =
  "postgresql://letterly:letterly@localhost:5432/letterly_dev?schema=public";

const migrationDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  placeholderDatabaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
