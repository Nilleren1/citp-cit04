import { pool } from '../db.js';

/** A user as the API shows them. */
export interface User {
  userId: number;
  username: string;
  createdAt: Date;
}

/** Only for logging in and changing the password. */
export interface UserCredentials {
  userId: number;
  username: string;
  passwordHash: string;
}

/** Creates a user through create_user() and returns the new id. */
export async function create(username: string, passwordHash: string): Promise<number> {
  const { rows } = await pool.query<{ userId: number }>(
    `SELECT create_user($1, $2) AS "userId"`,
    [username, passwordHash],
  );
  return rows[0].userId;
}

/** One user, or undefined when there is no such id. */
export async function find(userId: number): Promise<User | undefined> {
  const { rows } = await pool.query<User>(
    `SELECT user_id AS "userId", username, created_at AS "createdAt"
     FROM app_user
     WHERE user_id = $1`,
    [userId],
  );
  return rows[0];
}

/** For logging in. */
export async function findCredentialsByUsername(username: string): Promise<UserCredentials | undefined> {
  const { rows } = await pool.query<UserCredentials>(
    `SELECT user_id AS "userId", username, password AS "passwordHash"
     FROM get_user($1)`,
    [username],
  );
  return rows[0];
}

/** For checking the current password before changing it. */
export async function findCredentials(userId: number): Promise<UserCredentials | undefined> {
  const { rows } = await pool.query<UserCredentials>(
    `SELECT user_id AS "userId", username, password AS "passwordHash"
     FROM app_user
     WHERE user_id = $1`,
    [userId],
  );
  return rows[0];
}

/** Changes the username. */
export async function updateUsername(userId: number, username: string): Promise<User | undefined> {
  const { rows } = await pool.query<User>(
    `UPDATE app_user SET username = btrim($2)
     WHERE user_id = $1
     RETURNING user_id AS "userId", username, created_at AS "createdAt"`,
    [userId, username],
  );
  return rows[0];
}

/** Stores a new password hash through update_password(). */
export async function updatePassword(userId: number, passwordHash: string): Promise<boolean> {
  const { rows } = await pool.query<{ updated: boolean }>(
    `SELECT update_password($1, $2) AS updated`,
    [userId, passwordHash],
  );
  return rows[0].updated;
}

/** Deletes a user through delete_user(). */
export async function remove(userId: number): Promise<boolean> {
  const { rows } = await pool.query<{ removed: boolean }>(
    `SELECT delete_user($1) AS removed`,
    [userId],
  );
  return rows[0].removed;
}