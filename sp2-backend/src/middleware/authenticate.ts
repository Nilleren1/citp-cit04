import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errors.js';
import * as userService from '../services/users.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
}


export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction,
) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return next(
            new ApiError(401, 'unauthorized', 'Authentication is required.'),
        );
    }

    const token = authorization.substring(7);
    let userId: number;

    try {
        const decoded = jwt.verify(token, JWT_SECRET!, {
            algorithms: ['HS256'],
        });

        if (
            typeof decoded !== 'object' ||
            decoded === null ||
            typeof decoded.sub !== 'string' ||
            !/^[1-9]\d*$/.test(decoded.sub)
        ) {
            return next(
                new ApiError(401, 'unauthorized', 'Invalid authentication token.'),
            );
        }

        userId = Number(decoded.sub);

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return next(
                new ApiError(401, 'unauthorized', 'Invalid authentication token.'),
            );
        }
    } catch {
        return next(
            new ApiError(401, 'unauthorized', 'Invalid or expired authentication token.'),
        );
    }

    try {
        const user = await userService.find(userId);

        if (!user) {
            return next(
                new ApiError(401, 'unauthorized', 'User account no longer exists.'),
            );
        }

        req.user = { id: userId };
        next();
    } catch (error) {
        next(error);
    }
}
