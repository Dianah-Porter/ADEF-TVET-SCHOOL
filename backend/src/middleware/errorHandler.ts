import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

/** Anything that reaches here matched no route. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`));
};

/**
 * The single exit point for failures. Express 5 forwards rejected promises
 * here automatically, so route handlers can stay free of try/catch.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Validation failures become field-level messages the form can render inline.
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root';
      if (!fields[key]) fields[key] = issue.message;
    }

    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Some fields need attention.', fields },
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) },
    });
    return;
  }

  // Unrecognised: a bug. Log it in full, tell the client nothing specific.
  console.error('[unhandled]', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end.',
      ...(env.isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
    },
  });
};
