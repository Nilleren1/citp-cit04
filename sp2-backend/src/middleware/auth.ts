// Authentication (who is asking, 401) and authorization (may they do this, 403).

import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errors.js';
import { verifyToken } from '../auth/crypto.js';
import * as usersData from '../data/users.js';

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

  const userId = verifyToken(authorization.substring(7));

  if (userId === undefined) {
    return next(new ApiError(401, 'unauthorized', 'Invalid or expired authentication token.'));
  }

  try {
    if (!(await usersData.find(userId))) {
      return next(new ApiError(401, 'unauthorized', 'User account no longer exists.'));
    }
  } catch (err) {
    return next(err);
  }

  req.user = { id: userId };
  next();
}

/**
 * Like authenticate, but a request without an Authorization header passes as anonymous
 * (req.user stays undefined). A header that is sent must still hold a valid token, or it is a 401.
 * Used on the search routes, which log the search in the user's history when they know who is asking.
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  if (req.headers.authorization === undefined) return next();
  return authenticate(req, res, next);
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
