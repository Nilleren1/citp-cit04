// /persons: browse, search, one person and their co-players.

import { Router, type Request } from 'express';
import * as personData from '../data/persons.js';
import { toCoPlayerDto, toPersonDto, toPersonSummaryDto } from '../dto/persons.js';
import { BASE_URL } from '../config.js';
import { buildPage } from './page.js';
import { queryFields, queryText } from './query.js';
import { checkParam, paging } from '../middleware/validate.js';
import { ApiError, validationError } from '../middleware/errors.js';

export const persons = Router();

persons.param('nconst', checkParam('nconst'));

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

persons.get('/', paging, async (req, res) => {
  const { limit, offset } = res.locals.paging;
  const search = readSearch(req);

  // Log the search in the user's history once, on the first page, not again when paging.
  const userId = offset === 0 ? (req.user?.id ?? null) : null;

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

persons.get('/:nconst/co-players', paging, async (req, res) => {
  const nconst = String(req.params.nconst);
  const { limit, offset } = res.locals.paging;
  if (!(await personData.exists(nconst))) throw notFound(nconst);

  const rows = await personData.coPlayers(nconst, limit + 1, offset);
  res.json(buildPage(req, rows, limit, offset, (c) => toCoPlayerDto(c, BASE_URL)));
});
