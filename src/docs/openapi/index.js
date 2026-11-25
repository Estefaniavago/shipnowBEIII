import { buildInfo, buildServers, tags, TAGS } from './info.js';
import { schemas } from './schemas.js';
import { parameters } from './parameters.js';
import { usersPaths } from './paths/users.paths.js';
import { productsPaths } from './paths/products.paths.js';
import { ordersPaths } from './paths/orders.paths.js';
import { deliveriesPaths } from './paths/deliveries.paths.js';
import { healthPaths } from './paths/health.paths.js';
import { buildDocumentsPaths } from './paths/documents.paths.js';
import { mocksPaths } from './paths/mocks.paths.js';
import { loggerPaths } from './paths/logger.paths.js';

const INTERNAL_PATH_PREFIXES = ['/api/mocks', '/api/logger'];
const INTERNAL_TAGS = [TAGS.MOCKS, TAGS.LOGGER];

// Arma la especificación OpenAPI 3.0 completa (objeto JS plano, sin dependencias).
// includeInternal=false: no documenta mocks ni logger test (están apagados en producción por defecto).
export function buildOpenApiSpec({ port = 3000, publicUrl = null, maxFileSizeMb = 5, includeInternal = true } = {}) {
  const allPaths = {
    ...healthPaths,
    ...usersPaths,
    ...productsPaths,
    ...ordersPaths,
    ...deliveriesPaths,
    ...buildDocumentsPaths({ maxFileSizeMb }),
    ...mocksPaths,
    ...loggerPaths,
  };
  const paths = includeInternal
    ? allPaths
    : Object.fromEntries(
        Object.entries(allPaths).filter(([path]) => !INTERNAL_PATH_PREFIXES.some((prefix) => path.startsWith(prefix)))
      );

  return {
    openapi: '3.0.3',
    info: buildInfo(),
    servers: buildServers(port, publicUrl),
    tags: includeInternal ? tags : tags.filter((tag) => !INTERNAL_TAGS.includes(tag.name)),
    paths,
    components: { schemas, parameters },
  };
}
