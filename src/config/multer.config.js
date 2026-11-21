import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ALLOWED_UPLOAD_MIME_TYPES, UPLOAD } from '../constants/index.js';
import {
  FileSaveError,
  FileTooLargeError,
  FileTypeInvalidError,
  UploadFieldInvalidError,
} from '../errors/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Raíz de todo lo subido. Está en .gitignore: al repo solo entran los .gitkeep.
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

export const UPLOAD_CATEGORIES = Object.freeze({
  USER_DOCUMENTS: 'users/documents',
  USER_LICENSES: 'users/licenses',
  ORDER_RECEIPTS: 'orders/receipts',
  DELIVERY_RECEIPTS: 'deliveries/receipts',
});

const ALLOWED_MIME_TYPES = Object.values(ALLOWED_UPLOAD_MIME_TYPES);
const EXTENSION_BY_MIME = Object.freeze({
  [ALLOWED_UPLOAD_MIME_TYPES.PDF]: '.pdf',
  [ALLOWED_UPLOAD_MIME_TYPES.JPEG]: '.jpg',
  [ALLOWED_UPLOAD_MIME_TYPES.PNG]: '.png',
});

// Error interno de Multer (tipo o carpeta). El middleware lo traduce al diccionario.
export class RejectedUploadError extends Error {
  constructor(code, extras = {}) {
    super(code);
    this.name = 'RejectedUploadError';
    this.code = code;
    Object.assign(this, extras);
  }
}

const storage = multer.diskStorage({
  destination(req, _file, callback) {
    const category = req.uploadCategory;
    if (!Object.values(UPLOAD_CATEGORIES).includes(category)) {
      return callback(new RejectedUploadError('UPLOAD_CATEGORY_INVALID'));
    }
    const destination = path.join(UPLOAD_ROOT, category);
    try {
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    } catch (error) {
      callback(error);
    }
  },
  filename(_req, file, callback) {
    const extension = EXTENSION_BY_MIME[file.mimetype] ?? '';
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

function fileFilter(_req, file, callback) {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(new RejectedUploadError('UPLOAD_FILE_TYPE_INVALID', { mimeType: file.mimetype }));
  }
  callback(null, true);
}

export const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: UPLOAD.MAX_FILE_SIZE, files: 1 },
});

// Traduce los errores de Multer al diccionario de la API.
export function toUploadError(error, fieldName = UPLOAD.FIELD_NAME) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') return new FileTooLargeError(UPLOAD.MAX_FILE_SIZE);
    if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
      return new UploadFieldInvalidError(error.field ?? fieldName);
    }
    return new FileSaveError(error);
  }
  if (error?.code === 'UPLOAD_FILE_TYPE_INVALID') return new FileTypeInvalidError(error.mimeType);
  return new FileSaveError(error);
}
