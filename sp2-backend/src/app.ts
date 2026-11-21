import { corsMiddleware } from './middleware/cors.js';
import express from 'express';
import { errorHandler, notFound } from './middleware/errors.js';
import { titles } from './routes/titles.js';
//import { users } from './routes/users.js';
import ratings from './routes/ratings.js';
import bookmarks from './routes/bookmarks.js';
import users from './routes/users.js';

export const app = express();

app.use(corsMiddleware);
app.use(express.json());

app.use('/titles', titles);
//app.use('/users', users);

app.use(ratings);
app.use(bookmarks);
app.use(users);

app.use(notFound);
app.use(errorHandler);   
