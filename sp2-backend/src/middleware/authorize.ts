import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errors.js';

export function requireOwnership(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.id !== Number(req.params.userId)) {
    return next(new ApiError(403, 'forbidden', 'You do not have permission to access this resource.'));
  }
  next();
}