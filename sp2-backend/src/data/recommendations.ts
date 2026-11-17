// The data module for recommendations: parameters as $1, columns renamed for
// TypeScript, and nothing about HTTP.
//
// The database functions return only the id, title and score. Joining title
// here gives the same TitleSummary the title list uses, in one query.
// averagerating is numeric, which the driver returns as a string, so it is
// cast to float8.

import { pool } from '../db.js';
import { TitleSummary } from './titles.js';

/**
 * Titles similar to what the user has bookmarked, best first. The function
 * only has a limit, so it is asked for limit + offset rows and the offset is
 * applied outside it. It raises an error for an unknown user, so the service
 * checks that the user exists first.
 */
export async function fromBookmarks(userId: number, limit: number, offset: number): Promise<TitleSummary[]> {
  const { rows } = await pool.query<TitleSummary>(
    `SELECT trim(t.tconst) AS tconst, t.primarytitle AS title, t.titletype AS type,
            t.startyear AS "startYear", t.poster,
            t.averagerating::float8 AS "averageRating"
     FROM recommend_from_bookmarks($1, $2) r
     JOIN title t ON t.tconst = r.tconst
     ORDER BY r.score DESC, r.source_count DESC, r.primarytitle
     LIMIT $3 OFFSET $4`,
    [userId, limit + offset, limit, offset],
  );
  return rows;
}

/** The same, based on the titles the user has rated highly. */
export async function fromRatings(userId: number, limit: number, offset: number): Promise<TitleSummary[]> {
  const { rows } = await pool.query<TitleSummary>(
    `SELECT trim(t.tconst) AS tconst, t.primarytitle AS title, t.titletype AS type,
            t.startyear AS "startYear", t.poster,
            t.averagerating::float8 AS "averageRating"
     FROM recommend_from_ratings($1, $2) r
     JOIN title t ON t.tconst = r.tconst
     ORDER BY r.score DESC, r.source_count DESC, r.primarytitle
     LIMIT $3 OFFSET $4`,
    [userId, limit + offset, limit, offset],
  );
  return rows;
}