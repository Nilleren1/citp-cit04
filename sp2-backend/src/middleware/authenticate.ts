import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
}

interface JwtPayload {
    sub: string;
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({
            error: {
                code: 'unauthorized',
                message: 'Authentication required'
            }
        });
        return;
    }

    const token = authorization.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET!, {
            algorithms: ['HS256']
        }) as JwtPayload;

        const userId = Number(decoded.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            res.status(401).json({
                error: {
                    code: 'unauthorized',
                    message: 'Invalid authentication token'
                }
            });
            return;
        }

        req.user = { id: userId };

        next();
    } catch {
        res.status(401).json({
            error: {
                code: 'unauthorized',
                message: 'Invalid or expired authentication token'
            }
        });
    }
}
