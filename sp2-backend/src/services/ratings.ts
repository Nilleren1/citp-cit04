// The rating operations that have rules. rate() (1-D.3) both creates and changes a rating,
// so POST and PUT run it in a transaction and roll back when it did the wrong one:
// POST must not overwrite an existing rating, PUT must not create a new one.
// remove checks the title first, because delete_rating() raises an error for an unknown title.
// Plain reads have no rules, so the routes call data/ratings.ts directly.

import { pool } from '../db.js';
import * as ratings from '../data/ratings.js';
import * as titles from '../data/titles.js';

export async function create(
  userId: number, tconst: string, rating: number, review: string | null,
): Promise<'created' | 'already-exists' | 'no-such-title'> {
  if (!(await titles.exists(tconst))) return 'no-such-title';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const isNew = await ratings.rate(client, userId, tconst, rating, review);

    if (!isNew) {
      await client.query('ROLLBACK');
      return 'already-exists';
    }

    await client.query('COMMIT');
    return 'created';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function update(
  userId: number, tconst: string, rating: number, review: string | null,
): Promise<'updated' | 'not-found'> {
  if (!(await titles.exists(tconst))) return 'not-found';

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const isNew = await ratings.rate(client, userId, tconst, rating, review);

    if (isNew) {
      await client.query('ROLLBACK');
      return 'not-found';
    }

    await client.query('COMMIT');
    return 'updated';
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes a rating. True when there was one to delete.
 * An unknown title is not an error either: there is nothing to delete (DELETE is idempotent).
 */
export async function remove(userId: number, tconst: string): Promise<boolean> {
  if (!(await titles.exists(tconst))) return false;
  return ratings.remove(userId, tconst);
}
