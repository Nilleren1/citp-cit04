import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db.js';
import { generateToken } from '../src/auth/crypto.js';

const BASE = process.env.BASE_URL!;
const USER_ID = 6;
const OTHER_USER_ID = 7;
const TCONST = 'tt0112130';

const auth = { Authorization: `Bearer ${generateToken(USER_ID)}` };
const ratingPath = `/users/${USER_ID}/ratings/${TCONST}`;

// These requests commit for real, so start and finish from a clean state
beforeAll(() => request(app).delete(ratingPath).set(auth));
afterAll(async () => {
  await request(app).delete(ratingPath).set(auth);
  await pool.end();
});

describe('reading IMDB data', () => {
  it('GET /titles/:tconst returns the title', async () => {
    const res = await request(app).get('/titles/tt0112130');

    expect(res.status).toBe(200);
    expect(res.body.url).toBe(`${BASE}/titles/tt0112130`);
  });

  it('GET unknown title returns the 404 error representation', async () => {
    const res = await request(app).get('/titles/tt9999999');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ status: 404, error: 'not_found' });
  });
});

describe('writing framework data', () => {
  it('POST creates a rating, which can then be read and deleted', async () => {
    const created = await request(app)
      .post(`/users/${USER_ID}/ratings`)
      .set(auth)
      .send({ title: `${BASE}/titles/${TCONST}`, rating: 7, review: 'Test' });

    expect(created.status).toBe(201);
    expect(created.headers.location).toBe(`${BASE}${ratingPath}`);

    const read = await request(app).get(ratingPath);
    expect(read.status).toBe(200);
    expect(read.body.rating).toBe(7);

    const removed = await request(app).delete(ratingPath).set(auth);
    expect(removed.status).toBe(204);
  });

  it('POST with an invalid body returns 400 with details', async () => {
    const res = await request(app)
      .post(`/users/${USER_ID}/ratings`)
      .set(auth)
      .send({ title: 'nope', rating: 11 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation_failed');
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});

describe('paged listing', () => {
  it('returns a page and a next link that leads to different items', async () => {
    const first = await request(app).get('/titles?limit=2');

    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(2);
    expect(first.body.limit).toBe(2);
    expect(first.body.next).not.toBeNull();

    const next = new URL(first.body.next);
    const second = await request(app).get(next.pathname + next.search);

    expect(second.status).toBe(200);
    expect(second.body.items[0].url).not.toBe(first.body.items[0].url);
  });
});

describe('unauthorised requests', () => {
  it('rejects a write without a token with 401', async () => {
    const res = await request(app)
      .post(`/users/${USER_ID}/ratings`)
      .send({ title: `${BASE}/titles/${TCONST}`, rating: 7 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('unauthorized');
  });

  it("rejects another user's token with 403", async () => {
    const res = await request(app)
      .post(`/users/${USER_ID}/ratings`)
      .set({ Authorization: `Bearer ${generateToken(OTHER_USER_ID)}` })
      .send({ title: `${BASE}/titles/${TCONST}`, rating: 7 });

    expect(res.status).toBe(403);
  });
});

it('IMDB data is read-only', async () => {
  const res = await request(app).post('/titles').send({});
  expect([404, 405]).toContain(res.status);
});

it('applies the default and maximum page size', async () => {
  expect((await request(app).get('/titles')).body.limit).toBe(20);
  expect((await request(app).get('/titles?limit=500')).body.limit).toBe(100);
});

it('errors do not leak internals', async () => {
  const res = await request(app).get('/titles/tt9999999');
  expect(JSON.stringify(res.body)).not.toMatch(/select |from |\.ts:|stack/i);
});