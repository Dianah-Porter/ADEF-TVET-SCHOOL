import { createApp } from './app';
import { env } from './config/env';
import { checkDatabase, disconnectDatabase } from './lib/prisma';

async function main() {
  const app = createApp();

  // Report the database state at boot rather than letting the first request
  // discover it — a misconfigured DATABASE_URL should be obvious immediately.
  const database = await checkDatabase();

  const server = app.listen(env.PORT, () => {
    console.log('');
    console.log(`  ADEF API  ·  ${env.NODE_ENV}`);
    console.log(`  listening   http://localhost:${env.PORT}`);
    console.log(`  health      http://localhost:${env.PORT}/api/v1/health`);
    console.log(
      `  database    ${database.ok ? `connected (${database.latencyMs}ms)` : `UNREACHABLE — ${database.error}`}`,
    );
    console.log(`  cors        ${env.corsOrigins.join(', ')}`);
    console.log('');
  });

  const shutdown = (signal: string) => async () => {
    console.log(`\n${signal} received, shutting down.`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start the server:', error);
  process.exit(1);
});
