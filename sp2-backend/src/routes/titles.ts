import { Router } from 'express';

import { findTitle, searchTitles, getTitleCast, getSimilarTitles, getTitleRatings, getTitleGenres } from '../data/titles.js';

export const titles = Router();


titles.get('/', async (req, res) => 
{
const q = typeof req.query.q === 'string' ? req.query.q : '';

const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
const offset = Math.max(Number(req.query.offset) || 0, 0);

if (q.trim() === '') 
{
return res.status(400).json({ error: 'Search query is required' });
}
const results = await searchTitles(q, limit, offset);

res.json(
{
url: `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
items: results.map(title =>
({

url: `${req.protocol}://${req.get('host')}/titles/${title.tconst}`,
title: title.primarytitle,
type: title.titletype,
startYear: title.startyear,
poster: title.poster,
averageRating: title.averagerating === null
? null
: Number(title.averagerating)
        
})),

limit,
offset,
next: results.length === limit
? `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset + limit}`
: null,
prev: offset > 0
? `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
: null
});
});

titles.get('/:tconst', async (req, res) => 
{
const title = await findTitle(String(req.params.tconst));

if (title === undefined) 
{
return res.status(404).json({ error: 'Title not found' });
}

const genres = await getTitleGenres(String(req.params.tconst));
const cast = await getTitleCast(String(req.params.tconst));

res.json(
{
url: `${req.protocol}://${req.get('host')}/titles/${title.tconst}`,
title: title.primaryTitle,
type: title.titleType,
originalTitle: title.originalTitle,
isAdult: title.isAdult,
startYear: title.startYear,
endYear: title.endYear,
runtimeMinutes: title.runtimeMinutes,
averageRating: title.averageRating,
numVotes: title.numVotes,
plot: title.plot,
poster: title.poster,
genres: genres,
cast: cast.map(person => (
{
url: `${req.protocol}://${req.get('host')}/persons/${person.nconst}`,
name: person.primaryname,
workedOn:

{
category: person.category,
characters: person.characters ?? []
}

}))
});
});

titles.get('/:tconst/cast', async (req, res) => 
{
const tconst = String(req.params.tconst);
const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
const offset = Math.max(Number(req.query.offset) || 0, 0);
const title = await findTitle(tconst);

if (title === undefined) 
{
return res.status(404).json({ error: 'Title not found' });
}

const cast = await getTitleCast(tconst, limit, offset);

res.json(cast.map(person => 
({
...person,
url: `/persons/${person.nconst}`
})));

});

titles.get('/:tconst/similar-titles', async (req, res) =>
{
const tconst = String(req.params.tconst);

const title = await findTitle(tconst);

if (title === undefined)
{
return res.status(404).json({ error: 'Title not found' });
}

const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
const offset = Math.max(Number(req.query.offset) || 0, 0);

const similar = await getSimilarTitles(tconst, limit, offset);

res.json(similar.map(movie =>
({
...movie,
url: `/titles/${movie.tconst}`
})));
});

titles.get('/:tconst/ratings', async (req, res) =>
{
const tconst = String(req.params.tconst);
const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
const offset = Math.max(Number(req.query.offset) || 0, 0);

const title = await findTitle(tconst);

if (title === undefined)
{
return res.status(404).json({ error: 'Title not found' });
}

const ratings = await getTitleRatings(tconst, limit, offset);

res.json(ratings);
});
