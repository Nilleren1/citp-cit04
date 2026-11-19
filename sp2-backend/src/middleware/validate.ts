import { RequestHandler, RequestParamHandler } from 'express';
import { validationError } from './errors.js';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
const MAX_INT = 2147483647;

const patterns = {
  userId: /^[1-9]\d*$/,
  tconst: /^tt\d{7,9}$/,
};

export const checkParam =
  (name: keyof typeof patterns): RequestParamHandler =>
  (_req, _res, next, value: string) => {
    const ok = patterns[name].test(value) && (name !== 'userId' || Number(value) <= MAX_INT);
    next(ok ? undefined : validationError(name, `Invalid ${name}.`));
  };

const toInt = (v: unknown): number | null =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null;

export const paging: RequestHandler = (req, res, next) => {
  let limit = DEFAULT_LIMIT;
  let offset = 0;

  if (req.query.limit !== undefined) {
    const n = toInt(req.query.limit);
    if (n === null || n < 1) return next(validationError('limit', 'Must be a positive integer.'));
    limit = n > MAX_LIMIT ? DEFAULT_LIMIT : n;
  }
  if (req.query.offset !== undefined) {
    const n = toInt(req.query.offset);
    if (n === null || n > MAX_INT) return next(validationError('offset', 'Must be a non-negative integer.'));
    offset = n;
  }

  res.locals.paging = { limit, offset };
  next();
};