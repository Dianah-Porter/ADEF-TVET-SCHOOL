import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Brute-force protection for sign-in. Counts only failures, so a member of
 * staff logging in correctly several times in a row is never locked out.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Disabled in development so testing the login flow is not self-defeating.
  skip: () => env.isDevelopment,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many failed sign-in attempts. Try again in 15 minutes.',
    },
  },
});

/** A generous ceiling that only stops something clearly abusive. */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isDevelopment,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Slow down a little.' },
  },
});
