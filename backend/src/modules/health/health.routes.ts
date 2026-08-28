import { Router } from 'express';
import { checkDatabase } from '../../lib/prisma';
import { env } from '../../config/env';

export const healthRouter = Router();

const startedAt = Date.now();

/**
 * GET /api/v1/health
 *
 * Returns 200 only when the process AND the database are both reachable, so a
 * platform health check will correctly mark the service down if Postgres dies.
 */
healthRouter.get('/health', async (_req, res) => {
  const database = await checkDatabase();

  res.status(database.ok ? 200 : 503).json({
    data: {
      status: database.ok ? 'ok' : 'degraded',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database,
      timestamp: new Date().toISOString(),
    },
  });
});
