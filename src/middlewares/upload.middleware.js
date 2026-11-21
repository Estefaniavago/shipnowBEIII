import { HTTP_STATUS } from '../constants/index.js';
import logger from '../config/logger.js';
import { multerUpload, toUploadError } from '../config/multer.config.js';

export function setUploadCategory(category) {
  return (req, _res, next) => {
    req.uploadCategory = category;
    next();
  };
}

// Un solo archivo en el campo indicado. Los errores salen por el middleware central.
export function uploadSingle(fieldName = 'file') {
  const parser = multerUpload.single(fieldName);
  return (req, res, next) => {
    parser(req, res, (error) => {
      if (!error) return next();
      const appError = toUploadError(error, fieldName);
      if (appError.code === 'FILE_TYPE_INVALID') {
        logger.warning('Intento de carga con tipo no permitido', {
          mimeType: error.mimeType ?? null,
          field: fieldName,
          path: req.originalUrl,
        });
      } else if (appError.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
        logger.error('Error al subir archivo', { message: error.message, field: fieldName, path: req.originalUrl });
      } else {
        logger.warning('Error al subir archivo', { code: appError.code, field: fieldName, path: req.originalUrl });
      }
      next(appError);
    });
  };
}
