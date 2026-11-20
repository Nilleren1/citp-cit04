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

app.use(notFound);
app.use(errorHandler);
