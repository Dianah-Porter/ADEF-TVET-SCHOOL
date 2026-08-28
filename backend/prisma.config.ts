import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 no longer reads the connection URL from schema.prisma.
 * The CLI (migrate, studio, db pull) reads it from here; the runtime client
 * gets it through the pg driver adapter in src/lib/prisma.ts.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
