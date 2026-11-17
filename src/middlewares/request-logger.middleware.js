import { noopLogger } from '../utils/noop.logger.js';

// Registra cada petición HTTP al terminar (nivel http): método, url, status y duración.
export function createRequestLogger({ logger = noopLogger } = {}) {
  return function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms`);
    });
    next();
  };
}
