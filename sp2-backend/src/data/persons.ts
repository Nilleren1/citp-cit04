// Data access for persons: browsing, searching, one person and their co-players.
// The search functions are the ones from sp1-database/D_functions.sql.

import { pool } from '../db.js';

/** The fields of a person shown in lists (PersonPage items). */
export interface PersonSummary {
  nconst: string;
  name: string;
  professions: string[];
}

/** One person with everything GET /persons/:nconst shows. The rating fields come from name_rating (D7). */
export interface Person extends PersonSummary {
  birthYear: number | null;
  deathYear: number | null;
  rating: number | null;
  numVotes: number | null;
  numTitles: number | null;
  ratingUpdatedAt: Date | null;
}

export interface CoPlayer {
  nconst: string;
  name: string;
  titleCount: number;
}

/**
 * A person search.
 *   { q }  name_search (D5)
 *   { name, profession, title, character }  structured_name_search (D5); omitted fields are ignored
 */
export type PersonSearch =
  | { q: string }
  | { name?: string; profession?: string; title?: string; character?: string };

const SUMMARY_COLUMNS = `
  rtrim(p.nconst) AS nconst,
  p.primaryname AS name,
  ARRAY(SELECT pp.profession_name::text
        FROM person_profession pp
        WHERE pp.nconst = p.nconst
        ORDER BY pp.profession_name) AS professions`;

export async function exists(nconst: string): Promise<boolean> {
  const { rowCount } = await pool.query(`SELECT 1 FROM person WHERE nconst = $1`, [nconst]);
  return (rowCount ?? 0) > 0;
}

export async function find(nconst: string): Promise<Person | undefined> {
  const { rows } = await pool.query<Person>(
    `SELECT ${SUMMARY_COLUMNS},
            p.birthyear AS "birthYear",
            p.deathyear AS "deathYear",
            nr.rating::float8 AS rating,
            nr.numvotes AS "numVotes",
            nr.num_titles AS "numTitles",
            nr.updated_at AS "ratingUpdatedAt"
     FROM person p
     LEFT JOIN name_rating nr ON nr.nconst = p.nconst
     WHERE p.nconst = $1`,
    [nconst],
  );
  return rows[0];
}

/** All persons, best known (most votes on their titles) first. */
export async function list(limit: number, offset: number): Promise<PersonSummary[]> {
  const { rows } = await pool.query<PersonSummary>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM person p
     LEFT JOIN name_rating nr ON nr.nconst = p.nconst
     ORDER BY nr.numvotes DESC NULLS LAST, p.nconst
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
  s: PersonSearch, userId: number | null, limit: number, offset: number,
): Promise<PersonSummary[]> {
  // WITH ORDINALITY numbers the function's rows (n), so the join with person keeps its ranking.
  let source: string;
  let args: unknown[];

  if ('q' in s) {
    args = [s.q, userId];
    source = `name_search($1, $2)
              WITH ORDINALITY AS s(nconst, primaryname, birthyear, deathyear, professions, title_count, n)`;
  } else {
    args = [s.name ?? null, s.profession ?? null, s.title ?? null, s.character ?? null, userId];
    source = `structured_name_search($1, $2, $3, $4, $5) WITH ORDINALITY AS s(nconst, primaryname, n)`;
  }

  const { rows } = await pool.query<PersonSummary>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM ${source}
     JOIN person p ON p.nconst = s.nconst::character(10)
     ORDER BY s.n
     LIMIT $${args.length + 1} OFFSET $${args.length + 2}`,
    [...args, limit, offset],
  );
  return rows;
}

/**
 * The actors who most often acted in the same titles as the given actor.
 * Same logic as co_players (D6), but by nconst, because names are not unique.
 */
export async function coPlayers(nconst: string, limit: number, offset: number): Promise<CoPlayer[]> {
  const { rows } = await pool.query<CoPlayer>(
    `SELECT rtrim(other.nconst) AS nconst,
            p.primaryname AS name,
            count(DISTINCT other.tconst)::integer AS "titleCount"
     FROM worked_on me
     JOIN worked_on other ON other.tconst = me.tconst
     JOIN person p ON p.nconst = other.nconst
     WHERE me.nconst = $1
       AND me.category IN ('actor', 'actress')
       AND other.category IN ('actor', 'actress')
       AND other.nconst <> me.nconst
     GROUP BY other.nconst, p.primaryname
     ORDER BY "titleCount" DESC, p.primaryname, other.nconst
     LIMIT $2 OFFSET $3`,
    [nconst, limit, offset],
  );
  return rows;
}
