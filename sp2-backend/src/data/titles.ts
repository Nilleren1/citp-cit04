// Data access for titles: browsing, searching, one title, its cast (in billing order or by popularity)
// and similar titles.
// The search functions are the ones from sp1-database/D_functions.sql.

import { pool } from '../db.js';

/** The fields of a title shown in lists (TitlePage items). */
export interface TitleSummary {
  tconst: string;
  title: string;
  type: string;
  startYear: number | null;
  poster: string | null;
  averageRating: number | null;
}

/** One title with everything GET /titles/:tconst shows, except the cast. */
export interface Title extends TitleSummary {
  originalTitle: string | null;
  isAdult: boolean | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  numVotes: number | null;
  plot: string | null;
  genres: string[];
}

/** One credit in a title's cast and crew. */
export interface CastMember {
  nconst: string;
  name: string;
  category: string;
  /** As stored in worked_on, e.g. "['Bruce Wayne']". */
  characters: string | null;
}

/**
 * A title search.
 *   { q, match }  free text: 'substring' = string_search (D2), 'exact' = exact_match_query (D11),
 *                 'best' = best_match_query (D12), 'weighted' = weighted_search (D14)
 *   { title, plot, character, person }  structured_string_search (D4); omitted fields are ignored
 */
export type TitleSearch =
  | { q: string; match: 'substring' | 'exact' | 'best' | 'weighted' }
  | { title?: string; plot?: string; character?: string; person?: string };

// The SELECT list for a TitleSummary; the query must call the title table t.
// tconst is character(10) in the database, so rtrim removes the padding.
const SUMMARY_COLUMNS = `
  rtrim(t.tconst) AS tconst,
  t.primarytitle AS title,
  t.titletype AS type,
  t.startyear AS "startYear",
  t.poster,
  t.averagerating::float8 AS "averageRating"`;

/** Whether a title with this tconst exists. Used to give a 404 before listing its cast or similar titles. */
export async function exists(tconst: string): Promise<boolean> {
  const { rowCount } = await pool.query(`SELECT 1 FROM title WHERE tconst = $1`, [tconst]);
  return (rowCount ?? 0) > 0;
}

/** One title with its genres, or undefined if there is none. */
export async function find(tconst: string): Promise<Title | undefined> {
  const { rows } = await pool.query<Title>(
    `SELECT ${SUMMARY_COLUMNS},
            t.originaltitle AS "originalTitle",
            t.isadult AS "isAdult",
            t.endyear AS "endYear",
            t.runtimeminutes AS "runtimeMinutes",
            t.numvotes AS "numVotes",
            t.plot,
            ARRAY(SELECT g.genre_name::text
                  FROM title_genre g
                  WHERE g.tconst = t.tconst
                  ORDER BY g.genre_name) AS genres
     FROM title t
     WHERE t.tconst = $1`,
    [tconst],
  );
  return rows[0];
}

/** All titles, most voted first. */
export async function list(limit: number, offset: number): Promise<TitleSummary[]> {
  const { rows } = await pool.query<TitleSummary>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM title t
     ORDER BY t.numvotes DESC NULLS LAST, t.tconst
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return rows;
}

/**
 * One page of search results, in the order the database function returns them.
 * When userId is given, the database function logs the search in the user's history.
 */
export async function search(
  s: TitleSearch, userId: number | null, limit: number, offset: number,
): Promise<TitleSummary[]> {
  // WITH ORDINALITY numbers the function's rows (n), so the join with title keeps its ranking.
  let source: string;
  let args: unknown[];

  if ('q' in s) {
    if (s.match === 'weighted') {
      // weighted_search takes the words as an array, and how many rows to return,
      // so ask for enough to cover this page.
      args = [s.q.split(/\s+/), limit + offset, userId];
      source = `weighted_search($1::text[], $2, $3)
                WITH ORDINALITY AS s(tconst, primarytitle, relevance, matched_words, n)`;
    } else {
      args = [s.q, userId];
      source = {
        substring: `string_search($1, $2) WITH ORDINALITY AS s(tconst, primarytitle, n)`,
        exact: `exact_match_query($1, $2) WITH ORDINALITY AS s(tconst, primarytitle, startyear, n)`,
        best: `best_match_query($1, $2) WITH ORDINALITY AS s(tconst, primarytitle, startyear, rank, n)`,
      }[s.match];
    }
  } else {
    args = [s.title ?? null, s.plot ?? null, s.character ?? null, s.person ?? null, userId];
    source = `structured_string_search($1, $2, $3, $4, $5) WITH ORDINALITY AS s(tconst, primarytitle, n)`;
  }

  const { rows } = await pool.query<TitleSummary>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM ${source}
     JOIN title t ON t.tconst = s.tconst::character(10)
     ORDER BY s.n
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, limit, offset],
  );
  return rows;
}

/** The cast and crew of a title, in billing order. */
export async function cast(tconst: string, limit: number, offset: number): Promise<CastMember[]> {
  const { rows } = await pool.query<CastMember>(
    `SELECT rtrim(w.nconst) AS nconst,
            p.primaryname AS name,
            w.category,
            w.characters
     FROM worked_on w
     JOIN person p ON p.nconst = w.nconst
     WHERE w.tconst = $1
     ORDER BY w.ordering
     LIMIT $2 OFFSET $3`,
    [tconst, limit, offset],
  );
  return rows;
}

/**
 * The actors of a title, most popular (highest person rating) first, through get_popular_actors (D8).
 * Only actors and actresses, one row each; an actor with several roles has them joined in characters.
 */
export async function popularCast(tconst: string, limit: number, offset: number): Promise<CastMember[]> {
  const { rows } = await pool.query<CastMember>(
    // The function returns no category, so it is taken from the actor's first credit in the title.
    `SELECT s.nconst,
            s.primaryname AS name,
            (SELECT w.category
             FROM worked_on w
             WHERE w.tconst = $1 AND w.nconst = s.nconst::character(10)
               AND w.category IN ('actor', 'actress')
             ORDER BY w.ordering
             LIMIT 1) AS category,
            s.characters
     FROM get_popular_actors($1)
          WITH ORDINALITY AS s(nconst, primaryname, characters, rating, numvotes, num_titles, n)
     ORDER BY s.n
     LIMIT $2 OFFSET $3`,
    [tconst, limit, offset],
  );
  return rows;
}

/** Titles similar to the given one, most similar first, through get_similar_titles (D9). */
export async function similar(tconst: string, limit: number, offset: number): Promise<TitleSummary[]> {
  const { rows } = await pool.query<TitleSummary>(
    // get_similar_titles takes how many rows to return, so ask for enough to cover this page.
    `SELECT ${SUMMARY_COLUMNS}
     FROM get_similar_titles($1, $2)
          WITH ORDINALITY AS s(tconst, primarytitle, score, shared_genres, shared_people, n)
     JOIN title t ON t.tconst = s.tconst::character(10)
     ORDER BY s.n
     LIMIT $3 OFFSET $4`,
    [tconst, limit + offset, limit, offset],
  );
  return rows;
}