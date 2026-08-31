import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'EDITOR';
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'adef-api',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'adef-api' }) as AccessTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      // A distinct code so the dashboard knows to refresh and retry rather
      // than bouncing the user to the login screen.
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Your session expired.');
    }
    throw ApiError.unauthorized('That sign-in token is not valid.');
  }
}

/**
 * Refresh tokens are opaque random strings, not JWTs, so that revoking one is
 * a database write rather than something we can only wait out.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Only the hash is stored. A leaked database therefore yields no usable
 * sessions. SHA-256 is right here (unlike for passwords) because the input is
 * already 48 bytes of entropy — there is nothing to brute-force.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export const REFRESH_COOKIE_NAME = 'adef_refresh';

/**
 * Scoped to the auth routes: the browser then never sends this cookie to the
 * gallery or announcement endpoints, so it cannot leak through them.
 */
export const refreshCookieOptions = {
  httpOnly: true,
  // SameSite=None is only honoured on a secure connection, so choosing it
  // forces the secure flag regardless of NODE_ENV. Without this the cookie
  // would be silently dropped rather than rejected with a useful error.
  secure: env.isProduction || env.COOKIE_SAMESITE === 'none',
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

/**
 * Password reset tokens are opaque random strings, like refresh tokens, and
 * only their SHA-256 hash is stored. The plaintext exists solely in the email
 * that was sent, so a database leak yields no usable reset links.
 *
 * They are generated and hashed separately from refresh tokens so the two can
 * never be confused for one another at a call site.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function resetTokenExpiry(): Date {
  return new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}
