import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/auth/crypto.js';

describe('password hashing', () => {
  it('stores a salted bcrypt hash that verifies', async () => {
    const a = await hashPassword('password123');
    const b = await hashPassword('password123');

    expect(a).toMatch(/^\$2[aby]\$12\$/);
    expect(a).not.toBe(b);
    expect(await verifyPassword('password123', a)).toBe(true);
    expect(await verifyPassword('wrong', a)).toBe(false);
  });
});