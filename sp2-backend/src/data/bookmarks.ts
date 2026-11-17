import { pool } from '../db.js';

export type BookmarkList = 'watched' | 'watchlist';

export interface TitleBookmark {
  userId: number;
  tconst: string;
  title: string;
  list: BookmarkList;
  createdAt: Date;
}

export interface PersonBookmark {
  userId: number;
  nconst: string;
  name: string;
  createdAt: Date;
}

// ---- Title bookmarks ----

/** One page of a user's title bookmarks, newest first. */
export async function listTitleBookmarks(
  userId: number, list: BookmarkList | undefined, limit: number, offset: number,
): Promise<TitleBookmark[]> {
  const { rows } = await pool.query<TitleBookmark>(
    `SELECT $1::integer AS "userId", tconst, primarytitle AS title,
            status AS list, bookmarked_at AS "createdAt"
     FROM get_title_bookmarks($1, $2)
     ORDER BY "createdAt" DESC, title
     LIMIT $3 OFFSET $4`,
    [userId, list ?? null, limit, offset],
  );
  return rows;
}

/** One title bookmark. */
export async function findTitleBookmark(userId: number, tconst: string): Promise<TitleBookmark | undefined> {
  const { rows } = await pool.query<TitleBookmark>(
    `SELECT b.user_id AS "userId", trim(b.tconst) AS tconst, t.primarytitle AS title,
            b.status AS list, b.created_at AS "createdAt"
     FROM bookmark_title b
     JOIN title t ON t.tconst = b.tconst
     WHERE b.user_id = $1 AND b.tconst = $2`,
    [userId, tconst],
  );
  return rows[0];
}

/** Adds a title bookmark through add_title_bookmark(). */
export async function addTitleBookmark(userId: number, tconst: string, list: BookmarkList): Promise<void> {
  await pool.query(`SELECT add_title_bookmark($1, $2, $3)`, [userId, tconst, list]);
}

/** Moves a bookmark to another list through update_title_bookmark_status().*/
export async function updateTitleBookmark(userId: number, tconst: string, list: BookmarkList): Promise<boolean> {
  const { rows } = await pool.query<{ updated: boolean }>(
    `SELECT update_title_bookmark_status($1, $2, $3) AS updated`,
    [userId, tconst, list],
  );
  return rows[0].updated;
}

/** Removes a title bookmark through remove_title_bookmark(). */
export async function removeTitleBookmark(userId: number, tconst: string): Promise<boolean> {
  const { rows } = await pool.query<{ removed: boolean }>(
    `SELECT remove_title_bookmark($1, $2) AS removed`,
    [userId, tconst],
  );
  return rows[0].removed;
}

// ---- Person bookmarks ----

/** One page of a user's person bookmarks, newest first. */
export async function listPersonBookmarks(userId: number, limit: number, offset: number): Promise<PersonBookmark[]> {
  const { rows } = await pool.query<PersonBookmark>(
    `SELECT $1::integer AS "userId", nconst, primaryname AS name, bookmarked_at AS "createdAt"
     FROM get_person_bookmarks($1)
     ORDER BY "createdAt" DESC, name
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return rows;
}

/** One person bookmark */
export async function findPersonBookmark(userId: number, nconst: string): Promise<PersonBookmark | undefined> {
  const { rows } = await pool.query<PersonBookmark>(
    `SELECT b.user_id AS "userId", trim(b.nconst) AS nconst, p.primaryname AS name,
            b.created_at AS "createdAt"
     FROM bookmark_person b
     JOIN person p ON p.nconst = b.nconst
     WHERE b.user_id = $1 AND b.nconst = $2`,
    [userId, nconst],
  );
  return rows[0];
}

/** Adds a person bookmark through add_person_bookmark(). */
export async function addPersonBookmark(userId: number, nconst: string): Promise<void> {
  await pool.query(`SELECT add_person_bookmark($1, $2)`, [userId, nconst]);
}

/** Removes a person bookmark through remove_person_bookmark(). */
export async function removePersonBookmark(userId: number, nconst: string): Promise<boolean> {
  const { rows } = await pool.query<{ removed: boolean }>(
    `SELECT remove_person_bookmark($1, $2) AS removed`,
    [userId, nconst],
  );
  return rows[0].removed;
}