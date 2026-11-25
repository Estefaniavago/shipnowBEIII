import { AppError } from './app.error.js';
import { ERROR_CODES } from './error.dictionary.js';

const MONGO_DUPLICATE_KEY = 11000;

// Convierte cualquier error (Mongo, body-parser, desconocido) en un AppError.
// Se detecta por nombre/código para no importar Mongoose fuera de la capa de datos.
export function normalizeError(err) {
  if (err instanceof AppError) return err;

  if (err?.type === 'entity.parse.failed') {
    return new AppError(ERROR_CODES.INVALID_JSON, { cause: err });
  }

  if (err?.type === 'entity.too.large') {
    return new AppError(ERROR_CODES.PAYLOAD_TOO_LARGE, { cause: err });
  }

  if (err?.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new AppError(ERROR_CODES.VALIDATION_ERROR, { details, cause: err });
  }

  if (err?.name === 'CastError') {
    return new AppError(ERROR_CODES.INVALID_ID, {
      details: [{ field: err.path, value: String(err.value) }],
      cause: err,
    });
  }

  if (err?.code === MONGO_DUPLICATE_KEY) {
    const details = Object.keys(err.keyValue ?? {}).map((field) => ({ field }));
    return new AppError(ERROR_CODES.DUPLICATE_KEY, { details, cause: err });
  }

  if (typeof err?.name === 'string' && /^(Mongo|Mongoose)/.test(err.name)) {
    return new AppError(ERROR_CODES.DATABASE_ERROR, { cause: err });
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, { cause: err });
}
