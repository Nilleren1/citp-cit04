
import { pool } from '../db.js';
import * as ratings from '../data/ratings.js';

export async function listByUser(userId: number, limit: number, offset: number) {
    return ratings.listByUser(userId, limit, offset);
}

export async function listByTitle(tconst: string, limit: number, offset: number) {
    return ratings.listByTitle(tconst, limit, offset);
}

export async function find(userId: number, tconst: string) {
    return ratings.find(userId, tconst);
}

export async function create(userId: number, tconst: string, rating: number, review: string | null): Promise<'created' | 'already-exists'> {
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

export async function update(userId: number, tconst: string, rating: number, review: string | null): Promise<'updated' | 'not-found'> {
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

export async function remove(userId: number, tconst: string): Promise<boolean> {
    return ratings.remove(userId, tconst);
}
