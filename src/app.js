import express from 'express';
import config from './config/index.js';
import logger from './config/logger.js';
import routes from './routes/index.js';
import { docsRouter } from './docs/index.js';
import { DOCS_ROUTE } from './constants/index.js';
import { createRequestLogger } from './middlewares/request-logger.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createErrorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(createRequestLogger({ logger }));
app.use(DOCS_ROUTE, docsRouter);
app.use(express.json());
app.use('/api', routes);
app.use(notFoundHandler);
app.use(createErrorHandler({ isProduction: config.isProduction, logger }));

export default app;
