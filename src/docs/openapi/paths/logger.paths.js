import { ERROR_CODES as E } from '../../../errors/index.js';
import { HTTP_STATUS as H, LOG_LEVELS } from '../../../constants/index.js';
import { TAGS } from '../info.js';
import { ref, operation, success } from '../helpers.js';

export const loggerPaths = {
  '/api/logger/test': {
    get: operation({
      tag: TAGS.LOGGER, id: 'testLogger', summary: 'Probar el logger',
      description: 'Herramienta interna de validación, **no es una funcionalidad de negocio**. '
        + `Emite un log por cada nivel (${Object.values(LOG_LEVELS).join(', ')}) para comprobar que aparecen en consola y en los archivos de \`logs/\`. `
        + 'Los niveles por debajo del nivel activo del entorno no se registran (por ejemplo, `debug` y `http` en producción).',
      responses: success(H.OK, 'Logs emitidos', ref('LoggerTestResult')),
      errors: [E.INTERNAL_ERROR], examplePath: '/api/logger/test',
    }),
  },
};
