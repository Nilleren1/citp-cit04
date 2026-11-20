import * as usersData from '../data/users.js';
import * as searchHistoryData from '../data/search_history.js';
import type { SearchEntry, TrendingSearch } from '../data/search_history.js'
import type { User, UserCredentials } from '../data/users.js';
import * as recommendationsData from '../data/recommendations.js';
import { pool } from '../db.js';
import * as ratingsData from '../data/ratings.js';
import { pgCode } from '../middleware/errors.js';

export async function create(username: string, passwordHash: string): Promise<number | 'username-taken'> {
    try {
        return await usersData.create(username, passwordHash);
    } catch (err) {
        if (pgCode(err) === '23505') return 'username-taken';
        throw err;
    }
}

export async function find(userId: number): Promise<User | undefined> {
  return usersData.find(userId);
}

export async function findCredentialsByUsername(username: string): Promise<UserCredentials | undefined> {
  return usersData.findCredentialsByUsername(username);
}

export async function findCredentials(userId: number): Promise<UserCredentials | undefined> {
  return usersData.findCredentials(userId);
}

export async function updateUsername(userId: number, username: string): Promise<User | 'username-taken' | undefined> {
    try {
        return await usersData.updateUsername(userId, username);
    } catch (err) {
        if (pgCode(err) === '23505') return 'username-taken';
        throw err;
    }
}

export async function updatePassword(userId: number, passwordHash: string): Promise<boolean> {
  return usersData.updatePassword(userId, passwordHash);
}

export async function remove(userId: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tconsts = await ratingsData.listTconstsByUser(userId, client);

    for (const tconst of tconsts) {
      await ratingsData.remove(userId, tconst, client);
    }

    const removed = await usersData.remove(userId, client);
    await client.query('COMMIT');
    return removed;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listSearchHistory(userId: number, limit: number, offset: number): Promise<SearchEntry[]> {
  return searchHistoryData.list(userId, limit, offset);
}

export async function removeSearchHistory(userId: number, historyId: number): Promise<boolean> {
  return searchHistoryData.remove(userId, historyId);
}

export async function clearSearchHistory(userId: number): Promise<number> {
  return searchHistoryData.clear(userId);
}

export async function trendingSearches(limit: number, offset: number): Promise<TrendingSearch[]> {
  return searchHistoryData.trending(limit, offset);
}

export async function recommendations(userId: number, basis: 'bookmarks' | 'ratings', limit: number, offset: number) {
  return basis === 'bookmarks'
    ? recommendationsData.fromBookmarks(userId, limit, offset)
    : recommendationsData.fromRatings(userId, limit, offset);
}