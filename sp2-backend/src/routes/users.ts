// /users and /tokens: accounts, logging in, search history, recommendations and trending searches.
// Operations with rules go through services/users.ts; plain reads call data/ directly.

import { Router } from 'express';
import { generateToken } from '../auth/crypto.js';
import * as userService from '../services/users.js';
import * as usersData from '../data/users.js';
import * as searchHistoryData from '../data/search_history.js';
import * as recommendationsData from '../data/recommendations.js';
import { buildPage } from '../helpers/page.js';
import { BASE_URL } from '../config.js';
import { authenticate, requireOwnership } from '../middleware/auth.js';
import { checkParam, oneOf, paging } from '../middleware/validation.js';
import { ApiError, validationError } from '../middleware/errors.js';
import { toUserDto } from '../dto/users.js';
import { toTitleSummaryDto } from '../dto/titles.js';

const router = Router();

const owner = [authenticate, requireOwnership];

router.param('userId', checkParam('userId'));

router.param('historyId', (_req, _res, next, value) => {
    const historyId = Number(value);

    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(historyId)) {
        return next(validationError('historyId', 'Must be a positive integer.'));
    }

    next();
});

// ---- Register ----

router.post('/users', async (req, res) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim()) {
        throw validationError('username', 'Username is required.');
    }

    if (typeof password !== 'string' || password.length < 8) {
        throw validationError('password', 'Password must contain at least 8 characters.');
    }

    const result = await userService.register(username.trim(), password);

    if (result === 'username-taken') {
        throw new ApiError(409, 'conflict', 'Username is already taken.');
    }

    const user = await usersData.find(result);
    if (!user) throw new Error('A user that was just created could not be read.');

    res.status(201)
        .location(`${BASE_URL}/users/${result}`)
        .json(toUserDto(user, BASE_URL));
});

// ---- Login ----

router.post('/tokens', async (req, res) => {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim()) {
        throw validationError('username', 'Username is required.');
    }

    if (typeof password !== 'string' || !password) {
        throw validationError('password', 'Password is required.');
    }

    const userId = await userService.login(username.trim(), password);

    if (userId === undefined) {
        throw new ApiError(401, 'unauthorized', 'Invalid username or password.');
    }
    res.status(201).json({ token: generateToken(userId) });
});

// ---- Logout ----

router.delete('/tokens/current', authenticate, (_req, res) => {
    res.status(204).send();
});

// ---- Get user ----

router.get('/users/:userId', ...owner, async (req, res) => {
    const user = await usersData.find(Number(req.params.userId));

    if (!user) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.json(toUserDto(user, BASE_URL));
});

// ---- Update user----

router.patch('/users/:userId', ...owner, async (req, res) => {
    const { username } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim()) {
        throw validationError('username', 'Username is required.');
    }

    const result = await userService.updateUsername(
        Number(req.params.userId),
        username.trim(),
    );

    if (result === 'username-taken') {
        throw new ApiError(409, 'conflict', 'Username is already taken.');
    }

    if (!result) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.json(toUserDto(result, BASE_URL));
});

// ---- Update password ----

router.put('/users/:userId/password', ...owner, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || !currentPassword) {
        throw validationError('currentPassword', 'Current password is required.');
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        throw validationError('newPassword', 'New password must contain at least 8 characters.');
    }

    const result = await userService.changePassword(Number(req.params.userId), currentPassword, newPassword);

    if (result === 'not-found') {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    if (result === 'wrong-password') {
        throw new ApiError(401, 'unauthorized', 'Current password is incorrect.');
    }

    res.status(204).send();
});

// ---- Delete user ----

router.delete('/users/:userId', ...owner, async (req, res) => {
    const removed = await userService.remove(Number(req.params.userId));

    if (!removed) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.status(204).send();
});

// ---- Search history ----

router.get('/users/:userId/search-history', ...owner, paging, async (req, res) => {
    const userId = Number(req.params.userId);
    const { limit, offset } = res.locals.paging;

    const rows = await searchHistoryData.list(
        userId,
        limit + 1,
        offset,
    );

    res.json(
        buildPage(req, rows, limit, offset, (entry) => ({
            url: `${BASE_URL}/users/${userId}/search-history/${entry.historyId}`,
            query: entry.query,
            createdAt: entry.createdAt,
        })),
    );
});

router.delete('/users/:userId/search-history', ...owner, async (req, res) => {
    await searchHistoryData.clear(Number(req.params.userId));
    res.status(204).send();
});

router.delete('/users/:userId/search-history/:historyId', ...owner, async (req, res) => {
    const removed = await searchHistoryData.remove(
        Number(req.params.userId),
        Number(req.params.historyId),
    );

    if (!removed) {
        throw new ApiError(404, 'not_found', 'No such search history entry.');
    }

    res.status(204).send();
});

// ---- Recommendations ----

router.get('/users/:userId/recommendations', ...owner, oneOf('basis', ['bookmarks', 'ratings']), paging, async (req, res) => {
    const basis = req.query.basis;

    if (basis !== 'bookmarks' && basis !== 'ratings') {
        throw validationError('basis', "Must be 'bookmarks' or 'ratings'.");
    }

    const userId = Number(req.params.userId);
    const { limit, offset } = res.locals.paging;

    const rows = basis === 'bookmarks'
        ? await recommendationsData.fromBookmarks(userId, limit + 1, offset)
        : await recommendationsData.fromRatings(userId, limit + 1, offset);

    res.json(buildPage(req, rows, limit, offset, (t) => toTitleSummaryDto(t, BASE_URL)));
},
);

// ---- Trending searches ----

router.get('/trending-searches', paging, async (req, res) => {
    const { limit, offset } = res.locals.paging;

    const rows = await searchHistoryData.trending(limit + 1, offset);

    res.json(
        buildPage(req, rows, limit, offset, (entry) => ({
            query: entry.query,
            count: entry.count,
        })),
    );
});

// ---- Keywords ----

router.get('/keywords', paging, async (req, res) => {
  const q = req.query.q;

  if (typeof q !== 'string' || !q.trim()) {
    throw validationError('q', 'Query is required.');
  }

  const words = q.trim().split(/\s+/);
  const { limit, offset } = res.locals.paging;

  const rows = await userService.searchKeywords(words, limit + 1, offset);

  res.json(buildPage(req, rows, limit, offset, (k) => k));
});

export default router;