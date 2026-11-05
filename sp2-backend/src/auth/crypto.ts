import bcrypt from 'bcryptjs';

// Hash a password before saving it in the database

export async function hashPassword(password: string): Promise<string> 
{
return bcrypt.hash(password, 12);
}

// Compare a login password with the stored hash

export async function verifyPassword
(
password: string,
passwordHash: string
):
Promise<boolean> 
{
return bcrypt.compare(password, passwordHash);
}
