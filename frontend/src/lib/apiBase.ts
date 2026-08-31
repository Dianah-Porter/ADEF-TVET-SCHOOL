/**
 * The one place the API address is decided.
 *
 * Both clients read it from here — the public site client in `src/lib/api.ts`
 * and the dashboard client in `src/app/lib/api.ts` — so the two can never end
 * up pointed at different backends.
 *
 * Set VITE_API_URL in .env.local (development) or in the host's environment
 * (production). It must include the version prefix, e.g.
 * https://api.adeftvet.rw/api/v1
 */
export const API_BASE: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_URL ??
  'http://localhost:4000/api/v1';
