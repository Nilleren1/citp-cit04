// Validation middleware for Express routes: path parameters, paging and enum query parameters.
// Invalid input is passed to next() as a 400 validation error, which errorHandler turns into JSON.

import { RequestHandler, RequestParamHandler } from 'express';
import { validationError } from './errors.js';

/** Page size when ?limit is not given. */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
/** The largest PostgreSQL integer; larger ids and offsets would make the query fail. */
const MAX_INT = 2147483647;

/** The accepted formats for ids (IMDb ids are tt/nm followed by 7–9 digits). */
export const patterns = {
  userId: /^[1-9]\d*$/,
  tconst: /^tt\d{7,9}$/,
  nconst: /^nm\d{7,9}$/,
};

/**
 * Checks the format of a path parameter, so a malformed id is a 400 instead of a 404.
 * Use with router.param, e.g. titles.param('tconst', checkParam('tconst')).
 */
export const checkParam =
  (name: keyof typeof patterns): RequestParamHandler =>
  (_req, _res, next, value: string) => {
    const ok = patterns[name].test(value) && (name !== 'userId' || Number(value) <= MAX_INT);
    next(ok ? undefined : validationError(name, `Invalid ${name}.`));
  };

/** The value as a number if it is a string of digits, otherwise null. */
const toInt = (v: unknown): number | null =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;

/**
 * Reads ?limit and ?offset into res.locals.paging = { limit, offset }.
 * A limit above MAX_LIMIT is reduced to MAX_LIMIT.
 */
export const paging: RequestHandler = (req, res, next) => {
  let limit = DEFAULT_LIMIT;
  let offset = 0;

  if (req.query.limit !== undefined) {
    const n = toInt(req.query.limit);
    if (n === null || n < 1) return next(validationError('limit', 'Must be a positive integer.'));
    limit = Math.min(n, MAX_LIMIT);
  }
  if (req.query.offset !== undefined) {
    const n = toInt(req.query.offset);
    if (n === null || n > MAX_INT) return next(validationError('offset', 'Must be a non-negative integer.'));
    offset = n;
  }

  res.locals.paging = { limit, offset };
  next();
};

/** Rejects a query parameter that is given but is not one of the allowed values. */
export const oneOf =
  (name: string, values: readonly string[]): RequestHandler =>
  (req, _res, next) => {
    const v = req.query[name];
    if (v === undefined) return next();
    next(typeof v === 'string' && values.includes(v) ? undefined : validationError(name, `Must be one of: ${values.join(', ')}.`));
  };
