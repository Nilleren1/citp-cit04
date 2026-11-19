import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userService from '../services/users.js';
import { buildPage } from './page.js';
import { BASE_URL } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireOwnership } from '../middleware/authorize.js';
import { checkParam, paging } from '../middleware/validate.js';
import { ApiError, validationError } from '../middleware/errors.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
}

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

    const passwordHash = await bcrypt.hash(password, 12);

    let userId: number;

    try {
        userId = await userService.create(username.trim(), passwordHash);
    } catch (err: any) {
        if (err.code === '23505') {
            throw new ApiError(409, 'conflict', 'Username is already taken.');
        }

        throw err;
    }

    const user = await userService.find(userId);

    res.status(201)
        .location(`${BASE_URL}/users/${userId}`)
        .json(user);
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

    const credentials = await userService.findCredentialsByUsername(username.trim());

    if (!credentials || !(await bcrypt.compare(password, credentials.passwordHash))) {
        throw new ApiError(401, 'unauthorized', 'Invalid username or password.');
    }

    const token = jwt.sign(
        { sub: String(credentials.userId) },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' },
    );

    res.status(201).json({ token });
});

// All routes below require authentication and ownership.
router.use('/users/:userId', authenticate, requireOwnership);

// ---- Get user ----

router.get('/users/:userId', async (req, res) => {
    const user = await userService.find(Number(req.params.userId));

    if (!user) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.json(user);
});

// ---- Update username ----

router.put('/users/:userId/username', async (req, res) => {
    const { username } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim()) {
        throw validationError('username', 'Username is required.');
    }

    let user;

    try {
        user = await userService.updateUsername(
            Number(req.params.userId),
            username.trim(),
        );
    } catch (err: any) {
        if (err.code === '23505') {
            throw new ApiError(409, 'conflict', 'Username is already taken.');
        }

        throw err;
    }

    if (!user) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.json(user);
});

// ---- Update password ----

router.put('/users/:userId/password', async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || !currentPassword) {
        throw validationError('currentPassword', 'Current password is required.');
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        throw validationError('newPassword', 'New password must contain at least 8 characters.');
    }

    const userId = Number(req.params.userId);
    const credentials = await userService.findCredentials(userId);

    if (!credentials) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    const passwordMatches = await bcrypt.compare(
        currentPassword,
        credentials.passwordHash,
    );

    if (!passwordMatches) {
        throw new ApiError(401, 'unauthorized', 'Current password is incorrect.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userService.updatePassword(userId, passwordHash);

    res.status(204).send();
});

// ---- Delete user ----

router.delete('/users/:userId', async (req, res) => {
    const removed = await userService.remove(Number(req.params.userId));

    if (!removed) {
        throw new ApiError(404, 'not_found', 'No such user.');
    }

    res.status(204).send();
});

// ---- Search history ----

router.get('/users/:userId/search-history', paging, async (req, res) => {
    const userId = Number(req.params.userId);
    const { limit, offset } = res.locals.paging;

    const rows = await userService.listSearchHistory(
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

router.delete('/users/:userId/search-history', async (req, res) => {
    await userService.clearSearchHistory(Number(req.params.userId));
    res.status(204).send();
});

router.delete('/users/:userId/search-history/:historyId', async (req, res) => {
    const removed = await userService.removeSearchHistory(
        Number(req.params.userId),
        Number(req.params.historyId),
    );

    if (!removed) {
        throw new ApiError(404, 'not_found', 'No such search history entry.');
    }

    res.status(204).send();
});

// ---- Trending searches ----

router.get('/trending-searches', paging, async (req, res) => {
    const { limit, offset } = res.locals.paging;

    const rows = await userService.trendingSearches(limit + 1, offset);

    res.json(
        buildPage(req, rows, limit, offset, (entry) => ({
            query: entry.query,
            count: entry.count,
        })),
    );
});

export default router;