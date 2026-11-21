import { buildInfo, buildServers, tags } from './info.js';
import { schemas } from './schemas.js';
import { parameters } from './parameters.js';
import { usersPaths } from './paths/users.paths.js';
import { productsPaths } from './paths/products.paths.js';
import { ordersPaths } from './paths/orders.paths.js';
import { deliveriesPaths } from './paths/deliveries.paths.js';
import { buildDocumentsPaths } from './paths/documents.paths.js';
import { mocksPaths } from './paths/mocks.paths.js';
import { loggerPaths } from './paths/logger.paths.js';

// Arma la especificación OpenAPI 3.0 completa (objeto JS plano, sin dependencias).
export function buildOpenApiSpec({ port = 3000, maxFileSizeMb = 5 } = {}) {
  return {
    openapi: '3.0.3',
    info: buildInfo(),
    servers: buildServers(port),
    tags,
    paths: {
      ...usersPaths,
      ...productsPaths,
      ...ordersPaths,
      ...deliveriesPaths,
      ...buildDocumentsPaths({ maxFileSizeMb }),
      ...mocksPaths,
      ...loggerPaths,
    },
    components: { schemas, parameters },
  };
}
