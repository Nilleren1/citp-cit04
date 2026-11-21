// /titles: browse (with filters), search, one title, its cast (in billing order or by popularity)
// and similar titles.
// GET /titles/:tconst/ratings belongs to the ratings router.

import { Router, type Request } from 'express';
import * as titleData from '../data/titles.js';
import { toCastMemberDto, toTitleDto, toTitleSummaryDto } from '../dto/titles.js';
import { BASE_URL } from '../config.js';
import { buildPage } from '../helpers/page.js';
import { queryFields, queryText } from '../helpers/query.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { checkParam, oneOf, paging, patterns } from '../middleware/validation.js';
import { ApiError, methodNotAllowed, validationError } from '../middleware/errors.js';

export const titles = Router();

titles.param('tconst', checkParam('tconst'));

/** How many cast members GET /titles/:tconst includes. The full list is at /titles/:tconst/cast. */
const CAST_PREVIEW = 10;

/** The query parameters of the structured search. */
const STRUCTURED = ['title', 'plot', 'character', 'person'] as const;

/** The title types in the data, for ?type=. */
const TYPES = [
  'movie', 'short', 'video', 'tvMovie', 'tvSeries', 'tvMiniSeries', 'tvEpisode', 'tvSpecial', 'tvShort',
  'videoGame', 'episode', 'series', 'game',
] as const;

const notFound = (tconst: string) => new ApiError(404, 'not_found', `No title with id ${tconst}.`);

/**
 * The search in GET /titles, or null when there is none (then the titles are listed, see readFilters).
 *   ?q=batman                  substring of the title or plot
 *   ?q=batman joker&match=exact  titles with all the words
 *   ?q=batman joker&match=best   titles with the most of the words, best first
 *   ?q=batman joker&match=weighted  like best, but rare words count more than common ones
 *   ?title=&plot=&character=&person=  structured search, all given fields must match
 */
function readSearch(req: Request): titleData.TitleSearch | null {
  const q = queryText(req, 'q');
  // The oneOf middleware has already checked that match is 'exact', 'best' or 'weighted'.
  const match = queryText(req, 'match') as 'exact' | 'best' | 'weighted' | undefined;
  const fields = queryFields(req, STRUCTURED);
  const structured = Object.keys(fields).length > 0;

  if (q !== undefined && structured) {
    throw validationError('q', `Use either q or ${STRUCTURED.join('/')}, not both.`);
  }
  if (q !== undefined) return { q, match: match ?? 'substring' };
  if (match !== undefined) throw validationError('match', 'Can only be used together with q.');
  return structured ? fields : null;
}

/**
 * The filters and sort order in GET /titles, for the plain list (not for a search).
 *   ?type=movie&genre=drama&year=2008&minRating=8&cast=nm0000288&sort=rating
 */
function readFilters(req: Request): titleData.TitleFilters {
  const filters: titleData.TitleFilters = {};

  // The oneOf middleware has already checked type and sort.
  const type = queryText(req, 'type');
  if (type !== undefined) filters.type = type;
  if (queryText(req, 'sort') === 'rating') filters.sort = 'rating';

  const genre = queryText(req, 'genre');
  if (genre !== undefined) filters.genre = genre;

  const year = queryText(req, 'year');
  if (year !== undefined) {
    if (!/^\d{4}$/.test(year)) throw validationError('year', 'Must be a year with four digits.');
    filters.year = Number(year);
  }

  const minRating = queryText(req, 'minRating');
  if (minRating !== undefined) {
    const n = Number(minRating);
    if (!/^\d+(\.\d+)?$/.test(minRating) || n < 1 || n > 10) {
      throw validationError('minRating', 'Must be a number from 1 to 10.');
    }
    filters.minRating = n;
  }

  const cast = queryText(req, 'cast');
  if (cast !== undefined) {
    if (!patterns.nconst.test(cast)) throw validationError('cast', 'Must be a person id, e.g. nm0000288.');
    filters.cast = cast;
  }

  return filters;
}

titles.get(
  '/',
  optionalAuthenticate,
  oneOf('match', ['exact', 'best', 'weighted']),
  oneOf('type', TYPES),
  oneOf('sort', ['rating']),
  paging,
  async (req, res) => {
    const { limit, offset } = res.locals.paging;
    const search = readSearch(req);
    const filters = readFilters(req);

    // The search functions in the database cannot filter or sort, so filters only work on the plain list.
    const used = Object.keys(filters);
    if (search && used.length > 0) {
      throw validationError(used[0], 'Filters and sort cannot be combined with a search.');
    }

    // Log the search in the user's history once, on the first page, not again when paging.
    const userId = offset === 0 ? (req.user?.id ?? null) : null;

    // One row more than the page size tells buildPage whether there is a next page.
    const rows = search
      ? await titleData.search(search, userId, limit + 1, offset)
      : await titleData.list(filters, limit + 1, offset);

    res.json(buildPage(req, rows, limit, offset, (t) => toTitleSummaryDto(t, BASE_URL)));
  },
);

titles.get('/:tconst', async (req, res) => {
  const tconst = String(req.params.tconst);
  const [title, cast] = await Promise.all([
    titleData.find(tconst),
    titleData.cast(tconst, CAST_PREVIEW, 0),
  ]);
  if (!title) throw notFound(tconst);

  res.json(toTitleDto(title, cast, BASE_URL));
});

// The whole cast and crew in billing order, or with ?sort=popularity only the actors, most popular first.
titles.get('/:tconst/cast', oneOf('sort', ['popularity']), paging, async (req, res) => {
  const tconst = String(req.params.tconst);
  const { limit, offset } = res.locals.paging;
  if (!(await titleData.exists(tconst))) throw notFound(tconst);

  const rows = req.query.sort === 'popularity'
    ? await titleData.popularCast(tconst, limit + 1, offset)
    : await titleData.cast(tconst, limit + 1, offset);
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
