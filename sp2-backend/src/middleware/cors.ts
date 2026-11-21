import cors from 'cors';
import { ApiError } from './errors.js';

const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    ...(process.env.FRONTEND_ORIGIN
        ? [process.env.FRONTEND_ORIGIN]
        : []),
]);

export const corsMiddleware = cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(
            new ApiError(
                403,
                'cors_forbidden',
                'This origin is not allowed.',
            ),
        );
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
});
