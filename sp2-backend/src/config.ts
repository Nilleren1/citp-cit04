// Settings read from the environment (.env, loaded by npm start).

import type { CorsOptions } from 'cors';

/**
 * The public address of the API, used to build the absolute urls in responses.
 * Defaults to localhost on PORT. A trailing slash is removed.
 */
export const BASE_URL = (
  process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
).replace(/\/$/, '');

/**
 * CORS: which browser origins may call the API, and with which methods and headers.
 * CORS_ORIGIN can hold one origin or a comma-separated list; without it the Vite dev server is allowed.
 * Other origins get no CORS headers, so the browser blocks the response.
 * Requests without an Origin header (curl, Postman) are not affected.
 */
export const corsOptions: CorsOptions = {
  origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Lets the frontend read the Location header of 201 Created responses.
  exposedHeaders: ['Location'],
  // Browsers may cache a preflight response for 10 minutes.
  maxAge: 600,
};
