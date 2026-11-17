import { HTTP_STATUS, RESPONSE_STATUS } from '../constants/index.js';
import { normalizeError } from '../errors/index.js';

// Único lugar de la app que escribe respuestas de error.
export function createErrorHandler({ isProduction = false, logger = console } = {}) {
  // eslint-disable-next-line no-unused-vars
  return function errorHandler(err, req, res, next) {
    const error = normalizeError(err);
    const isServerError = error.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR;

    if (isServerError) logger.error(`[Error ${error.code}]`, error.cause ?? error);

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
