import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ApiError } from '../utils/ApiError';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/** Where parsed query values are stashed — see the note in `validate`. */
const PARSED_QUERY = Symbol('parsedQuery');

/**
 * Parses the request against the given schemas, replacing body and params with
 * their validated output so handlers receive coerced, trimmed, typed values
 * rather than raw strings.
 *
 * Failures throw ZodError, which the error handler turns into field-level
 * messages the dashboard can render inline.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        // Express 5 defines req.query as a getter with no setter, so unlike
        // body and params it cannot be reassigned. Parsed values go on a
        // symbol-keyed property instead, read back via validatedQuery().
        Object.defineProperty(req, PARSED_QUERY, {
          value: schemas.query.parse(req.query),
          configurable: true,
          enumerable: false,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Reads what `validate({ query })` parsed for this request. */
export function validatedQuery<T>(req: Request): T {
  // noUncheckedIndexedAccess widens a symbol lookup to `T | undefined`;
  // validate({ query }) always ran first, so the value is present.
  return (req as unknown as Record<symbol, unknown>)[PARSED_QUERY] as T;
}

/**
 * Reads a path parameter as a string.
 *
 * Express 5 types `req.params[name]` as `string | string[]` because a route
 * pattern can repeat a name. Ours never do, and `validate({ params })` has
 * already checked the shape, so anything else here is a programming error.
 */
export function pathParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string') {
    throw ApiError.badRequest(`Missing "${name}" in the request path.`);
  }

  return value;
}
