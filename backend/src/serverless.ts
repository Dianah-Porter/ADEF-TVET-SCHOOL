import { createApp } from './app';

/**
 * The Express app as a serverless handler, for Vercel.
 *
 * Built once at module scope rather than per request: on a serverless platform
 * the module is evaluated once per cold start and then reused for every
 * request that instance handles, so constructing the app inside the handler
 * would rebuild the whole middleware stack on every call.
 *
 * `src/server.ts` remains the entry point for running on an ordinary Node host
 * — it binds a port and handles shutdown signals, neither of which a
 * serverless platform wants.
 *
 * The thin `api/index.ts` file is what Vercel actually looks for; it re-exports
 * this. Keeping the logic here means it is covered by `npm run typecheck`,
 * which only sees files under `src/`.
 */
export const app = createApp();

export default app;
