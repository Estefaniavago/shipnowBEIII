import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildOpenApiSpec } from './openapi/index.js';

// Router de documentación: toda la configuración de Swagger vive en src/docs,
// separada de las rutas de negocio. La spec refleja lo que la API tiene activo
// (por ejemplo, no documenta mocks ni logger test si están apagados).
export function buildDocsRouter(options) {
  const spec = buildOpenApiSpec(options);
  const router = Router();

  // La especificación en crudo (útil para importarla en Postman, por ejemplo).
  router.get('/openapi.json', (req, res) => res.json(spec));

  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: 'ShipNow API - Documentación',
      swaggerOptions: { docExpansion: 'list', displayRequestDuration: true },
    })
  );
  return router;
}
