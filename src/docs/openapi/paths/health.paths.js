import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, operation, success } from '../helpers.js';

export const healthPaths = {
  '/api/health': {
    get: operation({
      tag: TAGS.HEALTH, id: 'healthCheck', summary: 'Health check',
      description: 'Devuelve el estado de la API: estado, entorno, uptime (segundos), timestamp y estado de la conexión a la base de datos. '
        + 'Es público y **no expone información sensible**. Si la base de datos no está conectada responde `503` '
        + '(la API no está lista para recibir tráfico), que es lo que usan Docker y los orquestadores para marcarla como no saludable.',
      responses: success(H.OK, 'La API está funcionando', ref('HealthCheck')),
      errors: [E.DATABASE_ERROR], examplePath: '/api/health',
    }),
  },
};
