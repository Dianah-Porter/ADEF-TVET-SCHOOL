import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/tokens';
import { ApiError } from '../utils/ApiError';
import type { Role } from '../generated/prisma/enums';

/** Rejects the request unless it carries a valid access token. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Sign in to continue.'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(ApiError.unauthorized('Sign in to continue.'));
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Must be mounted after requireAuth. Kept separate so the two concerns —
 * "are you signed in" and "are you allowed" — fail with different statuses.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Sign in to continue.'));

    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Your account does not have access to this.'));
    }

    next();
  };
}
