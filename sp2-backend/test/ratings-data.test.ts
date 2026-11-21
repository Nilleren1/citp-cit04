import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import type { PoolClient } from 'pg';
import { pool } from '../src/db.js';
import * as ratings from '../src/data/ratings.js';

const USER_ID = 6;
const TCONST = 'tt0112130';

let client: PoolClient;

async function stored() {
  const { rows } = await client.query(
    `SELECT rating, review FROM rating WHERE user_id = $1 AND tconst = $2`,
    [USER_ID, TCONST],
  );
  return rows[0];
}

beforeEach(async () => {
  client = await pool.connect();
  await client.query('BEGIN');
  // Start every test from a known state: no rating by this user on this title
  await ratings.remove(USER_ID, TCONST, client);
});

afterEach(async () => {
  await client.query('ROLLBACK');
  client.release();
});

afterAll(async () => {
  await pool.end();
});

describe('ratings.rate', () => {
  it('creates a new rating and reports it as new', async () => {
    const isNew = await ratings.rate(client, USER_ID, TCONST, 8, 'Good');

    expect(isNew).toBe(true);
    expect(await stored()).toMatchObject({ rating: 8, review: 'Good' });
  });

  it('updates an existing rating and reports it as not new', async () => {
    await ratings.rate(client, USER_ID, TCONST, 8, 'Good');
    const isNew = await ratings.rate(client, USER_ID, TCONST, 5, 'Meh');

    expect(isNew).toBe(false);
    expect(await stored()).toMatchObject({ rating: 5, review: 'Meh' });
  });

  it('keeps the old review when the new review is null', async () => {
    await ratings.rate(client, USER_ID, TCONST, 8, 'Good');
    await ratings.rate(client, USER_ID, TCONST, 9, null);

    expect(await stored()).toMatchObject({ rating: 9, review: 'Good' });
  });
});