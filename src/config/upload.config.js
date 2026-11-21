import multer from 'multer';
import config from './index.js';
import { UPLOAD_FIELDS } from '../constants/index.js';
import { FileTypeInvalidError } from '../errors/index.js';
import { ALLOWED_MIME_TYPES, translateUploadError } from './upload.rules.js';

/**
 * Configuración centralizada de Multer (los routers solo importan los middlewares ya armados).
 *
 *  - Dónde se guarda : memoria durante la petición. El Service valida la entidad y el tipo de
 *                      documento ANTES de escribir en disco, y LocalFileStorage guarda en
 *                      uploads/<subcarpeta>/ (ver upload.rules.js y src/storage).
 *  - Cómo se nombra  : generateStoredName() en upload.rules.js (timestamp + UUID + extensión).
 *  - Tipos aceptados : PDF, JPG y PNG (ALLOWED_FILE_TYPES).
 *  - Tamaño máximo   : config.upload.maxFileSizeBytes (UPLOAD_MAX_FILE_SIZE_MB).
 *  - Errores         : translateUploadError() los convierte a errores del sistema centralizado.
 */
const { maxFileSizeBytes } = config.upload;

function fileFilter(req, file, callback) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return callback(null, true);
  return callback(new FileTypeInvalidError(file.mimetype, ALLOWED_MIME_TYPES));
}

function buildUploader(fieldName) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeBytes },
    fileFilter,
  }).single(fieldName);

  return function uploadMiddleware(req, res, next) {
    upload(req, res, (error) => {
      next(error ? translateUploadError(error, { expectedField: fieldName, maxBytes: maxFileSizeBytes }) : undefined);
    });
  };
}

export const uploadUserDocument = buildUploader(UPLOAD_FIELDS.USER_DOCUMENT);
export const uploadDeliveryReceipt = buildUploader(UPLOAD_FIELDS.DELIVERY_RECEIPT);
