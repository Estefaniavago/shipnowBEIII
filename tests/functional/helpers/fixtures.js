import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../../../src/config/index.js';

// Archivos de prueba chicos y controlados, generados en memoria (no hay archivos reales en el repo).
export const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n');
export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('contenido-png-de-prueba'),
]);
export const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from('contenido-jpeg-de-prueba')]);
export const TEXT = Buffer.from('esto es un texto plano, no un documento');

export const MAX_FILE_SIZE_BYTES = config.upload.maxFileSizeBytes;
export const UPLOADS_DIR = config.upload.dir;

// PDF válido que supera el tamaño máximo en exactamente 1 byte.
export const oversizedPdf = () =>
  Buffer.concat([PDF, Buffer.alloc(MAX_FILE_SIZE_BYTES + 1 - PDF.length, 'a')]);

// Lista (rutas relativas, con "/") todos los archivos que hay en la carpeta de uploads de testing.
export async function listUploadedFiles() {
  try {
    const entries = await readdir(UPLOADS_DIR, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(UPLOADS_DIR, path.join(entry.parentPath ?? entry.path, entry.name)).split(path.sep).join('/'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export const readUploadedFile = (relativePath) => readFile(path.join(UPLOADS_DIR, relativePath));

// Sabotaje controlado: deja un ARCHIVO donde debería haber una carpeta, para que guardar falle.
export async function blockUploadFolder(folder) {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, folder), 'bloqueado');
}
