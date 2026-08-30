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

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  STORAGE_DRIVER: z.enum(['local']).default('local'),
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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  console.error(
    `\nInvalid environment configuration. Fix these in backend/.env:\n\n${issues}\n\n` +
      'Copy .env.example to .env if you have not already.\n',
  );
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,

  isProduction: raw.NODE_ENV === 'production',
  isDevelopment: raw.NODE_ENV === 'development',

  /** CORS_ORIGINS is a comma-separated string in .env; callers want a list. */
  corsOrigins: raw.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** True once SMTP is configured; otherwise the mailer only logs. */
  mailEnabled: Boolean(raw.SMTP_HOST),

  /** Absolute path to the upload root, resolved from the backend package root. */
  uploadRoot: path.resolve(__dirname, '../..', raw.UPLOAD_DIR),
} as const;

export type Env = typeof env;
