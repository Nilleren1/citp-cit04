import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('API error:', err);

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({
    error: 'Internal server error'
  });
};
