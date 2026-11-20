import { Request } from 'express';
import { BASE_URL } from '../config.js';
import { Page } from '../dto/shared.js';

function pageUrl(req: Request, limit: number, offset: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && key !== 'limit' && key !== 'offset') params.set(key, value);
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `${BASE_URL}${req.originalUrl.split('?')[0]}?${params}`;
}

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