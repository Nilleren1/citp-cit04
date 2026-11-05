import { pool } from '../db.js';

export async function findTitle(tconst: string) 
{
const result = await pool.query
(
`SELECT
tconst,
primarytitle,
titletype,
originaltitle,
isadult,
startyear,
endyear,
runtimeminutes,
averagerating,
numvotes,
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

export async function getTitleCast(tconst: string) 
{
const result = await pool.query
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
ORDER BY w.ordering`,
[tconst]
);
  
return result.rows;
}

export async function getSimilarTitles(tconst: string, limit = 20) 
{
const result = await pool.query
(
"SELECT * FROM get_similar_titles($1, $2)",
[tconst, limit]
);
  
return result.rows;
}

export async function getTitleRatings(tconst: string)
{
const result = await pool.query
(
`SELECT user_id, rating, review, created_at
FROM rating
WHERE tconst = $1
ORDER BY created_at DESC`,
[tconst]
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
