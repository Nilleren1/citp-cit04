import { pool } from '../db.js';
export interface TitleRow {
  tconst: string;
  primaryTitle: string | null;
  titleType: string | null;
  originalTitle: string | null;
  isAdult: boolean | null;
  startYear: number | null;
  endYear: number | null;
  runtimeMinutes: number | null;
  averageRating: number | null;
  numVotes: number | null;
  plot: string | null;
  poster: string | null;
}
export interface CastRow {
  nconst: string;
  primaryname: string | null;
  category: string;
  job: string | null;
  characters: string | null;
}

export interface SimilarTitleRow {
  tconst: string;
  primarytitle: string;
  score: string;
  shared_genres: number;
  shared_people: number;
}
export interface TitleRatingRow {
  user_id: number;
  rating: number;
  review: string | null;
  created_at: Date;
}

export async function findTitle(tconst: string): Promise<TitleRow | undefined>
{
const result = await pool.query<TitleRow>
(
`SELECT

  rtrim(tconst) AS tconst,
  primarytitle AS "primaryTitle",
  titletype AS "titleType",
  originaltitle AS "originalTitle",
  isadult AS "isAdult",
  startyear AS "startYear",
  endyear AS "endYear",
  runtimeminutes AS "runtimeMinutes",
  averagerating::float8 AS "averageRating",
  numvotes AS "numVotes",
  plot,
  poster
  
FROM title
WHERE tconst = $1`,
[tconst]
);

return result.rows[0];
}

export async function searchTitles(q: string, limit: number, offset: number) 
{
const result = await pool.query
(

`SELECT
tconst,
primarytitle,
titletype,
startyear,
poster,
averagerating

FROM title
WHERE primarytitle ILIKE $1
ORDER BY primarytitle, tconst
LIMIT $2 OFFSET $3`,

[`%${q}%`, limit, offset]

);

return result.rows;

}

export async function getTitleCast(tconst: string, limit = 20, offset = 0): Promise<CastRow[]>
{
const result = await pool.query<CastRow>
(
`SELECT
w.nconst,
p.primaryname,
w.category,
w.job,
w.characters
FROM worked_on w
JOIN person p ON w.nconst = p.nconst
WHERE w.tconst = $1
ORDER BY w.ordering
LIMIT $2
OFFSET $3`,
[tconst, limit, offset]
);
  
return result.rows;
}

export async function getSimilarTitles(tconst: string, limit = 20, offset = 0): Promise<SimilarTitleRow[]>
{
const result = await pool.query<SimilarTitleRow>
(
"SELECT * FROM get_similar_titles($1, $2) LIMIT $3 OFFSET $4",
[tconst, limit + offset, limit, offset]
);
  
return result.rows;
}

export async function getTitleRatings(tconst: string, limit = 20, offset = 0): Promise<TitleRatingRow[]>
{
const result = await pool.query<TitleRatingRow>
(
`SELECT user_id, rating, review, created_at
FROM rating
WHERE tconst = $1
ORDER BY created_at DESC
LIMIT $2
OFFSET $3`,
[tconst, limit, offset]
);

return result.rows;
}

export async function getTitleGenres(tconst: string)
{
const result = await pool.query(
    
`SELECT genre_name
FROM title_genre
WHERE tconst = $1
ORDER BY genre_name`,
    
[tconst]
);

return result.rows.map(row => row.genre_name);
}
