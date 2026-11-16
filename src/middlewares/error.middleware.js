import config from '../config/index.js';
import { RESPONSE_STATUS } from '../constants/index.js';

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode ?? (err.name === 'ValidationError' ? 400 : 500);
  if (statusCode === 500) console.error(err);
  res.status(statusCode).json({
    status: RESPONSE_STATUS.ERROR,
    message: statusCode === 500 && config.isProduction ? 'Error interno del servidor' : err.message,
  });
}
