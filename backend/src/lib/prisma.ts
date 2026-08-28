import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

/**
 * Prisma 7 connects through a driver adapter rather than reading the URL from
 * schema.prisma, so the connection string is supplied here at construction.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

/**
 * tsx watch reloads this module on every save. Without caching the client on
 * globalThis, each reload would open a fresh connection pool and Postgres
 * would run out of connections within a few minutes of editing.
 */
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

function createClient() {
  return new PrismaClient({
    adapter,
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/** Cheap liveness probe used by the health endpoint. */
export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
