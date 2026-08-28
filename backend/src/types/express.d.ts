import type { AccessTokenPayload } from '../lib/tokens';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Absent on public routes. */
      user?: AccessTokenPayload;
    }
  }
}

export {};
