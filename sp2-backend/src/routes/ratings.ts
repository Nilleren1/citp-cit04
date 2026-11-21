import { Router } from 'express';
import * as ratingsService from '../services/ratings.js';
import { toRatingDto } from '../dto/ratings.js';
import { buildPage } from './page.js';
import { BASE_URL } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireOwnership } from '../middleware/authorize.js';
import { checkParam, paging } from '../middleware/validate.js';
import { ApiError, ErrorDetail } from '../middleware/errors.js';
import { tconstFromUrl } from './urls.js';

const router = Router();

const owner = [authenticate, requireOwnership];

router.param('userId', checkParam('userId'));
router.param('tconst', checkParam('tconst'));

function readRatingBody(body: unknown, withTitle: boolean) {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const details: ErrorDetail[] = [];

  let tconst = '';
  if (withTitle) {
    const parsed = tconstFromUrl(b.title);
    if (parsed) tconst = parsed;
    else details.push({ field: 'title', message: 'Must be the URL of a title.' });
  }

  const rating = b.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 10) {
    details.push({ field: 'rating', message: 'Must be an integer between 1 and 10.' });
  }

  const review = b.review ?? null;
  if (review !== null && typeof review !== 'string') {
    details.push({ field: 'review', message: 'Must be a string or null.' });
  }

  if (details.length > 0) {
    throw new ApiError(400, 'validation_failed', 'The request is not valid.', details);
  }
  return { tconst, rating: rating as number, review: review as string | null };
}

router.get('/users/:userId/ratings', paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const rows = await ratingsService.listByUser(Number(req.params.userId), limit + 1, offset);
  if (!rows) throw new ApiError(404, 'not_found', 'No such user.');

  res.json(buildPage(req, rows, limit, offset, (r) => toRatingDto(r, BASE_URL)));
});

router.get('/users/:userId/ratings/:tconst', async (req, res) => {
  const rating = await ratingsService.find(Number(req.params.userId), String(req.params.tconst));
  if (!rating) throw new ApiError(404, 'not_found', 'No such rating.');

  res.json(toRatingDto(rating, BASE_URL));
});

router.get('/titles/:tconst/ratings', paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const rows = await ratingsService.listByTitle(String(req.params.tconst), limit + 1, offset);
  if (!rows) throw new ApiError(404, 'not_found', 'No such title.');

  res.json(buildPage(req, rows, limit, offset, (r) => toRatingDto(r, BASE_URL)));
});

router.post('/users/:userId/ratings', ...owner, async (req, res) => {
  const userId = Number(req.params.userId);
  const { tconst, rating, review } = readRatingBody(req.body, true);

  const result = await ratingsService.create(userId, tconst, rating, review);
  if (result === 'no-such-title') throw new ApiError(404, 'not_found', 'No such title.');
  if (result === 'already-exists') throw new ApiError(409, 'conflict', 'You have already rated this title.');

  const created = await ratingsService.find(userId, tconst);
  if (!created) throw new Error('A rating that was just created could not be read.');

  res
    .status(201)
    .location(`${BASE_URL}/users/${userId}/ratings/${tconst}`)
    .json(toRatingDto(created, BASE_URL));
});

router.put('/users/:userId/ratings/:tconst', ...owner, async (req, res) => {
  const userId = Number(req.params.userId);
  const { rating, review } = readRatingBody(req.body, false);

  const result = await ratingsService.update(userId, String(req.params.tconst), rating, review);
  if (result === 'not-found') throw new ApiError(404, 'not_found', 'No such rating.');

  const updated = await ratingsService.find(userId, String(req.params.tconst));
  if (!updated) throw new Error('A rating that was just updated could not be read.');

  res.json(toRatingDto(updated, BASE_URL));
});

router.delete('/users/:userId/ratings/:tconst', ...owner, async (req, res) => {
  // Repeating a DELETE is not an error: the rating is gone either way
  await ratingsService.remove(Number(req.params.userId), String(req.params.tconst));
  res.status(204).send();
});

export default router;