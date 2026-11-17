import { Request, Response, NextFunction } from 'express';

export function requireOwnership( req: Request, res: Response, next: NextFunction) {
    const userId = Number(req.params.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        res.status(400).json({
            error: {
                code: 'validation_failed',
                message: 'Invalid user ID'
            }
        });
        return;
    }

    if (req.user?.id !== userId) {
        res.status(403).json({
            error: {
                code: 'forbidden',
                message: 'You do not have permission to access this resource'
            }
        });
        return;
    }

    next();
}
