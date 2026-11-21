// /persons: browse, search, one person, their co-players and the words of their titles.

import { Router, type Request } from 'express';
import * as personData from '../data/persons.js';
import { toCoPlayerDto, toPersonDto, toPersonSummaryDto, toPersonWordDto } from '../dto/persons.js';
import { BASE_URL } from '../config.js';
import { buildPage } from '../helpers/page.js';
import { queryFields, queryText } from '../helpers/query.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { checkParam, oneOf, paging } from '../middleware/validation.js';
import { ApiError, methodNotAllowed, validationError } from '../middleware/errors.js';

export const persons = Router();

persons.param('nconst', checkParam('nconst'));

/** The query parameters of the structured search. */
const STRUCTURED = ['name', 'profession', 'title', 'character'] as const;

const notFound = (nconst: string) => new ApiError(404, 'not_found', `No person with id ${nconst}.`);

/**
 * The search in GET /persons, or null when there is none (then all persons are listed).
 *   ?q=keanu                                  name contains the text, exact and best known first
 *   ?name=&profession=&title=&character=      structured search, all given fields must match
 *                                             (title and character on the same credit)
 */
function readSearch(req: Request): personData.PersonSearch | null {
  const q = queryText(req, 'q');
  const fields = queryFields(req, STRUCTURED);
  const structured = Object.keys(fields).length > 0;

  if (q !== undefined && structured) {
    throw validationError('q', `Use either q or ${STRUCTURED.join('/')}, not both.`);
  }
  if (q !== undefined) return { q };
  return structured ? fields : null;
}

persons.get('/', optionalAuthenticate, paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const search = readSearch(req);

  // Log the search in the user's history once, on the first page, not again when paging.
  const userId = offset === 0 ? (req.user?.id ?? null) : null;

  // One row more than the page size tells buildPage whether there is a next page.
  const rows = search
    ? await personData.search(search, userId, limit + 1, offset)
    : await personData.list(limit + 1, offset);

  res.json(buildPage(req, rows, limit, offset, (p) => toPersonSummaryDto(p, BASE_URL)));
});

persons.get('/:nconst', async (req, res) => {
  const nconst = String(req.params.nconst);
  const person = await personData.find(nconst);
  if (!person) throw notFound(nconst);

  res.json(toPersonDto(person, BASE_URL));
});

// Most shared titles first (D6), or with ?sort=popularity most popular first (D8).
persons.get('/:nconst/co-players', oneOf('sort', ['popularity']), paging, async (req, res) => {
  const nconst = String(req.params.nconst);
  const { limit, offset } = res.locals.paging;
  if (!(await personData.exists(nconst))) throw notFound(nconst);

  const rows = req.query.sort === 'popularity'
    ? await personData.popularCoPlayers(nconst, limit + 1, offset)
    : await personData.coPlayers(nconst, limit + 1, offset);
  res.json(buildPage(req, rows, limit, offset, (c) => toCoPlayerDto(c, BASE_URL)));
});

// The words that occur most often in the person's titles (D10).
persons.get('/:nconst/words', paging, async (req, res) => {
  const nconst = String(req.params.nconst);
  const { limit, offset } = res.locals.paging;
  if (!(await personData.exists(nconst))) throw notFound(nconst);

  const rows = await personData.words(nconst, limit + 1, offset);
  res.json(buildPage(req, rows, limit, offset, toPersonWordDto));
});

// Persons come from the IMDb data and are read-only, so any other method on these paths is a 405.
persons.all(['/', '/:nconst', '/:nconst/co-players', '/:nconst/words'], methodNotAllowed('GET'));
