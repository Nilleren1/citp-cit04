import jwt from 'jsonwebtoken';

const userId = process.argv[2] ?? '6';
console.log(jwt.sign({}, process.env.JWT_SECRET, { subject: userId, algorithm: 'HS256', expiresIn: '1h' }));