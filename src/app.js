import express from 'express';
import config from './config/index.js';
import logger from './config/logger.js';
import { buildRoutes } from './routes/index.js';
import { buildDocsRouter } from './docs/index.js';
import { DOCS_ROUTE, BODY_LIMIT } from './constants/index.js';
import { createRequestLogger } from './middlewares/request-logger.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createErrorHandler } from './middlewares/error.middleware.js';

const app = express();

app.disable('x-powered-by'); // no revela que es Express
app.use(createRequestLogger({ logger }));

// Swagger: se monta solo si ENABLE_DOCS es true (por defecto sí, también en producción).
if (config.features.docs) {
  app.use(
    DOCS_ROUTE,
    buildDocsRouter({
      port: config.port,
      publicUrl: config.publicUrl,
      maxFileSizeMb: config.upload.maxFileSizeMb,
      includeInternal: config.features.internalEndpoints,
    })
  );
}

app.use(express.json({ limit: BODY_LIMIT })); // evita payloads enormes
app.use('/api', buildRoutes({ internalEndpoints: config.features.internalEndpoints }));
app.use(notFoundHandler);
app.use(createErrorHandler({ isProduction: config.isProduction, logger }));

export default app;
