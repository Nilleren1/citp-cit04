// All the cryptography in the API, in one module:
//   passwords: hashed with bcrypt, only the hash is stored, never the password itself
//   tokens:    JWTs signed with HS256 and JWT_SECRET, valid for 1 hour

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ---- Passwords ----

/**
 * Hashes a password before it is saved in the database.
 * 12 is the bcrypt cost factor: higher is slower to compute, and so slower to brute-force.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/** Whether a login password matches the stored hash. */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// ---- Tokens ----

const JWT_SECRET = process.env.JWT_SECRET ?? '';

if (JWT_SECRET === '') {
  throw new Error('JWT_SECRET environment variable is missing');
}

/** A token saying who the user is (the sub claim). It holds no secrets: anyone with it can read it. */
export function generateToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}

/** The user id in a token this API signed, or undefined if the token is forged, malformed or expired. */
export function verifyToken(token: string): number | undefined {
  try {
    const { sub } = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    const userId = Number(sub);
    return Number.isSafeInteger(userId) && userId > 0 ? userId : undefined;
  } catch {
    return undefined;
  }
}
