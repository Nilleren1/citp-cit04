import express from 'express';
import { errorHandler } from './middleware/error.js';
import { titles } from './routes/titles.js';
import { users } from './routes/users.js';

export const app = express();

app.use(express.json());

app.use('/titles', titles);
app.use('/users', users);

app.use(errorHandler);
