import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { normalizeError } from '../errors/index.js';
import { noopLogger } from '../utils/noop.logger.js';

// Único lugar de la app que escribe respuestas de error (y las registra en el log).
export function createErrorHandler({ isProduction = false, logger = noopLogger } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    const error = normalizeError(err);
    const isServerError = error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;

    const logMeta = { code: error.code, method: req.method, path: req.originalUrl };
    if (isServerError) {
      // Error inesperado o de infraestructura: nivel error, con stack de la causa real.
      logger.error(error.message, { ...logMeta, stack: (error.cause ?? error).stack });
    } else {
      // Error esperado / de negocio (el cliente se equivocó): nivel warning.
      logger.warning(error.message, {
        ...logMeta,
        ...(error.details.length > 0 ? { details: error.details } : {}),
      });
    }

    const details = [...error.details];
    // Fuera de producción, mostramos la causa técnica para facilitar el debug.
    if (isServerError && !isProduction && error.cause?.message) {
      details.push({ cause: error.cause.message });
    }

    res.status(error.statusCode).json({
      status: RESPONSE_STATUS.ERROR,
      code: error.code,
      message: error.message,
      details,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  };
}
