// Settings read from the environment (.env, loaded by npm start).

/**
 * The public address of the API, used to build the absolute urls in responses.
 * Defaults to localhost on PORT. A trailing slash is removed.
 */
export const BASE_URL = (
  process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
).replace(/\/$/, '');