
import { Router, type Request } from 'express';
import * as ratingsService from '../services/ratings.js';
import { toRatingDto } from '../dto/rating.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireOwnership } from '../middleware/authorize.js';

const ratings = Router();

function getBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

function parsePagination(req: Request) {
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return undefined;
  }

  return { limit, offset };
}

function isValidTconst(value: unknown): value is string {
  return typeof value === 'string' && /^tt\d+$/.test(value);
}

function isRatingBody(body: unknown): body is { rating: number; review?: string | null } {
  if (typeof body !== 'object' || body === null || !('rating' in body)) {
    return false;
  }

  const value = body as { rating: unknown; review?: unknown };

  return (
    Number.isInteger(value.rating) &&
    typeof value.rating === 'number' &&
    value.rating >= 1 &&
    value.rating <= 10 &&
    (value.review === undefined ||
      value.review === null ||
      typeof value.review === 'string')
  );
}

ratings.get('/users/:userId/ratings', authenticate, requireOwnership, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const pagination = parsePagination(req);

    if (!pagination) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const result = await ratingsService.listByUser(
      userId,
      pagination.limit,
      pagination.offset,
    );

    const base = getBaseUrl(req);

    res.status(200).json({
      url: `${base}/users/${userId}/ratings`,
      ratings: result.map(r => toRatingDto(r, base)),
      ...pagination,
    });
  } catch (err) {
    next(err);
  }
});

ratings.get('/users/:userId/ratings/:tconst', authenticate, requireOwnership, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { tconst } = req.params;

    if (!isValidTconst(tconst)) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const rating = await ratingsService.find(userId, tconst);

    if (!rating) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json(toRatingDto(rating, getBaseUrl(req)));
  } catch (err) {
    next(err);
  }
});

ratings.post('/users/:userId/ratings/:tconst', authenticate, requireOwnership, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { tconst } = req.params;

    if (!isValidTconst(tconst) || !isRatingBody(req.body)) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const result = await ratingsService.create(
      userId,
      tconst,
      req.body.rating,
      req.body.review ?? null,
    );

    if (result === 'already-exists') {
      res.status(409).json({ error: 'conflict' });
      return;
    }

    const rating = await ratingsService.find(userId, tconst);

    if (!rating) {
      res.status(500).json({ error: 'internal_error' });
      return;
    }

    res
      .status(201)
      .location(`${getBaseUrl(req)}/users/${userId}/ratings/${tconst}`)
      .json(toRatingDto(rating, getBaseUrl(req)));
  } catch (err) {
    next(err);
  }
});

ratings.put('/users/:userId/ratings/:tconst', authenticate, requireOwnership, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { tconst } = req.params;

    if (!isValidTconst(tconst) || !isRatingBody(req.body)) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const result = await ratingsService.update(
      userId,
      tconst,
      req.body.rating,
      req.body.review ?? null,
    );

    if (result === 'not-found') {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const rating = await ratingsService.find(userId, tconst);

    if (!rating) {
      res.status(500).json({ error: 'internal_error' });
      return;
    }

    res.status(200).json(toRatingDto(rating, getBaseUrl(req)));
  } catch (err) {
    next(err);
  }
});

ratings.delete('/users/:userId/ratings/:tconst', authenticate, requireOwnership, async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { tconst } = req.params;

    if (!isValidTconst(tconst)) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const removed = await ratingsService.remove(userId, tconst);

    if (!removed) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

ratings.get('/titles/:tconst/ratings', async (req, res, next) => {
  try {
    const { tconst } = req.params;
    const pagination = parsePagination(req);

    if (!isValidTconst(tconst) || !pagination) {
      res.status(400).json({ error: 'validation_failed' });
      return;
    }

    const result = await ratingsService.listByTitle(
      tconst,
      pagination.limit,
      pagination.offset,
    );

    const base = getBaseUrl(req);

    res.status(200).json({
      url: `${base}/titles/${tconst}/ratings`,
      ratings: result.map(r => toRatingDto(r, base)),
      ...pagination,
    });
  } catch (err) {
    next(err);
  }
});

export default ratings;
