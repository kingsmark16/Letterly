import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const placeholderDatabaseUrl =
  'postgresql://letterly:letterly@localhost:5432/letterly_dev?schema=public';

const migrationDatabaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  placeholderDatabaseUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl,
  },
});
