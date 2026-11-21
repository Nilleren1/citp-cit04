import { Router } from 'express';
import * as bookmarksService from '../services/bookmarks.js';
import * as bookmarksData from '../data/bookmarks.js';
import type { BookmarkList } from '../data/bookmarks.js';
import { toPersonBookmarkDto, toTitleBookmarkDto } from '../dto/bookmarks.js';
import { buildPage } from '../helpers/page.js';
import { nconstFromUrl, tconstFromUrl } from '../helpers/urls.js';
import { BASE_URL } from '../config.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { checkParam, oneOf, paging } from '../middleware/validation.js';
import { ApiError, ErrorDetail } from '../middleware/errors.js';

const router = Router();

router.param('userId', checkParam('userId'));
router.param('tconst', checkParam('tconst'));
router.param('nconst', checkParam('nconst'));

router.use('/users/:userId/title-bookmarks', authenticate, requireOwnership);
router.use('/users/:userId/person-bookmarks', authenticate, requireOwnership);

const LISTS = ['watched', 'watchlist'];

const asObject = (body: unknown) =>
  (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

const fail = (details: ErrorDetail[]) => {
  if (details.length > 0) throw new ApiError(400, 'validation_failed', 'The request is not valid.', details);
};

function readTitleBookmarkBody(body: unknown, withTitle: boolean) {
  const b = asObject(body);
  const details: ErrorDetail[] = [];

  const tconst = tconstFromUrl(b.title);
  if (withTitle && !tconst) details.push({ field: 'title', message: 'Must be the URL of a title.' });

  if (typeof b.list !== 'string' || !LISTS.includes(b.list)) {
    details.push({ field: 'list', message: `Must be one of: ${LISTS.join(', ')}.` });
  }

  fail(details);
  return { tconst: tconst ?? '', list: b.list as BookmarkList };
}

function readPersonBookmarkBody(body: unknown) {
  const nconst = nconstFromUrl(asObject(body).person);
  fail(nconst ? [] : [{ field: 'person', message: 'Must be the URL of a person.' }]);
  return { nconst: nconst as string };
}

// ---- Title bookmarks ----

router.get('/users/:userId/title-bookmarks', oneOf('list', LISTS), paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const list = req.query.list as BookmarkList | undefined;
  const rows = await bookmarksData.listTitleBookmarks(Number(req.params.userId), list, limit + 1, offset);

  res.json(buildPage(req, rows, limit, offset, (b) => toTitleBookmarkDto(b, BASE_URL)));
});

router.get('/users/:userId/title-bookmarks/:tconst', async (req, res) => {
  const bookmark = await bookmarksData.findTitleBookmark(Number(req.params.userId), String(req.params.tconst));
  if (!bookmark) throw new ApiError(404, 'not_found', 'No such bookmark.');

  res.json(toTitleBookmarkDto(bookmark, BASE_URL));
});

router.post('/users/:userId/title-bookmarks', async (req, res) => {
  const userId = Number(req.params.userId);
  const { tconst, list } = readTitleBookmarkBody(req.body, true);

  const result = await bookmarksService.createTitleBookmark(userId, tconst, list);
  if (result === 'no-such-title') throw new ApiError(404, 'not_found', 'No such title.');
  if (result === 'already-exists') throw new ApiError(409, 'conflict', 'You have already bookmarked this title.');

  const created = await bookmarksData.findTitleBookmark(userId, tconst);
  if (!created) throw new Error('A bookmark that was just created could not be read.');

  res
    .status(201)
    .location(`${BASE_URL}/users/${userId}/title-bookmarks/${tconst}`)
    .json(toTitleBookmarkDto(created, BASE_URL));
});

router.put('/users/:userId/title-bookmarks/:tconst', async (req, res) => {
  const userId = Number(req.params.userId);
  const tconst = String(req.params.tconst);
  const { list } = readTitleBookmarkBody(req.body, false);

  if (!(await bookmarksData.updateTitleBookmark(userId, tconst, list))) {
    throw new ApiError(404, 'not_found', 'No such bookmark.');
  }

  const updated = await bookmarksData.findTitleBookmark(userId, tconst);
  if (!updated) throw new Error('A bookmark that was just updated could not be read.');

  res.json(toTitleBookmarkDto(updated, BASE_URL));
});

router.delete('/users/:userId/title-bookmarks/:tconst', async (req, res) => {
  await bookmarksData.removeTitleBookmark(Number(req.params.userId), String(req.params.tconst));
  res.status(204).send();
});

// ---- Person bookmarks ----

router.get('/users/:userId/person-bookmarks', paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const rows = await bookmarksData.listPersonBookmarks(Number(req.params.userId), limit + 1, offset);

  res.json(buildPage(req, rows, limit, offset, (b) => toPersonBookmarkDto(b, BASE_URL)));
});

router.get('/users/:userId/person-bookmarks/:nconst', async (req, res) => {
  const bookmark = await bookmarksData.findPersonBookmark(Number(req.params.userId), String(req.params.nconst));
  if (!bookmark) throw new ApiError(404, 'not_found', 'No such bookmark.');

  res.json(toPersonBookmarkDto(bookmark, BASE_URL));
});

router.post('/users/:userId/person-bookmarks', async (req, res) => {
  const userId = Number(req.params.userId);
  const { nconst } = readPersonBookmarkBody(req.body);

  const result = await bookmarksService.createPersonBookmark(userId, nconst);
  if (result === 'no-such-person') throw new ApiError(404, 'not_found', 'No such person.');
  if (result === 'already-exists') throw new ApiError(409, 'conflict', 'You have already bookmarked this person.');

  const created = await bookmarksData.findPersonBookmark(userId, nconst);
  if (!created) throw new Error('A bookmark that was just created could not be read.');

  res
    .status(201)
    .location(`${BASE_URL}/users/${userId}/person-bookmarks/${nconst}`)
    .json(toPersonBookmarkDto(created, BASE_URL));
});

router.delete('/users/:userId/person-bookmarks/:nconst', async (req, res) => {
  await bookmarksData.removePersonBookmark(Number(req.params.userId), String(req.params.nconst));
  res.status(204).send();
});

export default router;