import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * The Express app as a serverless handler, for Vercel.
 *
 * `src/server.ts` remains the entry point for an ordinary Node host — it binds
 * a port and handles shutdown signals, neither of which a serverless platform
 * wants.
 *
 * The thin `api/index.ts` file is what Vercel looks for; it re-exports this.
 * Keeping the logic here means it is covered by `npm run typecheck`, which only
 * sees files under `src/`.
 */

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: Handler | null = null;
let startupError: string | null = null;

/**
 * Builds the app on first request, then reuses it.
 *
 * The import is deliberately dynamic. `./app` pulls in the environment schema,
 * the storage driver, Prisma and two native modules, and any of them can fail
 * at load time. A static `import` would run all of that while this module is
 * being evaluated — before any code here could react — and on Vercel a module
 * that throws during evaluation is reported as FUNCTION_INVOCATION_FAILED: a
 * 500 with no body, no reason, and nothing in the response to act on.
 *
 * Deferring it to the first call puts the whole chain inside a try/catch, so a
 * missing environment variable or an unloadable binary answers with what went
 * wrong instead of a blank error page.
 *
 * The app is still constructed once per instance, not once per request: the
 * result is cached, and so is the failure, so a broken deployment does not
 * retry a hopeless import on every call.
 */
async function resolveHandler(): Promise<Handler | null> {
  if (cached || startupError) return cached;

  try {
    // The .js extension is required: moduleResolution node16 treats a dynamic
    // import as a real ES import, and it resolves against the emitted output.
    const { createApp } = await import('./app.js');
    cached = createApp() as unknown as Handler;
  } catch (error) {
    startupError = error instanceof Error ? error.message : String(error);
    console.error('[startup] the API failed to initialise:', error);
  }

  return cached;
}

/**
 * Only the error's own message is returned — never a stack trace, never the
 * environment. The variable names it can mention are already public in
 * .env.example, so this cannot leak a secret.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await resolveHandler();

  if (app) {
    app(req, res);
    return;
  }

  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify({
      error: {
        code: 'STARTUP_FAILED',
        message: 'The API could not start. This is a configuration problem, not a bad request.',
        reason: startupError,
      },
    }),
  );
}
