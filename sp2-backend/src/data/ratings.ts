import { PoolClient } from 'pg';
import { pool } from '../db.js';

export interface Rating {
  userId: number;
  username: string;
  tconst: string;
  title: string;
  rating: number;
  review: string | null;
  createdAt: Date;
}

const SELECT_RATING = `
  SELECT r.user_id AS "userId", u.username, trim(r.tconst) AS tconst,
         t.primarytitle AS title, r.rating, r.review, r.created_at AS "createdAt"
  FROM rating r
  JOIN app_user u ON u.user_id = r.user_id
  JOIN title t    ON t.tconst  = r.tconst`;

/** One user's ratings, newest first. */
export async function listByUser(userId: number, limit: number, offset: number): Promise<Rating[]> {
  const { rows } = await pool.query<Rating>(
    `${SELECT_RATING}
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC, r.tconst
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return rows;
}

/** The ratings (reviews) of one title, newest first. */
export async function listByTitle(tconst: string, limit: number, offset: number): Promise<Rating[]> {
  const { rows } = await pool.query<Rating>(
    `${SELECT_RATING}
     WHERE r.tconst = $1
     ORDER BY r.created_at DESC, r.user_id
     LIMIT $2 OFFSET $3`,
    [tconst, limit, offset],
  );
  return rows;
}

/** One user's rating of one title, or undefined when there is none. */
export async function find(userId: number, tconst: string): Promise<Rating | undefined> {
  const { rows } = await pool.query<Rating>(
    `${SELECT_RATING}
     WHERE r.user_id = $1 AND r.tconst = $2`,
    [userId, tconst],
  );
  return rows[0];
}

/**
 * Creates or changes a rating through rate() (1-D.3). rate() also updates the
 * title's average, the name ratings and the rating history. It returns true
 * when the rating is new and false when it replaced an earlier one.
 *
 * It runs on the client it is given, not on the pool, because it is one step
 * of a transaction: the service rolls it back when POST finds an existing
 * rating, or when PUT finds none. A null review keeps the old review.
 */
export async function rate(
  client: PoolClient, userId: number, tconst: string, rating: number, review: string | null,
): Promise<boolean> {
  const { rows } = await client.query<{ isNew: boolean }>(
    `SELECT is_new_rating AS "isNew" FROM rate($1, $2, $3, $4)`,
    [userId, tconst, rating, review],
  );
  return rows[0].isNew;
}

/** Deletes a rating through delete_rating(). True when there was one to delete. */
export async function remove(userId: number, tconst: string, db: Pick<PoolClient, 'query'> = pool) {
  const { rows } = await db.query<{ removed: boolean }>(
    `SELECT delete_rating($1, $2) AS removed`,
    [userId, tconst],
  );
  return rows[0].removed;
}

export async function listTconstsByUser(userId: number, db: Pick<PoolClient, 'query'> = pool): Promise<string[]> {
  const { rows } = await db.query(
    `SELECT trim(tconst) AS tconst FROM rating WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.tconst);
}