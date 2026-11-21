import { Router } from 'express';
import { checkParam, paging } from '../middleware/validate.js';
import { buildPage } from './page.js';
import { findTitle, searchTitles, getTitleCast, getSimilarTitles, getTitleGenres } from '../data/titles.js';
import { ApiError } from '../middleware/errors.js';

export const titles = Router();
titles.param('tconst', checkParam('tconst'));

titles.get('/', paging, async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';

    const { limit, offset } = res.locals.paging;

    if (q.trim() === '') {
        throw new ApiError(
            400,
            'validation_failed',
            'The request is not valid.',
            [{ field: 'q', message: 'Search query is required.' }]
        );
    }
    const results = await searchTitles(q, limit + 1, offset);

    res.json(
        {
            url: `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`,
            items: results.slice(0, limit).map(title =>
            ({

                url: `${req.protocol}://${req.get('host')}/titles/${title.tconst.trim()}`,
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
            next: results.length > limit
                ? `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset + limit}`
                : null,
            prev: offset > 0
                ? `${req.protocol}://${req.get('host')}/titles?q=${encodeURIComponent(q)}&limit=${limit}&offset=${Math.max(0, offset - limit)}`
                : null
        });
});

titles.get('/:tconst', async (req, res) => {
    const title = await findTitle(String(req.params.tconst));

    if (title === undefined) {
        throw new ApiError(404, 'not_found', 'Title not found.');
    }

    const genres = await getTitleGenres(String(req.params.tconst));
    const cast = await getTitleCast(String(req.params.tconst));

    res.json(
        {
            url: `${req.protocol}://${req.get('host')}/titles/${title.tconst.trim()}`,
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

titles.get('/:tconst/cast', paging, async (req, res) => {
    const tconst = String(req.params.tconst);
    const { limit, offset } = res.locals.paging;
    const title = await findTitle(tconst);

    if (title === undefined) {
        throw new ApiError(404, 'not_found', 'Title not found.');
    }

    const cast = await getTitleCast(tconst, limit, offset);

    res.json(
        buildPage(req, cast, limit, offset, person => ({
            url: `${req.protocol}://${req.get('host')}/persons/${person.nconst}`,
            name: person.primaryname,
            workedOn: {
                category: person.category,
                characters: person.characters ?? []
            }
        }))
    );

});

titles.get('/:tconst/similar-titles', paging, async (req, res) => {
    const tconst = String(req.params.tconst);

    const title = await findTitle(tconst);

    if (title === undefined) {
        throw new ApiError(404, 'not_found', 'Title not found.');
    }

    const { limit, offset } = res.locals.paging;


    const similar = await getSimilarTitles(tconst, limit, offset);

    res.json(
        buildPage(req, similar, limit, offset, movie => ({
            url: `${req.protocol}://${req.get('host')}/titles/${movie.tconst.trim()}`,
            title: movie.primarytitle,
            score: Number(movie.score),
            sharedGenres: movie.shared_genres,
            sharedPeople: movie.shared_people
        }))
    );
});
