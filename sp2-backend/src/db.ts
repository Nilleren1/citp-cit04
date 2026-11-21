// The PostgreSQL connection pool shared by all data access modules,
// and the checks for the PostgreSQL errors that the services turn into results.
// The connection settings come from the PG* variables in .env.

import { DatabaseError, Pool } from 'pg';

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

/** Whether PostgreSQL refused a duplicate primary key or unique value (SQLSTATE 23505). */
export const isUniqueViolation = (err: unknown): boolean =>
  err instanceof DatabaseError && err.code === '23505';

/** Whether PostgreSQL refused a reference to a row that does not exist (SQLSTATE 23503). */
export const isForeignKeyViolation = (err: unknown): boolean =>
  err instanceof DatabaseError && err.code === '23503';
