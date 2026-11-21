import { pool } from '../db.js';

export interface Keyword {
  word: string;
  frequency: number;
}

export async function search(words: string[], limit: number, offset: number): Promise<Keyword[]> {
  const { rows } = await pool.query(
    `SELECT word, frequency::int AS frequency
     FROM word_to_words($1::text[], $2::integer, NULL::integer)
     ORDER BY frequency DESC, word
     OFFSET $3`,
    [words, limit + offset, offset],
  );
  return rows;
}