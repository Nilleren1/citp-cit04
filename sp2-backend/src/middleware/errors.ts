import type { ErrorRequestHandler, RequestHandler } from 'express';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
  }
}

export const validationError = (field: string, message: string) =>
  new ApiError(400, 'validation_failed', 'The request is not valid.', [{ field, message }]);

const body = (status: number, error: string, message: string, details: ErrorDetail[] = []) => ({
  status,
  error,
  message,
  details,
});

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(body(404, 'not_found', 'No such resource.'));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json(body(err.status, err.code, err.message, err.details));
    return;
  }

  if (err?.type === 'entity.parse.failed') {
    res.status(400).json(body(400, 'validation_failed', 'The request body is not valid JSON.'));
    return;
  }

  console.error('API error:', err);
  res.status(500).json(body(500, 'internal_error', 'Something went wrong.'));
};