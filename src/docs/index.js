import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import config from '../config/index.js';
import { buildOpenApiSpec } from './openapi/index.js';

// Router de documentación: toda la configuración de Swagger vive en src/docs,
// separada de las rutas de negocio.
const spec = buildOpenApiSpec({ port: config.port });

export const docsRouter = Router();

// La especificación en crudo (útil para importarla en Postman, por ejemplo).
docsRouter.get('/openapi.json', (req, res) => res.json(spec));

docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(spec, {
    customSiteTitle: 'ShipNow API - Documentación',
    swaggerOptions: { docExpansion: 'list', displayRequestDuration: true },
  })
);
