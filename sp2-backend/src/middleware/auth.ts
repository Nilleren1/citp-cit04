// Authentication (who is asking, 401) and authorization (may they do this, 403).

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errors.js';
import * as userService from '../services/users.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing');
}

interface JwtPayload {
  sub: string;
}

// ---- Authentication ----

/**
 * Requires a valid "Authorization: Bearer <token>" header and sets req.user.
 * The user must still exist: a token issued before the account was deleted is rejected.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'unauthorized', 'Authentication is required.'));
  }

  const token = authorization.substring(7);
  let userId: number;

  try {
    const decoded = jwt.verify(token, JWT_SECRET!, { algorithms: ['HS256'] }) as JwtPayload;
    userId = Number(decoded.sub);
  } catch {
    return next(new ApiError(401, 'unauthorized', 'Invalid or expired authentication token.'));
  }

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return next(new ApiError(401, 'unauthorized', 'Invalid authentication token.'));
  }

  try {
    if (!(await userService.find(userId))) {
      return next(new ApiError(401, 'unauthorized', 'User account no longer exists.'));
    }
  } catch (err) {
    return next(err);
  }

  req.user = { id: userId };
  next();
}

// ---- Authorization ----

/**
 * Requires the logged-in user to be the user in the path (:userId). Use after authenticate.
 * Only the token and the path are compared, no data is needed, so this can be middleware.
 */
export function requireOwnership(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.id !== Number(req.params.userId)) {
    return next(new ApiError(403, 'forbidden', 'You do not have permission to access this resource.'));
  }
  next();
}
