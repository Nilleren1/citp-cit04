export const BASE_URL = (
  process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
).replace(/\/$/, '');