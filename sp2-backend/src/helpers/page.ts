// Builds the paged responses of the list endpoints.

import { Request } from 'express';
import { BASE_URL } from '../config.js';
import { Page } from '../dto/shared.js';

/** The url of the same request with another limit and offset, keeping the other query parameters. */
function pageUrl(req: Request, limit: number, offset: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && key !== 'limit' && key !== 'offset') params.set(key, value);
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `${BASE_URL}${req.originalUrl.split('?')[0]}?${params}`;
}

/**
 * A Page of rows turned into items with toItem.
 * Fetch limit + 1 rows: the extra row only tells that there is a next page, and is not returned.
 */
export function buildPage<Row, Item>(
  req: Request, rows: Row[], limit: number, offset: number, toItem: (row: Row) => Item,
): Page<Item> {
  return {
    url: pageUrl(req, limit, offset),
    items: rows.slice(0, limit).map(toItem),
    limit,
    offset,
    next: rows.length > limit ? pageUrl(req, limit, offset + limit) : null,
    prev: offset > 0 ? pageUrl(req, limit, Math.max(0, offset - limit)) : null,
  };
}