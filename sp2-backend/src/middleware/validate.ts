import { RequestHandler, RequestParamHandler } from 'express';
import { validationError } from './errors.js';

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
const MAX_INT = 2147483647;

const patterns = {
  userId: /^[1-9]\d*$/,
  tconst: /^tt\d{7,9}$/,
  nconst: /^nm\d{7,9}$/,
};

export const checkParam =
  (name: keyof typeof patterns): RequestParamHandler =>
  (_req, _res, next, value: string) => {
    const ok = patterns[name].test(value) && (name !== 'userId' || Number(value) <= MAX_INT);
    next(ok ? undefined : validationError(name, `Invalid ${name}.`));
  };

  const toInt = (v: unknown): number | null => {
    if (typeof v !== 'string' || !/^\d+$/.test(v)) {
        return null;
    }

    const n = Number(v);
    return Number.isSafeInteger(n) ? n : null;
};

export const paging: RequestHandler = (req, res, next) => {
  let limit = DEFAULT_LIMIT;
  let offset = 0;

  if (req.query.limit !== undefined) {
    const n = toInt(req.query.limit);

    if (n === null || n < 1) {
        return next(validationError('limit', 'Must be a positive integer.'));
    }

    if (n > MAX_LIMIT) {
      limit = DEFAULT_LIMIT;
  } else {
      limit = n;
  }
}

if (req.query.offset !== undefined) {
    const n = toInt(req.query.offset);
    if (n === null || n > MAX_INT) return next(validationError('offset', 'Must be a non-negative integer.'));
    offset = n;
  }

  res.locals.paging = { limit, offset };
  next();
};

export const oneOf =
  (name: string, values: readonly string[]): RequestHandler =>
  (req, _res, next) => {
    const v = req.query[name];
    if (v === undefined) return next();
    next(typeof v === 'string' && values.includes(v) ? undefined : validationError(name, `Must be one of: ${values.join(', ')}.`));
  };