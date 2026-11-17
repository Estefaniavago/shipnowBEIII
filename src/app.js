import express from 'express';
import config from './config/index.js';
import routes from './routes/index.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createErrorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.json());
app.use('/api', routes);
app.use(notFoundHandler);
app.use(createErrorHandler({ isProduction: config.isProduction }));

export default app;
