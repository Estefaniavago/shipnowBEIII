import { RouteNotFoundError } from '../errors/index.js';

// Rutas que no existen: se derivan al mismo manejador global.
export function notFoundHandler(req, res, next) {
  next(new RouteNotFoundError(req.method, req.originalUrl));
}
