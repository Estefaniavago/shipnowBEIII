import assert from 'node:assert/strict';
import {
  ALLOWED_MIME_TYPES, detectMimeType, generateStoredName, resolveFolder, sanitizeOriginalName,
  translateUploadError,
} from '../../src/config/upload.rules.js';
import { ERROR_CODES, AppError } from '../../src/errors/index.js';
import { DOCUMENT_TYPES, UPLOAD_FOLDERS } from '../../src/constants/index.js';

const PDF = Buffer.from('%PDF-1.4\n%contenido');
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('datos')]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('upload.rules', () => {
  it('tipos aceptados: PDF, JPG y PNG', () => {
    assert.deepEqual([...ALLOWED_MIME_TYPES].sort(), ['application/pdf', 'image/jpeg', 'image/png']);
  });

  it('detectMimeType: reconoce el formato por el contenido', () => {
    assert.equal(detectMimeType(PDF), 'application/pdf');
    assert.equal(detectMimeType(PNG), 'image/png');
    assert.equal(detectMimeType(JPEG), 'image/jpeg');
  });

  it('detectMimeType: rechaza texto, ejecutables, vacío y valores que no son Buffer', () => {
    assert.equal(detectMimeType(Buffer.from('hola mundo')), null);
    assert.equal(detectMimeType(Buffer.from('MZ\x90\x00')), null);
    assert.equal(detectMimeType(Buffer.alloc(0)), null);
    assert.equal(detectMimeType('%PDF-'), null);
    assert.equal(detectMimeType(undefined), null);
  });

  it('generateStoredName: usa la extensión del tipo real y nunca se repite', () => {
    const a = generateStoredName('application/pdf');
    const b = generateStoredName('application/pdf');
    assert.match(a, /^\d+-[0-9a-f-]{36}\.pdf$/);
    assert.notEqual(a, b);
    assert.match(generateStoredName('image/png'), /\.png$/);
    assert.match(generateStoredName('image/jpeg'), /\.jpg$/);
    assert.throws(() => generateStoredName('text/plain'));
  });

  it('resolveFolder: las licencias van a su propia carpeta', () => {
    assert.equal(resolveFolder(DOCUMENT_TYPES.DRIVER_LICENSE), UPLOAD_FOLDERS.LICENSES);
    assert.equal(resolveFolder(DOCUMENT_TYPES.ID_CARD), UPLOAD_FOLDERS.USER_DOCUMENTS);
    assert.equal(resolveFolder(DOCUMENT_TYPES.OTHER), UPLOAD_FOLDERS.USER_DOCUMENTS);
  });

  it('sanitizeOriginalName: saca rutas y caracteres de control, y nunca devuelve vacío', () => {
    assert.equal(sanitizeOriginalName('dni.pdf'), 'dni.pdf');
    assert.equal(sanitizeOriginalName('../../etc/passwd'), 'passwd');
    assert.equal(sanitizeOriginalName('C:\\Users\\ana\\foto.png'), 'foto.png');
    assert.equal(sanitizeOriginalName('a\u0000b\u001f.pdf'), 'ab.pdf');
    assert.equal(sanitizeOriginalName(''), 'sin-nombre');
    assert.equal(sanitizeOriginalName(undefined), 'sin-nombre');
    assert.equal(sanitizeOriginalName('x'.repeat(400)).length, 255);
  });

  describe('translateUploadError', () => {
    const ctx = { expectedField: 'document', maxBytes: 1048576 };
    const multerError = (code, field) => Object.assign(new Error(code), { name: 'MulterError', code, field });

    it('LIMIT_FILE_SIZE => FILE_TOO_LARGE 413 con el máximo', () => {
      const error = translateUploadError(multerError('LIMIT_FILE_SIZE', 'document'), ctx);
      assert.equal(error.code, ERROR_CODES.FILE_TOO_LARGE);
      assert.equal(error.statusCode, 413);
      assert.deepEqual(error.details, [{ maxBytes: 1048576, maxMB: 1 }]);
    });

    it('LIMIT_UNEXPECTED_FILE => UNEXPECTED_FILE_FIELD 400 (campo equivocado o archivo repetido)', () => {
      const wrongField = translateUploadError(multerError('LIMIT_UNEXPECTED_FILE', 'file'), ctx);
      assert.equal(wrongField.code, ERROR_CODES.UNEXPECTED_FILE_FIELD);
      assert.equal(wrongField.statusCode, 400);
      assert.deepEqual(wrongField.details, [{ expected: 'document', received: 'file' }]);
      assert.match(wrongField.message, /campo "document".*"file"/);

      const repeated = translateUploadError(multerError('LIMIT_UNEXPECTED_FILE', 'document'), ctx);
      assert.match(repeated.message, /Solo se admite un archivo/);
    });

    it('otros errores de Multer => VALIDATION_ERROR', () => {
      assert.equal(translateUploadError(multerError('LIMIT_PART_COUNT', undefined), ctx).code, ERROR_CODES.VALIDATION_ERROR);
    });

    it('multipart mal formado => VALIDATION_ERROR', () => {
      const error = translateUploadError(new Error('Multipart: Boundary not found'), ctx);
      assert.equal(error.code, ERROR_CODES.VALIDATION_ERROR);
      assert.equal(error.statusCode, 400);
    });

    it('los AppError (por ejemplo FILE_TYPE_INVALID del fileFilter) pasan sin cambios', () => {
      const original = new AppError(ERROR_CODES.FILE_TYPE_INVALID);
      assert.equal(translateUploadError(original, ctx), original);
    });

    it('un error desconocido se devuelve tal cual (lo resuelve el middleware global como 500)', () => {
      const unknown = new Error('algo raro');
      assert.equal(translateUploadError(unknown, ctx), unknown);
    });
  });
});
