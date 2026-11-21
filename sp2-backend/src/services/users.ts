// The user operations that have rules:
//   register, login, change password: only password hashes are stored and compared
//   register, rename: usernames are unique
//   delete: the user's ratings go first, so the titles' averages are updated, all in one transaction
// Plain reads (a user, search history, recommendations, trending) have no rules,
// so the routes call data/ directly.

import * as usersData from '../data/users.js';
import type { User } from '../data/users.js';
import * as ratingsData from '../data/ratings.js';
import { hashPassword, verifyPassword } from '../auth/crypto.js';
import { pool, isUniqueViolation } from '../db.js';

/** Creates a user with a hashed password. Returns the new user id. */
export async function register(username: string, password: string): Promise<number | 'username-taken'> {
  const passwordHash = await hashPassword(password);
  try {
    return await usersData.create(username, passwordHash);
  } catch (err) {
    if (isUniqueViolation(err)) return 'username-taken';
    throw err;
  }
}

/**
 * The id of the user with this username and password, or undefined.
 * A wrong username and a wrong password give the same answer, so the caller cannot tell which usernames exist.
 */
export async function login(username: string, password: string): Promise<number | undefined> {
  const credentials = await usersData.findCredentialsByUsername(username);
  if (!credentials || !(await verifyPassword(password, credentials.passwordHash))) return undefined;
  return credentials.userId;
}

/** Changes the password, if the current password is right. */
export async function changePassword(
  userId: number, currentPassword: string, newPassword: string,
): Promise<'changed' | 'wrong-password' | 'not-found'> {
  const credentials = await usersData.findCredentials(userId);
  if (!credentials) return 'not-found';
  if (!(await verifyPassword(currentPassword, credentials.passwordHash))) return 'wrong-password';

  await usersData.updatePassword(userId, await hashPassword(newPassword));
  return 'changed';
}

export async function updateUsername(userId: number, username: string): Promise<User | 'username-taken' | undefined> {
  try {
    return await usersData.updateUsername(userId, username);
  } catch (err) {
    if (isUniqueViolation(err)) return 'username-taken';
    throw err;
  }
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
