import { Router } from 'express';
import { checkDatabase, prisma } from '../../lib/prisma';
import { env } from '../../config/env';

export const healthRouter = Router();

const startedAt = Date.now();

/**
 * Confirms the schema is actually there, not just the connection.
 *
 * `SELECT 1` succeeds against a completely empty database, so connectivity
 * alone is not a useful signal: a deployment whose migrations were never
 * applied reports itself healthy while every real query fails with a 500. That
 * exact gap once made a missing `prisma migrate deploy` look like a CORS or
 * authentication bug, because the only green light on the system was lying.
 *
 * `count()` on a table that must exist is the cheapest way to tell the two
 * apart.
 */
async function checkSchema(): Promise<{ ready: boolean; hint?: string }> {
  try {
    await prisma.adminUser.count();
    return { ready: true };
  } catch {
    return {
      ready: false,
      hint:
        'The database is reachable but its tables are missing. ' +
        'Apply the migrations with: npx prisma migrate deploy',
    };
  }
}

/**
 * GET /api/v1/health
 *
 * Returns 200 only when the process, the database AND its schema are all
 * usable, so a platform health check marks the service down when it cannot
 * actually serve a request.
 */
healthRouter.get('/health', async (_req, res) => {
  const database = await checkDatabase();
  const schema = database.ok ? await checkSchema() : { ready: false };

  const ok = database.ok && schema.ready;

  res.status(ok ? 200 : 503).json({
    data: {
      status: ok ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database,
      schema,
      timestamp: new Date().toISOString(),
    },
  });
});
