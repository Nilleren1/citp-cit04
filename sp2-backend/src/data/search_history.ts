import { pool } from '../db.js';

export interface SearchEntry {
  userId: number;
  historyId: number;
  query: string;
  createdAt: Date;
}

export interface TrendingSearch {
  query: string;
  count: number;
}

/** One page of a user's search history, newest first. */
export async function list(userId: number, limit: number, offset: number): Promise<SearchEntry[]> {
  const { rows } = await pool.query<SearchEntry>(
    `SELECT $1::integer AS "userId", history_id AS "historyId", query,
            searched_at AS "createdAt"
     FROM get_search_history($1, $2)
     ORDER BY "createdAt" DESC, "historyId" DESC
     LIMIT $3 OFFSET $4`,
    [userId, limit + offset, limit, offset],
  );
  return rows;
}

/** Clears a user's whole history through clear_search_history(). */
export async function clear(userId: number): Promise<number> {
  const { rows } = await pool.query<{ deleted: number }>(
    `SELECT clear_search_history($1) AS deleted`,
    [userId],
  );
  return rows[0].deleted;
}

/** Deletes one entry. */
export async function remove(userId: number, historyId: number): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM search_history WHERE history_id = $1 AND user_id = $2`,
    [historyId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

/** One page of what all users search for, through get_trending_searches() */
export async function trending(limit: number, offset: number): Promise<TrendingSearch[]> {
  const { rows } = await pool.query<TrendingSearch>(
    `SELECT query, search_count AS count
     FROM get_trending_searches($1)
     ORDER BY distinct_users DESC, search_count DESC, query
     LIMIT $2 OFFSET $3`,
    [limit + offset, limit, offset],
  );
  return rows;
}