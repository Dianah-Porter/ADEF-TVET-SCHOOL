import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// quiet: dotenv otherwise prints a promotional banner over our startup output.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/**
 * Every environment variable the API depends on, validated once at boot.
 *
 * The point of doing this here is that a missing or malformed secret fails
 * loudly on startup with a readable message, rather than surfacing as a
 * confusing 500 during a request weeks later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),

  /**
   * Comma-separated list of origins allowed to call this API.
   *
   * Deliberately has no default. The old one was the Vite dev server, which is
   * right locally and wrong in production: a deployment that forgot to set this
   * would quietly accept credentialed requests from anything served on
   * localhost:5173. Unset in production now means "allow nothing", which fails
   * visibly instead.
   */
  CORS_ORIGINS: z.string().optional(),

  /**
   * SameSite policy for the refresh cookie.
   *
   * "lax" is right when the site and API share an origin. When they are on
   * different domains — which is what deploying the two halves as separate
   * Vercel projects means — the browser will not send a Lax cookie on the
   * refresh call at all, and every staff session would silently die after the
   * access token expired. That case needs "none", which browsers only honour
   * over HTTPS.
   */
  COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).default('lax'),

  STORAGE_DRIVER: z.enum(['local', 'vercel-blob']).default('local'),

  // Only read when STORAGE_DRIVER is "vercel-blob". Optional here so a local
  // install needs neither; the driver itself fails loudly if one is missing.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  BLOB_BASE_URL: z.string().url().optional(),
  UPLOAD_DIR: z.string().default('uploads'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:4000'),

  /** Where the dashboard is served. Reset links are built against this. */
  APP_URL: z.string().url().default('http://localhost:5173'),

  // ─── Outgoing email ───────────────────────────────────────────────────────
  // All optional. With no SMTP_HOST the mailer logs to the console instead of
  // sending, so password reset works in development with nothing configured.
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().default('ADEF TVET School <no-reply@adef.rw>'),

  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_ADMIN_NAME: z.string().optional(),
});

/**
 * A variable set to an empty value is treated as absent.
 *
 * Hosting dashboards hand every declared variable to the process, including the
 * ones left blank — and `z.string().url()` rejects "" rather than falling back
 * to its default. Without this, following the documented deployment order
 * (deploy the API first, fill in APP_URL once the frontend has a URL) would
 * crash the API at boot on a blank string.
 */
const provided = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ''),
);

const parsed = envSchema.safeParse(provided);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  // Thrown, not process.exit(1). On a serverless platform an exiting process
  // is reported as an opaque FUNCTION_INVOCATION_FAILED with no reason
  // attached anywhere the caller can see, which makes a simple typo in an
  // environment variable almost impossible to diagnose. A thrown error can be
  // caught at the entry point and turned into a response that says what is
  // actually wrong. Locally it still stops the process with the same message.
  throw new Error(
    `Invalid environment configuration:\n${issues}\n\n` +
      'Locally these live in backend/.env — copy .env.example if you have not ' +
      "already. When deployed they are the host's environment variables.",
  );
}

const raw = parsed.data;

export const env = {
  ...raw,

  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',

  /**
   * CORS_ORIGINS is a comma-separated string; callers want a list.
   *
   * The Vite dev server is assumed only when the variable is absent outside
   * production, so local work needs no configuration while a production
   * deployment that has not set it yet allows no cross-origin request at all.
   */
  corsOrigins: (raw.CORS_ORIGINS ?? (raw.NODE_ENV === 'production' ? '' : 'http://localhost:5173'))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** True once SMTP is configured; otherwise the mailer only logs. */
  mailEnabled: Boolean(raw.SMTP_HOST),

  /** Absolute path to the upload root, resolved from the backend package root. */
  uploadRoot: path.resolve(__dirname, '../..', raw.UPLOAD_DIR),
} as const;

export type Env = typeof env;
