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

/**
 * The contact form is the one unauthenticated write on the whole API, which
 * makes it the obvious target for spam. Counting successes too (unlike login)
 * is the point here: a flood of *valid* submissions is exactly what needs
 * stopping.
 */
export const contactRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isDevelopment,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'You have sent several messages already. Please give us time to reply.',
    },
  },
});

/**
 * Password reset requests, limited by IP.
 *
 * Kept tight because each accepted request sends an email: without a cap this
 * endpoint would let anyone use the school's mail server to flood a staff
 * member's inbox.
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isDevelopment,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many reset requests. Try again in an hour.',
    },
  },
});
