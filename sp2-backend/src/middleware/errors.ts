// Error handling: every error response has the same JSON shape,
//   { status, error, message, details }
// where error is a machine-readable code and details lists the invalid fields, if any.

import type { ErrorRequestHandler, RequestHandler } from 'express';

/** One invalid field in a request, and what is wrong with it. */
export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * An error with an HTTP status, meant to be shown to the client.
 * Throw it in a route handler (Express 5 passes errors from async handlers to errorHandler).
 */
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

/** A 400 for one invalid field. */
export const validationError = (field: string, message: string) =>
  new ApiError(400, 'validation_failed', 'The request is not valid.', [{ field, message }]);

const body = (status: number, error: string, message: string, details: ErrorDetail[] = []) => ({
  status,
  error,
  message,
  details,
});

/**
 * A 405 for a path that exists but does not take this method, e.g. POST /titles.
 * Register it with router.all after the path's real handlers. Allowing GET also allows HEAD.
 * OPTIONS is always allowed: it asks which methods a path takes, so it gets the Allow header and a 204.
 */
export const methodNotAllowed =
  (...allowed: string[]): RequestHandler =>
  (req, res) => {
    const methods = [...allowed, ...(allowed.includes('GET') ? ['HEAD'] : []), 'OPTIONS'];
    res.set('Allow', methods.join(', '));
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    res.status(405).json(body(405, 'method_not_allowed', `${req.method} is not allowed here.`));
  };

/** The last route: a 404 for every request no router handled. */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json(body(404, 'not_found', 'No such resource.'));
};

/** Turns any error into a JSON response. Unexpected errors are logged and hidden behind a 500. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // Part of the response is already sent, so let Express close the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json(body(err.status, err.code, err.message, err.details));
    return;
  }

  // Thrown by express.json() when the body cannot be parsed.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json(body(400, 'validation_failed', 'The request body is not valid JSON.'));
    return;
  }

  console.error('API error:', err);
  res.status(500).json(body(500, 'internal_error', 'Something went wrong.'));
};
