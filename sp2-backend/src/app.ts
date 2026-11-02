import express from 'express';
import { errorHandler } from './middleware/error.js';

export const app = express();

app.use(express.json());
app.use(errorHandler);