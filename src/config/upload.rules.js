import crypto from 'node:crypto';
import path from 'node:path';
import { ALLOWED_FILE_TYPES, DOCUMENT_TYPES, UPLOAD_FOLDERS } from '../constants/index.js';
import {
  AppError,
  FileTooLargeError,
  UnexpectedFileFieldError,
  RequestValidationError,
} from '../errors/index.js';

// Reglas de carga de archivos: qué se acepta, cómo se nombra y en qué carpeta se guarda.
// Son funciones puras (no dependen de Multer ni del disco).

export const ALLOWED_MIME_TYPES = Object.freeze(Object.keys(ALLOWED_FILE_TYPES));

// Firmas ("magic numbers") de cada formato: se comprueba el CONTENIDO real del archivo,
// no solo el tipo que declara el cliente (que se puede falsificar).
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const SIGNATURES = [
  { mime: 'application/pdf', matches: (b) => b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-' },
  { mime: 'image/png', matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(PNG_SIGNATURE) },
  { mime: 'image/jpeg', matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
];

export function detectMimeType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  return SIGNATURES.find((signature) => signature.matches(buffer))?.mime ?? null;
}

// Nombre generado: nunca se usa el nombre original (evita colisiones y path traversal).
export function generateStoredName(mimeType) {
  const extension = ALLOWED_FILE_TYPES[mimeType]?.extension;
  if (!extension) throw new Error(`Tipo de archivo sin extensión definida: ${mimeType}`);
  return `${Date.now()}-${crypto.randomUUID()}${extension}`;
}

// Carpeta según el tipo de documento: las licencias van aparte del resto.
export function resolveFolder(documentType) {
  return documentType === DOCUMENT_TYPES.DRIVER_LICENSE
    ? UPLOAD_FOLDERS.LICENSES
    : UPLOAD_FOLDERS.USER_DOCUMENTS;
}

// El nombre original solo se guarda como metadato: se limpia de rutas y caracteres de control.
export function sanitizeOriginalName(name) {
  const base = path.posix.basename(String(name ?? '').replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 255);
  return clean || 'sin-nombre';
}

const MALFORMED_MULTIPART = /boundary|multipart|unexpected end of form|malformed part/i;

// Traduce los errores de Multer/busboy a errores del sistema centralizado.
export function translateUploadError(error, { expectedField, maxBytes }) {
  if (error instanceof AppError) return error;

  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') return new FileTooLargeError(maxBytes);
    if (error.code === 'LIMIT_UNEXPECTED_FILE') return new UnexpectedFileFieldError(expectedField, error.field);
    return new RequestValidationError([{ field: error.field ?? 'file', message: error.message }]);
  }
  if (MALFORMED_MULTIPART.test(error?.message ?? '')) {
    return new RequestValidationError([{ field: 'body', message: 'El cuerpo multipart/form-data es inválido' }]);
  }
  return error; // desconocido: lo resuelve el middleware global (500)
}
