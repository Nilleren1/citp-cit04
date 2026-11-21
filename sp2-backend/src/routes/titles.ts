// /titles: browse, search, one title, its cast and similar titles.
// GET /titles/:tconst/ratings belongs to the ratings router.

import { Router, type Request } from 'express';
import * as titleData from '../data/titles.js';
import { toCastMemberDto, toTitleDto, toTitleSummaryDto } from '../dto/titles.js';
import { BASE_URL } from '../config.js';
import { buildPage } from '../helpers/page.js';
import { queryFields, queryText } from '../helpers/query.js';
import { checkParam, oneOf, paging } from '../middleware/validation.js';
import { ApiError, methodNotAllowed, validationError } from '../middleware/errors.js';

export const titles = Router();

titles.param('tconst', checkParam('tconst'));

/** How many cast members GET /titles/:tconst includes. The full list is at /titles/:tconst/cast. */
const CAST_PREVIEW = 10;

/** The query parameters of the structured search. */
const STRUCTURED = ['title', 'plot', 'character', 'person'] as const;

const notFound = (tconst: string) => new ApiError(404, 'not_found', `No title with id ${tconst}.`);

/**
 * The search in GET /titles, or null when there is none (then all titles are listed).
 *   ?q=batman                  substring of the title or plot
 *   ?q=batman joker&match=exact  titles with all the words
 *   ?q=batman joker&match=best   titles with the most of the words, best first
 *   ?title=&plot=&character=&person=  structured search, all given fields must match
 */
function readSearch(req: Request): titleData.TitleSearch | null {
  const q = queryText(req, 'q');
  // The oneOf middleware has already checked that match is 'exact' or 'best'.
  const match = queryText(req, 'match') as 'exact' | 'best' | undefined;
  const fields = queryFields(req, STRUCTURED);
  const structured = Object.keys(fields).length > 0;

  if (q !== undefined && structured) {
    throw validationError('q', `Use either q or ${STRUCTURED.join('/')}, not both.`);
  }
  if (q !== undefined) return { q, match: match ?? 'substring' };
  if (match !== undefined) throw validationError('match', 'Can only be used together with q.');
  return structured ? fields : null;
}

titles.get('/', oneOf('match', ['exact', 'best']), paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const search = readSearch(req);

  // Log the search in the user's history once, on the first page, not again when paging.
  const userId = offset === 0 ? (req.user?.id ?? null) : null;

  // One row more than the page size tells buildPage whether there is a next page.
  const rows = search
    ? await titleData.search(search, userId, limit + 1, offset)
    : await titleData.list(limit + 1, offset);

  res.json(buildPage(req, rows, limit, offset, (t) => toTitleSummaryDto(t, BASE_URL)));
});

titles.get('/:tconst', async (req, res) => {
  const tconst = String(req.params.tconst);
  const [title, cast] = await Promise.all([
    titleData.find(tconst),
    titleData.cast(tconst, CAST_PREVIEW, 0),
  ]);
  if (!title) throw notFound(tconst);

  res.json(toTitleDto(title, cast, BASE_URL));
});

titles.get('/:tconst/cast', paging, async (req, res) => {
  const tconst = String(req.params.tconst);
  const { limit, offset } = res.locals.paging;
  if (!(await titleData.exists(tconst))) throw notFound(tconst);

  const rows = await titleData.cast(tconst, limit + 1, offset);
  res.json(buildPage(req, rows, limit, offset, (c) => toCastMemberDto(c, BASE_URL)));
});

titles.get('/:tconst/similar-titles', paging, async (req, res) => {
  const tconst = String(req.params.tconst);
  const { limit, offset } = res.locals.paging;
  if (!(await titleData.exists(tconst))) throw notFound(tconst);

  const rows = await titleData.similar(tconst, limit + 1, offset);
  res.json(buildPage(req, rows, limit, offset, (t) => toTitleSummaryDto(t, BASE_URL)));
});

// Titles come from the IMDb data and are read-only, so any other method on these paths is a 405.
titles.all(['/', '/:tconst', '/:tconst/cast', '/:tconst/similar-titles'], methodNotAllowed('GET'));
