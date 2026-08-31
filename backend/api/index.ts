/**
 * Vercel's entry point.
 *
 * Vercel only treats files under `api/` as functions, but this directory sits
 * outside the TypeScript `rootDir`, so anything written here escapes
 * `npm run typecheck`. Hence the one-line re-export: the actual handler lives
 * in `src/serverless.ts`, where it is checked like the rest of the codebase.
 */
export { default } from '../src/serverless';
