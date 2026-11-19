import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Hash a password before saving it in the database

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

// Compare a login password with the stored hash

export async function verifyPassword
    (
        password: string,
        passwordHash: string
    ):
    Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
}

export function generateToken(userId: number): string {
    return jwt.sign(
        { sub: String(userId) },
        JWT_SECRET!,
        {
            expiresIn: '1h',
            algorithm: 'HS256'
        }
    );
}
