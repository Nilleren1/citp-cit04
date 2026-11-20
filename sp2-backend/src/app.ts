// The Express app: JSON body parsing, the routers, then the 404 and error handlers.
// Kept apart from index.ts so the app can be used without starting a server.

import express from 'express';
import { errorHandler, notFound } from './middleware/errors.js';
import { titles } from './routes/titles.js';
import { persons } from './routes/persons.js';
import { users } from './routes/users.js';

export const app = express();

app.use(express.json());

app.use('/titles', titles);
app.use('/persons', persons);
app.use('/users', users);

// These must come last: notFound catches requests no router matched,
// and errorHandler catches everything passed to next(err) or thrown in a handler.
app.use(notFound);
app.use(errorHandler);
