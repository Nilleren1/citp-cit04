// Helpers for reading the search parameters in the query string.

import type { Request } from 'express';
import { validationError } from '../middleware/errors.js';

/**
 * A query parameter as trimmed text. Absent and blank parameters are both undefined,
 * so an empty search form field is ignored. A repeated parameter (?q=a&q=b) is a 400.
 */
export function queryText(req: Request, name: string): string | undefined {
  const value = req.query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw validationError(name, 'Must be given once.');
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** The given query parameters that are present and not blank. */
export function queryFields<K extends string>(req: Request, names: readonly K[]): Partial<Record<K, string>> {
  const fields: Partial<Record<K, string>> = {};
  for (const name of names) {
    const value = queryText(req, name);
    if (value !== undefined) fields[name] = value;
  }
  return fields;
}
